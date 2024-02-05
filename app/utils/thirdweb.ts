import { BaseSepoliaTestnet } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

export const thirdweb = ThirdwebSDK.fromPrivateKey(
  process.env.PRIVATE_KEY!,
  BaseSepoliaTestnet,
  {
    secretKey: process.env.THIRD_WEB_SECRET_KEY,
  }
);

export const contract = await thirdweb.getContract(
  // testnet contract
  "0xA188155E15490f293eD800Bc3b3d3394E80E535D"
);

export const alreadyClaimed = async (address: string) => {
  const balance = await contract.erc721.balanceOf(address);
  return balance.toNumber() > 0;
};
