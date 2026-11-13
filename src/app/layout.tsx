import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sairo.agency";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "사이로",
  description: "사이로는 공인중개사무소 업무 운영 소프트웨어입니다.",
  applicationName: "사이로",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
