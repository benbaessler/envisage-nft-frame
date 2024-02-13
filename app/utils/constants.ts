import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import OpenAI from "openai";

export const HOST = process.env.NEXT_PUBLIC_HOST;

export const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY ?? "");
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// Testnet contract
export const contractAddress = process.env.CONTRACT_ADDRESS!;