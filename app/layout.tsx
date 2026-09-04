import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matthew McDowall — AI & Data Science",
  description:
    "I build end-to-end AI systems that ship to production — not just demos. From RAG pipelines and LLM tooling to data infrastructure, I turn ideas into real products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
