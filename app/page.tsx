import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  getPreviousFrame,
  useFramesReducer,
  validateActionSignature,
} from "frames.js/next/server";
import { bytesToHexString } from "frames.js";
import Link from "next/link";
import {
  HOST,
  neynar,
  openai,
  alreadyClaimed,
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
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const validMessage = await validateActionSignature(previousFrame.postBody);

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  if (state.page === "minting") {
    try {
      const fid = validMessage?.data?.frameActionBody?.castId?.fid;
      const castHash = bytesToHexString(
        validMessage?.data?.frameActionBody?.castId?.hash!
      );
      const inputText = validMessage?.data?.frameActionBody?.inputText;

      if (!inputText) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/missing-prompt.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again ✨</FrameButton>
          </FrameContainer>
        );
      }

      const response = await neynar.lookupUserByFid(fid!);
      const user = response.result.user;

      if (!user?.custodyAddress) {
        return (
          <FrameContainer
            postUrl="/frames"
            state={state}
            previousFrame={previousFrame}
          >
            <FrameImage src={`${HOST}/no-wallet.png`} />
            <FrameInput text="A word or phrase to envisage" />
            <FrameButton onClick={dispatch}>Try again ✨</FrameButton>
          </FrameContainer>
        );
      }

      const address = user.custodyAddress;
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
            <FrameButton onClick={dispatch}>Try again ✨</FrameButton>
          </FrameContainer>
        );
      }

      // Checks if the user tipped at least 999 $DEGEN in the replies
      const cast = await neynar.fetchAllCastsInThread(castHash, fid);
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
            <FrameButton onClick={dispatch}>Try again ✨</FrameButton>
          </FrameContainer>
        );
      }

      // Generate AI art
      // const image = await openai.images.generate({
      //   model: "dall-e-3",
      //   prompt: `A modern art piece themed around '${inputText}'`,
      // });

      // const imageUrl = image.data[0]?.url;

      // Mints the NFT via thirdweb
      const metadata = {
        name: `"${inputText}"`,
        description: `A modern art piece themed around the concept of '${inputText}'`,
        // image: imageUrl,
        image: "https://i.imgur.com/3g6Z3ZG.png",
      };

      // const nft = await contract.mintTo(address, metadata);

      return (
        <FrameContainer
          postUrl="/frames"
          state={state}
          previousFrame={previousFrame}
        >
          <FrameImage src={`${HOST}/success.png`} />
          <FrameButton
            // href={`https://opensea.io/assets/base/${contractAddress}/${nft.id}`}
            href="https://opensea.io"
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
          <FrameButton onClick={dispatch}>Try again ✨</FrameButton>
        </FrameContainer>
      );
    }
  }

  console.log(state);

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
