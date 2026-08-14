import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "nova-voice-demo.jwlachman.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "V1 Voice Demo Test",
    description: "Speak, type, and attach images in a dark multimodal voice assistant demo.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "V1 Voice Demo Test",
      description: "Speak. Type. Attach.",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024, alt: "V1 Voice Demo Test" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "V1 Voice Demo Test",
      description: "Speak. Type. Attach.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
