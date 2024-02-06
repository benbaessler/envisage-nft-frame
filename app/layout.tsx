import type { Metadata } from "next";

export const metadata: Metadata = {
  // without a title, warpcast won't validate your frame
  title: "Envisage NFT Generator",
  description:
    "Generate your own unique, generative AI art piece in a Farcaster Frame for $DEGEN.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
