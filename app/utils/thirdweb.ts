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

export const contract = await thirdweb.getContract(contractAddress);

export const alreadyClaimed = async (address: string) => {
  const balance = await contract.erc721.balanceOf(address);
  return balance.toNumber() > 0;
};
