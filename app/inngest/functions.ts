import { inngest } from "./client";
import { openai, mintWithPaymaster, contract } from "../utils";
import * as Sentry from "@sentry/node";
import prisma from "../lib/prisma";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

export const handleFailed = inngest.createFunction(
  {
    name: "Send failures to Sentry",
    id: "send-failed-function-errors-to-sentry",
  },
  { event: "inngest/function.failed" },
  async ({ event, step }) => {
    // The error is serialized as JSON, so we must re-construct it for Sentry's error handling:
    const error = event.data.error;
    const reconstructedEvent = new Error(error.message);
    // Set the name in the newly created event:
    // You can even customize the name here if you'd like,
    // e.g. `Function Failure: ${event.} - ${error.name}`
    reconstructedEvent.name = error.name;

    // Add the stack trace to the error:
    reconstructedEvent.stack = error.stack;

    // Capture the error with Sentry and append any additional tags or metadata:
    Sentry.captureException(reconstructedEvent, {
      extra: {
        run_id: event.data.run_id,
      },
    });

    // Flush the Sentry queue to ensure the error is sent:
    return await Sentry.flush();
  }
);

export const mintNft = inngest.createFunction(
  { id: "mint-nft" },
  { event: "mint-nft" },
  async ({ event, step }) => {
    const { address, prompt } = event.data;

    const promptStore = await prisma.prompt.findUnique({
      where: { id: prompt.toLowerCase() },
    });
    if (promptStore?.minted) return;

    await prisma.prompt.update({
      where: { id: prompt.toLowerCase() },
      data: { minted: true },
    });

    // Generates the image
    const image = await step.run(
      "Generate image",
      async () =>
        await openai.images.generate({
          model: "dall-e-2",
          prompt: `Craft a modern art piece that embodies the essence of '${prompt}' using a fusion of abstract shapes and a vivid color scheme to evoke deep emotions and provoke thought.`,
        })
    );

    const txHash = await step.run(
      "Mint NFT",
      async () =>
        await contract.mintTo(address, {
          name: `"${prompt}"`,
          description: `A unique, AI-generated, "${prompt}"-themed artwork minted via a Farcaster Frame with $DEGEN tips.`,
          image: image.data[0]?.url,
        })
    );

    return txHash;
  }
);
