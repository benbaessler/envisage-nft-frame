import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
