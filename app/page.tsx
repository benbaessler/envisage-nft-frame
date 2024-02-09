import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
  getFrameMessage,
} from "frames.js/next/server";
import Link from "next/link";
import { DEBUG_HUB_OPTIONS } from "./debug/constants";
import { getAddressForFid, getTokenUrl } from "frames.js";
import { request } from "http";
import {
  alreadyClaimed,
  contract,
  contractAddress,
  generateAndSetImage,
  neynar,
  supplyMinted,
} from "./utils";
import prisma from "./lib/prisma";
import { isApiErrorResponse } from "@neynar/nodejs-sdk";
import { generateQueue } from "./api/queues/generate";

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

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    hubHttpUrl: "https://nemes.farcaster.xyz:2281",
    fetchHubContext: true,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  console.log("info: state is:", state);

  const HOST = process.env.NEXT_PUBLIC_baseUrl || "http://localhost:3000";

  if (frameMessage) {
    const { inputText, castId, requesterFid } = frameMessage;

    if (state.page === "minting") {
      try {
        const castHash = "0xb81fe6fa2541efd2c9be281538c63cbae5c13987";
        // const cashHash = castId?.hash!;

        if (!inputText) {
          return (
            <FrameContainer
              postUrl="/frames"
              state={state}
              previousFrame={previousFrame}
            >
              <FrameImage src={`${HOST}/missing-prompt.png`} />
              <FrameButton onClick={dispatch}>Try again</FrameButton>
            </FrameContainer>
          );
        }

        const formattedInput =
          inputText.charAt(0).toUpperCase() + inputText.slice(1);

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

        // Checks if the user has a wallet connected
        const address = await getAddressForFid({ fid: requesterFid });
        if (!address) {
          return (
            <FrameContainer
              postUrl="/frames"
              state={state}
              previousFrame={previousFrame}
            >
              <FrameImage src={`${HOST}/no-wallet.png`} />
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
              <FrameButton onClick={dispatch}>Try again</FrameButton>
            </FrameContainer>
          );
        }

        // Checks if the user tipped at least 999 $DEGEN in the replies
        const cast = await neynar.fetchAllCastsInThread(
          castHash,
          requesterFid
        );
        const hasTipped = cast.result.casts.some(
          (c) =>
            c.author.fid === requesterFid &&
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
              <FrameButton onClick={dispatch}>Try again</FrameButton>
            </FrameContainer>
          );
        }

        // Stores input in database
        try {
          await prisma.prompt.create({
            data: {
              id: inputText.toLowerCase(),
            },
          });
        } catch (error) {
          return (
            <FrameContainer
              postUrl="/frames"
              state={state}
              previousFrame={previousFrame}
            >
              <FrameImage src={`${HOST}/taken.png`} />
              <FrameButton onClick={dispatch}>Try again</FrameButton>
            </FrameContainer>
          );
        }

        // Mints the NFT via thirdweb
        const metadata = {
          name: `"${formattedInput}"`,
          description: `A unique, AI-generated artwork minted via a Farcaster Frame with $DEGEN tips.`,
          image: "ipfs://QmPF9sDizL5AHCaw1PsZhrua4a1r6AZNxkkFNv8Qz1zi7y",
        };

        console.log("minting NFT");
        const nft = await contract.mintTo(address, metadata);

        // Generate AI art
        // TODO: convert into slow request with vercel
        generateAndSetImage(nft.id, formattedInput);

        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/success.png`} />
            <FrameButton
              href={`https://testnets.opensea.io/assets/base-sepolia/${contractAddress}/${nft.id}`}
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
            <FrameButton onClick={dispatch}>Try again</FrameButton>
          </FrameContainer>
        );
      }
    }
  }

  // then, when done, return next frame
  return (
    <div className="p-4">
      frames.js starter kit.{" "}
      <Link href={`/debug?url=${HOST}`} className="underline">
        Debug
      </Link>
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
