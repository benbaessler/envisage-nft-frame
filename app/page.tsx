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
  pinata,
} from "./utils";

type State = {
  active: string;
  total_button_presses: number;
};

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
  const castHash = bytesToHexString(
    validMessage?.data?.frameActionBody?.castId?.hash!
  );
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

  // Checks if the user tipped at least 999 $DEGEN in the replies
  const cast = await neynar.fetchAllCastsInThread(castHash, fid);
  const hasTipped = cast.result.casts.some(
    (c) =>
      c.author.fid === fid &&
      /(?:[1-9]\d{2,}|\d{4,})\s\$degen/.test(c.text.toLowerCase())
  );

  if (!hasTipped) {
    // TODO: Return an error frame
  }

  // TODO: Generate AI art
  const image = await openai.images.generate({
    model: "dall-e-3",
    prompt: `A modern art piece themed around '${inputText}'`,
  });

  const imageUrl = image.data[0]?.url;

  // TODO: Upload metadata to IPFS
  const tokenUri = await pinata.pinJSONToIPFS({
    name: `"${inputText}"`,
    description: `A modern art piece themed around the concept of '${inputText}'`,
    image: imageUrl,
  });

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
