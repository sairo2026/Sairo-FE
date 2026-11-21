import type { Metadata } from "next";
import { preload } from "react-dom";
import type { ReactNode } from "react";
// 글자 묶음별로 나뉜 서브셋이라 화면에 쓰인 글자의 묶음만 내려받는다. 글꼴 이름은 Pretendard Variable이다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Providers } from "./providers";
import {
  NOINDEX_ROBOTS,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from "@/shared/lib/site-metadata";

// 거의 모든 화면이 쓰는 글자 묶음은 첫 화면 전에 받아 두어 글꼴이 바뀔 때 화면이 흔들리지 않게 한다.
const CORE_FONT_SUBSETS = [
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.78.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.80.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.81.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.82.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.83.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.84.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.85.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.86.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.87.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.88.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.89.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.90.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.91.woff2",
    import.meta.url,
  ),
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | 사이로" },
  description: SITE_DESCRIPTION,
  applicationName: "사이로",
  robots: NOINDEX_ROBOTS,
  openGraph: {
    type: "website",
    siteName: "사이로(SAIRO)",
    locale: "ko_KR",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  for (const url of CORE_FONT_SUBSETS) {
    preload(url.pathname, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
