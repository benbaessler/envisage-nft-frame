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
import { getAddressForFid } from "frames.js";
import { HOST, alreadyClaimed, openai, neynar, supplyMinted } from "./utils";
import prisma from "./lib/prisma";
import { isApiErrorResponse } from "@neynar/nodejs-sdk";
import { inngest } from "./inngest/client";
import { DEBUG_HUB_OPTIONS } from "./debug/constants";

type State = {
  page: string;
};

const initialState = { page: "create" };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    page:
      state.page === "create" &&
      action.postBody?.untrustedData.buttonIndex === 1
        ? "closed"
        : "create",
  };
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const ErrorPage = ({ image }: { image: string }) => (
    <FrameContainer
      postUrl="/frames"
      state={state}
      previousFrame={previousFrame}
    >
      <FrameImage src={`${HOST}/${image}.png`} />
      <FrameButton>Try again</FrameButton>
    </FrameContainer>
  );

  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    ...DEBUG_HUB_OPTIONS,
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

  if (frameMessage) {
    const { inputText, castId, requesterFid } = frameMessage;

    if (state.page === "closed") return ErrorPage({ image: "mint-closed" });

    if (state.page === "minting") {
      try {
        const castHash = castId?.hash!;

        if (!inputText) return ErrorPage({ image: "missing-prompt" });

        const formattedInput =
          inputText.charAt(0).toUpperCase() + inputText.slice(1);

        const [validInputRes, isSupplyMinted, address, promptUsed, hasTipped] =
          await Promise.all([
            openai.moderations.create({ input: inputText }),
            supplyMinted(),
            getAddressForFid({ fid: requesterFid }),
            prisma.prompt.findUnique({
              where: { id: inputText.toLowerCase() },
            }),
            neynar
              .fetchAllCastsInThread(castHash, requesterFid)
              .then((cast) =>
                cast.result.casts.some(
                  (c) =>
                    c.author.fid === requesterFid &&
                    /(?:[1-9]\d{2,}|\d{4,})\s\$degen/.test(c.text.toLowerCase())
                )
              ),
          ]);

        // Checks if supply was minted
        if (isSupplyMinted) return ErrorPage({ image: "supply-minted" });

        // Checks if the user has a wallet connected
        if (!address) return ErrorPage({ image: "no-wallet" });

        // Checks if the user has already claimed an NFT
        const claimed = await alreadyClaimed(address);
        if (process.env.USE_MAINNET === "true" && claimed)
          return ErrorPage({ image: "already-claimed" });

        if (
          validInputRes.results[0]?.flagged ||
          inputText.length > 50 ||
          /\p{Extended_Pictographic}/u.test(inputText)
        )
          return ErrorPage({ image: "invalid-input" });

        if (promptUsed) return ErrorPage({ image: "taken" });

        // Checks if the user tipped at least 999 $DEGEN in the replies
        if (!hasTipped) return ErrorPage({ image: "no-tip" });

        // Stores input in database
        try {
          await prisma.prompt.create({
            data: {
              id: inputText.toLowerCase(),
              minted: false,
            },
          });
        } catch (error) {
          return ErrorPage({ image: "taken" });
        }

        await inngest.send({
          name: "mint-nft",
          data: {
            address,
            prompt: formattedInput,
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
              action="link"
              target={`https://opensea.io/${address}?search[collections][0]=envisage`}
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
        return ErrorPage({ image: "error" });
      }
    }
  }

  // then, when done, return next frame
  return (
    <div className="p-4">
      Envisage NFT Frame
      {/* <Link href={`/debug?url=${HOST}`} className="underline">
        Debug
      </Link> */}
      <FrameContainer
        postUrl="/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src={`${HOST}/cover.png`} />
        <FrameInput text="A word or phrase to envisage" />
        <FrameButton>Create ✨</FrameButton>
      </FrameContainer>
    </div>
  );
}
