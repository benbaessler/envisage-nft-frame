import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
  validateActionSignature,
} from "frames.js/next/server";
import {
  bytesToHexString,
  getAddressForFid,
  getFrameMessageFromRequestBody,
} from "frames.js";
import Link from "next/link";
import { DEBUG_HUB_OPTIONS } from "./debug/constants";
import prisma from "./lib/prisma";
import {
  HOST,
  neynar,
  openai,
  alreadyClaimed,
  contract,
  contractAddress,
  supplyMinted,
} from "./utils";
import { isApiErrorResponse } from "@neynar/nodejs-sdk";

type State = {
  page: string;
};

const initialState = { page: "create" };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    page:
      state.page === "create" &&
      action.postBody?.untrustedData.buttonIndex === 1
        ? "minting"
        : "create",
  };
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const validMessage = await validateActionSignature(
    previousFrame.postBody,
    DEBUG_HUB_OPTIONS
  );

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  console.log(state);

  if (state.page === "minting") {
    try {
      const frameMessage = getFrameMessageFromRequestBody(
        previousFrame.postBody!
      );

      const fid = frameMessage.data?.fid!;

      const castHash = bytesToHexString(
        frameMessage.data?.frameActionBody?.castId?.hash!
      );
      const inputText = previousFrame.postBody?.untrustedData.inputText;

      if (!inputText) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/missing-prompt.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }

      // Checks if supply was minted
      if (await supplyMinted()) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/supply-minted.png`} />
            <FrameButton onClick={() => {}}>Sold out</FrameButton>
          </FrameContainer>
        );
      }

      const address = await getAddressForFid({ fid });

      // Checks if the user has a wallet connected
      if (!address) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/no-wallet.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }

      // Checks if the user has already claimed an NFT
      const claimed = await alreadyClaimed(address);
      if (claimed) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/already-claimed.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }

      // Checks if input was already used
      const promptUsed = await prisma.prompt.findUnique({
        where: { id: inputText.toLowerCase() },
      });

      if (promptUsed) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/taken.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }

      // Checks if the user tipped at least 999 $DEGEN in the replies
      const cast = await neynar.fetchAllCastsInThread(castHash, fid);
      console.log(fid);
      const hasTipped = cast.result.casts.some(
        (c) =>
          c.author.fid === fid &&
          /(?:[1-9]\d{2,}|\d{4,})\s\$degen/.test(c.text.toLowerCase())
      );

      if (!hasTipped) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/no-tip.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }

      // Stores input in database
      try {
        Promise.all([
          await prisma.prompt.create({
            data: {
              id: inputText.toLowerCase(),
            },
          }),
          await prisma.minting.create({
            data: {
              fid,
            },
          }),
        ]);
      } catch (error) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/please-wait.png`} />
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }

      // Generate AI art
      console.log("generating");
      const image = await openai.images.generate({
        model: "dall-e-3",
        prompt: `A modern art piece themed around the concept of '${inputText}'`,
      });

      // Mints the NFT via thirdweb
      const metadata = {
        name: `"${inputText.charAt(0).toUpperCase() + inputText.slice(1)}"`,
        description: `A unique, AI-generated artwork minted via a Farcaster Frame with $DEGEN tips.`,
        image: image.data[0]?.url,
      };

      console.log("minting");
      const nft = await contract.mintTo(address, metadata);

      await prisma.minting.delete({
        where: {
          fid,
        },
      });

      return (
        <FrameContainer
          postUrl="/frames"
          state={state}
          previousFrame={previousFrame}
        >
          <FrameImage src={`${HOST}/success.png`} />
          <FrameButton
            href={`https://opensea.io/assets/base/${contractAddress}/${nft.id}`}
          >
            View
          </FrameButton>
        </FrameContainer>
      );
    } catch (error) {
      // isApiErrorResponse can be used to check for Neynar API errors
      if (isApiErrorResponse(error)) {
        console.log("API Error", error.response.data);
      } else {
        console.log("Generic Error", error);
      }
      return (
        <FrameContainer
          postUrl="/frames"
          state={state}
          previousFrame={previousFrame}
        >
          <FrameImage src={`${HOST}/error.png`} />
          <FrameInput text="A word or phrase to envisage" />
          <FrameButton onClick={dispatch}>Try again</FrameButton>
        </FrameContainer>
      );
    }
  }

  // then, when done, return next frame
  return (
    <div>
      Starter kit. <Link href="/debug">Debug</Link>
      <FrameContainer
        postUrl="/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={`${HOST}/cover.png`} />
        <FrameInput text="A word or phrase to envisage" />
        <FrameButton onClick={dispatch}>Create ✨</FrameButton>
      </FrameContainer>
    </div>
  );
}
