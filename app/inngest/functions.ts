import { inngest } from "./client";
import { openai, contract } from "../utils";

export const generateMetadata = inngest.createFunction(
  { id: "generate-metadata" },
  { event: "generate-metadata" },
  async ({ event }) => {
    const { tokenId, prompt } = event.data;

    // Generate AI art
    console.log("generating");
    const image = await openai.images.generate({
      model: "dall-e-2",
      prompt: `A modern art piece themed around the concept of '${prompt}'`,
    });

    // Mints the NFT via thirdweb
    const metadata = {
      name: `"${prompt}"`,
      description: `A unique, AI-generated, "${prompt}"-themed artwork minted via a Farcaster Frame with $DEGEN tips.`,
      image: image.data[0]?.url,
    };

    // Update metadata
    await contract.erc721.update(tokenId, metadata);

    return metadata;
  }
);
