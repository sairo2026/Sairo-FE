import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sairo.agency";

export const SITE_TITLE = "사이로 | 공인중개사 방문 조율·업무 관리";

export const SITE_DESCRIPTION =
  "매물·고객·방문 조율·계약·월말결산을 한 곳에서. 방문 일정은 승인자가 비교해 고르고, 시스템이 겹침을 다시 확인해 확정합니다.";

export const SITE_OG_IMAGE = {
  url: "/brand/sairo-og.png",
  width: 1200,
  height: 630,
  alt: "사이로",
} as const;

export const INDEXABLE_ROBOTS: NonNullable<Metadata["robots"]> = { index: true, follow: true };

export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: false };
