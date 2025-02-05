import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Marius Manolachi | Tech Founder & Engineer",
  description: "Building the future of technology and education. Engineering student turned founder, speaker, and tech influencer.",
  openGraph: {
    title: "Marius Manolachi | Tech Founder & Engineer",
    description: "Building the future of technology and education. Engineering student turned founder, speaker, and tech influencer.",
    url: "https://mariusmanolachi.com",
    siteName: "Marius Manolachi",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marius Manolachi | Tech Founder & Engineer",
    description: "Building the future of technology and education. Engineering student turned founder, speaker, and tech influencer.",
    creator: "@mariusmanolachi",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
