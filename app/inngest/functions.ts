import { inngest } from "./client";
import { openai, contract } from "../utils";

export const mintNft = inngest.createFunction(
  { id: "mint-nft" },
  { event: "mint-nft" },
  async ({ event, step }) => {
    const { address, prompt } = event.data;

    // Generates the image
    const image = await step.run(
      "Generate image",
      async () =>
        await openai.images.generate({
          model: "dall-e-2",
          prompt: `Craft a modern art piece that embodies the essence of '${prompt}' using a fusion of abstract shapes and a vivid color scheme to evoke deep emotions and provoke thought.`,
        })
    );

    await step.run("Mint NFT", async () => {
      await contract.mintTo(address, {
        name: `"${prompt}"`,
        description: `A unique, AI-generated, "${prompt}"-themed artwork minted via a Farcaster Frame with $DEGEN tips.`,
        image: image.data[0]?.url,
      });
    });

    return true;
  }
);
