import { encodeFunctionData } from "viem";
import pinataSDK from "@pinata/sdk";

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_API_SECRET,
});

export const uploadMetadata = async (metadata: any) => {
  const { IpfsHash } = await pinata.pinJSONToIPFS(metadata);
  return `ipfs://${IpfsHash}`;
};

export const generateCalldata = async (
  to: `0x${string}`,
  metadataUri: string
) =>
  encodeFunctionData({
    abi: [
      {
        inputs: [
          {
            internalType: "address",
            name: "_to",
            type: "address",
          },
          {
            internalType: "string",
            name: "_uri",
            type: "string",
          },
        ],
        name: "mintTo",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    args: [to, metadataUri],
  });
