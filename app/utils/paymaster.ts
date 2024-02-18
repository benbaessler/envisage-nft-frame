import { bundlerActions, createSmartAccountClient } from "permissionless";
import { privateKeyToSafeSmartAccount } from "permissionless/accounts";
import { pimlicoBundlerActions } from "permissionless/actions/pimlico";
import { createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { contractAddress, generateCalldata, uploadMetadata } from ".";

const privateKey = process.env.PRIVATE_KEY as `0x${string}`;

const chain = process.env.USE_MAINNET ? "base" : "base-sepolia";
const paymasterUrl = `https://api.pimlico.io/v2/${chain}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const bundlerUrl = `https://api.pimlico.io/v1/${chain}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

const publicClient = createPublicClient({
  transport: http(process.env.BASE_SEPOLIA_RPC_URL!),
});

export const paymasterClient = createPimlicoPaymasterClient({
  transport: http(paymasterUrl),
});

const account = await privateKeyToSafeSmartAccount(publicClient, {
  privateKey,
  safeVersion: "1.4.1", // simple version
  entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // global entrypoint
});

const smartAccountClient = createSmartAccountClient({
  account,
  chain: baseSepolia,
  transport: http(bundlerUrl),
  sponsorUserOperation: paymasterClient.sponsorUserOperation,
})
  .extend(bundlerActions)
  .extend(pimlicoBundlerActions);

export const mintWithPaymaster = async (to: `0x${string}`, metadata: any) => {
  const metadataUri = await uploadMetadata(metadata);
  const [calldata, gasPrices] = await Promise.all([
    generateCalldata(to, metadataUri),
    smartAccountClient.getUserOperationGasPrice(),
  ]);

  const txHash = await smartAccountClient.sendTransaction({
    to: contractAddress,
    value: 0n,
    data: calldata,
    maxFeePerGas: gasPrices.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas,
  });

  return txHash;
};
