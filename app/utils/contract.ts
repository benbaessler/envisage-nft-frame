import { BaseSepoliaTestnet, Base } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { contractAddress, openai } from ".";

export const thirdweb = ThirdwebSDK.fromPrivateKey(
  process.env.PRIVATE_KEY!,
  process.env.USE_MAINNET === "true" ? Base : BaseSepoliaTestnet,
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