import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import OpenAI from "openai";

export const HOST = process.env.NEXT_PUBLIC_HOST;

export const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY ?? "");
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export const contractAddress = "0xabEa3454f738c6742985aD759EA4c09D56fE4e9a"