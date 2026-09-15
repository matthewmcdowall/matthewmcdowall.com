import type { Metadata } from "next";
import "./globals.css";
import { PROFILE_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // No title/description here on purpose: Next fills og:/twitter: from each
  // page's own title and description, so blog posts share as themselves.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [PROFILE_IMAGE],
  },
  twitter: {
    card: "summary",
    images: [PROFILE_IMAGE.url],
  },
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
