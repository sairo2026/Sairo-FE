"use client";

import { useLegalCompanyInfo } from "@/shared/legal/use-legal-values";
import { COMMERCE_NOTICE_COPY } from "../model/legal-copy";

export function CommerceNotice() {
  const company = useLegalCompanyInfo();
  return (
    <section
      aria-label="청약철회, 환불, 전자상거래 표시 안내"
      className="flex flex-col gap-4 rounded-card-flat border border-line bg-surface px-6 py-5"
    >
      <dl className="flex flex-col gap-3">
        {COMMERCE_NOTICE_COPY.items.map((item) => (
          <div key={item.title}>
            <dt className="text-caption font-semibold text-ink">{item.title}</dt>
            <dd className="text-caption text-ink-2">{item.body}</dd>
          </div>
        ))}
        <div>
          <dt className="text-caption font-semibold text-ink">
            {COMMERCE_NOTICE_COPY.complaintTitle}
          </dt>
          <dd className="text-caption text-ink-2">
            {COMMERCE_NOTICE_COPY.complaint(company.data?.supportEmail ?? null)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function SellerNotice() {
  const company = useLegalCompanyInfo();
  const info = company.data;
  if (!info) return null;
  const parts = [
    `판매자 ${info.businessName}`,
    `대표 ${info.representativeName}`,
    `사업자등록번호 ${info.businessNumber}`,
    ...(info.ecommerceNotice ? [`통신판매업 신고번호 ${info.ecommerceNotice}`] : []),
    ...(info.supportEmail ? [`고객지원 ${info.supportEmail}`] : []),
  ];
  return <p className="text-caption text-ink-2">{parts.join(" | ")}</p>;
}
