import { inngest } from "./client";
import { openai, contract } from "../utils";

export const mintNft = inngest.createFunction(
  { id: "mint-nft" },
  { event: "mint-nft" },
  async ({ event }) => {
    const { address, prompt } = event.data;

    // Generates the image
    console.log("generating");
    const image = await openai.images.generate({
      model: "dall-e-2",
      prompt: `A modern art piece themed around the concept of '${prompt}'`,
    });

    await contract.mintTo(address, {
      name: `"${prompt}"`,
      description: `A unique, AI-generated, "${prompt}"-themed artwork minted via a Farcaster Frame with $DEGEN tips.`,
      image: image.data[0]?.url,
    });

    return true;
  }
);
