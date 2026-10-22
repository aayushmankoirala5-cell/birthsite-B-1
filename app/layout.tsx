import type { Metadata, Viewport } from "next";
import { assetPath } from "@/lib/asset-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "BirthSite — A little magic, just for you",
  description:
    "A birthday experience made of beautiful memories, heartfelt words, and a little magic. Your personal celebration awaits.",
  robots: { index: false, follow: false },
  icons: { icon: assetPath("/icon.svg") },
};
export const viewport: Viewport = { themeColor: "#fbf8f3" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href={assetPath("/fonts/cormorant-garamond.woff2")}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={assetPath("/fonts/dm-sans.woff2")}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
