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
          model: "dall-e-3",
          prompt: `an abstract modern art piece that embodies the essence of '${prompt}'`,
          style: "vivid"
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
