import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#f7f6f3",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nessachat.com"),
  title: "NessaChat — Discover places and talk live with the people there",
  description:
    "Find places travellers recommend, read their stories and join each place’s live chat — translated into your language.",
  applicationName: "NessaChat",
  openGraph: {
    siteName: "NessaChat",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "NessaChat" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-n-canvas text-n-ink" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
