import { QueryParameter, DuneClient } from "@cowprotocol/ts-dune-client";
import { NeynarAPIClient, isApiErrorResponse } from "@neynar/nodejs-sdk";
import pinataSDK from "@pinata/sdk";
import OpenAI from "openai";

export const HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

export const dune = new DuneClient(process.env.DUNE_API_KEY ?? "");
export const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY ?? "");
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });
export const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
);