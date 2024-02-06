import { BaseSepoliaTestnet } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { contractAddress } from "./constants";

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
