import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next"
import localFont from 'next/font/local';

const onest = localFont({
  src: [
    {
      path: './fonts/Onest-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: './fonts/Onest-ExtraLight.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: './fonts/Onest-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/Onest-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Onest-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Onest-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/Onest-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/Onest-ExtraBold.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: './fonts/Onest-Black.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-onest',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Marius Manolachi | Human",
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
      <body className={`${onest.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Analytics/>
      </body>
    </html>
  );
}
