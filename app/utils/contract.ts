import { BaseSepoliaTestnet } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { contractAddress, openai } from ".";
import { BigNumberish } from "ethers";

export const thirdweb = ThirdwebSDK.fromPrivateKey(
  process.env.PRIVATE_KEY!,
  BaseSepoliaTestnet,
  {
    secretKey: process.env.THIRD_WEB_SECRET_KEY,
  }
);

export const contract = await thirdweb.getContract(
  contractAddress,
  "nft-collection"
);

export const alreadyClaimed = async (address: string): Promise<boolean> => {
  const balance = await contract.balanceOf(address);
  return balance.toNumber() > 0;
};

// check if tokenId is larger than 499
export const supplyMinted = async () => {
  const totalSupply = await contract.totalSupply();
  return totalSupply.toNumber() > 999;
};

export const generateAndSetImage = async (
  tokenId: BigNumberish,
  prompt: string
) => {
  // Generate AI art
  console.log("generating");
  const image = await openai.images.generate({
    model: "dall-e-3",
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
};
