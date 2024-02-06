import { QueryParameter, DuneClient } from "@cowprotocol/ts-dune-client";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import OpenAI from "openai";

export const HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

export const dune = new DuneClient(process.env.DUNE_API_KEY ?? "");
export const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY ?? "");
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export const contractAddress = "0xA188155E15490f293eD800Bc3b3d3394E80E535D"