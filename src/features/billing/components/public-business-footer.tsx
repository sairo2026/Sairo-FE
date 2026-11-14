"use client";

import Link from "next/link";
import type { PublicCompanyInfoResponse } from "@/lib/api/contracts/public-site.schema";
import { CookieNotice } from "@/shared/legal/cookie-notice";
import { useCompanyInfo } from "../hooks/billing-queries";

const FALLBACK_LINKS = [
  { kind: "TERMS", title: "이용약관", url: "/legal/terms" },
  { kind: "PRIVACY", title: "개인정보처리방침", url: "/legal/privacy" },
  { kind: "REFUND", title: "환불정책", url: "/legal/refund-policy" },
];

function resolveHref(url: string, kind: string): string {
  if (url.startsWith("/legal/policies/")) {
    return FALLBACK_LINKS.find((item) => item.kind === kind)?.url ?? url;
  }
  return url;
}

function hasPublishedValue(data: PublicCompanyInfoResponse): boolean {
  return [
    data.businessName,
    data.representativeName,
    data.businessNumber,
    data.ecommerceNotice,
    data.address,
    data.contactPhone,
    data.supportEmail,
  ].some((value) => Boolean(value));
}

export function PublicBusinessFooter() {
  const query = useCompanyInfo();
  const data = query.data;
  const info = data && hasPublishedValue(data) ? data : undefined;
  const links = data?.links?.length
    ? data.links.map((item) => ({ ...item, url: resolveHref(item.url, item.kind) }))
    : FALLBACK_LINKS;

  return (
    <div className="mx-auto w-full max-w-4xl text-caption text-ink-2">
      {info ? (
        <dl
          aria-label="사업자 정보"
          className="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2"
          data-testid="business-info"
        >
          <Row label="상호" value={info.businessName} />
          <Row label="대표" value={info.representativeName} />
          <Row label="사업자등록번호" value={info.businessNumber} />
          <Row label="통신판매업 신고번호" value={info.ecommerceNotice} />
          <Row label="주소" value={info.address} />
          <Row label="전화" value={info.contactPhone} />
          <Row label="이메일" value={info.supportEmail} />
        </dl>
      ) : null}
      <nav aria-label="약관 및 고객문의" className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
        {links.map((item) => (
          <Link key={item.kind} href={item.url} className="hover:text-primary">
            {item.title}
          </Link>
        ))}
        <Link href="/support" className="hover:text-primary">
          고객문의
        </Link>
      </nav>
      {info ? (
        <p className="mt-4">
          사이로는 공인중개사무소 업무 운영 소프트웨어를 월 구독으로 제공합니다. 사이로는 부동산
          거래의 당사자나 중개인이 아니며 거래를 알선하지 않습니다.
        </p>
      ) : null}
      <CookieNotice className="mt-4" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
