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
import {
  HOST,
  alreadyClaimed,
  contract,
  contractAddress,
  neynar,
  supplyMinted,
} from "./utils";
import prisma from "./lib/prisma";
import { isApiErrorResponse } from "@neynar/nodejs-sdk";
import { Metadata } from "next";
import { inngest } from "./inngest/client";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Envisage NFT Generator",
    description:
      "Generate your own unique, generative AI art piece in a Farcaster Frame for $DEGEN.",
    openGraph: {
      title: "Envisage NFT Generator",
      description:
        "Generate your own unique, generative AI art piece in a Farcaster Frame for $DEGEN.",
      images: [`${HOST}/cover.png`],
    },
  };
}

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
  const ErrorPage = ({ image }: { image: string }) => (
    <FrameContainer
      postUrl="/frames"
      state={state}
      previousFrame={previousFrame}
    >
      <FrameImage src={`${HOST}/${image}.png`} />
      <FrameButton onClick={dispatch}>Try again</FrameButton>
    </FrameContainer>
  );

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

  if (frameMessage) {
    const { inputText, castId, requesterFid } = frameMessage;

    if (state.page === "minting") {
      try {
        const castHash = "0xb81fe6fa2541efd2c9be281538c63cbae5c13987";
        // const cashHash = castId?.hash!;

        if (!inputText) return ErrorPage({ image: "missing-prompt" });

        const formattedInput =
          inputText.charAt(0).toUpperCase() + inputText.slice(1);

        const [isSupplyMinted, address, promptUsed, hasTipped] =
          await Promise.all([
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
        if (claimed) return ErrorPage({ image: "already-claimed" });

        if (promptUsed) return ErrorPage({ image: "taken" });

        // Checks if the user tipped at least 999 $DEGEN in the replies
        if (!hasTipped) return ErrorPage({ image: "no-tip" });

        // Stores input in database
        try {
          await prisma.prompt.create({
            data: {
              id: inputText.toLowerCase(),
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
            <FrameButton href={`https://opensea.io/${address}`}>
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
