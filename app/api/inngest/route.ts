import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { mintNft, handleFailed } from "../../inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [mintNft, handleFailed]
});
