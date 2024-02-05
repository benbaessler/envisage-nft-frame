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
import Link from "next/link";
import { QueryParameter, DuneClient } from "@cowprotocol/ts-dune-client";
import { NeynarAPIClient, isApiErrorResponse } from "@neynar/nodejs-sdk";
import OpenAI from "openai";

type State = {
  active: string;
  total_button_presses: number;
};

const HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
const dune = new DuneClient(process.env.DUNE_API_KEY ?? "");
const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY ?? "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const initialState = { active: "1", total_button_presses: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    total_button_presses: state.total_button_presses + 1,
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
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
  const fid = validMessage?.data?.frameActionBody?.castId?.fid;
  const inputText = validMessage?.data?.frameActionBody?.inputText;

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  if (!inputText) {
    // TODO: Return an error frame
  }

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  // try {
  //   const user = await neynar.lookupUserByFid(fid!)
  // } catch (error) {
  //   // isApiErrorResponse can be used to check for Neynar API errors
  //   if (isApiErrorResponse(error)) {
  //     console.log("API Error", error.response.data);
  //   } else {
  //     console.log("Generic Error", error);
  //   }
  // }



  // TODO: check if the user has tipped 999 $DEGEN

  // TODO: Generate AI art
  const image = await openai.images.generate({
    model: "dall-e-3",
    prompt: `A modern art piece themed around '${inputText}'`,
  });

  const imageUrl = image.data[0]?.url;

  // TODO: Upload metadata to IPFS

  // TODO: Mint NFT

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
        {/* <FrameButton onClick={dispatch}>
          {state?.active === "2" ? "Active" : "Inactive"}
        </FrameButton> */}
        {/* <FrameButton href={HOST}>Page link</FrameButton>
        <FrameButton href={`https://www.google.com`}>External</FrameButton> */}
      </FrameContainer>
    </div>
  );
}
