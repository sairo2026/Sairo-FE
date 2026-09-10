"use client";

import Link from "next/link";
import { useProperty } from "../hooks/use-property";
import { dealTypeLabels } from "../model/property";
import { PropertyLoadError } from "./property-load-error";

export function PropertyDetail({ propertyId }: { propertyId: number }) {
  const { state, retry } = useProperty(propertyId);
  if (state.status === "loading") {
    return <p className="text-slate-500">매물 정보를 불러오는 중입니다.</p>;
  }
  if (state.status === "error") {
    return <PropertyLoadError kind={state.kind} onRetry={retry} />;
  }
  const property = state.property;
  return (
    <section className="max-w-[1010px]">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-3xl font-bold">매물 조회</h1>
        <Link
          href={`/coordinations/new?propertyId=${propertyId}`}
          className="rounded-lg border border-[#3937b8] px-5 py-3 font-semibold text-[#3937b8] transition-colors hover:bg-[#3937b8] hover:text-white"
        >
          임장 조율 생성
        </Link>
      </div>
      <div className="max-w-[596px] space-y-8">
        <ReadField label="매물 주소" value={property.address} />
        <ReadField label="매물 상세 주소" optional value={property.addressDetail ?? "-"} />
        <ReadField label="매물명" optional value={property.propertyName ?? "-"} />
        <div>
          <p className="mb-5 text-lg font-bold">거래 유형</p>
          <span className="inline-block rounded-lg border border-[#3937b8] px-6 py-4 font-semibold text-[#3937b8]">
            {dealTypeLabels[property.dealType]}
          </span>
        </div>
      </div>
      <div className="mt-28 flex gap-4">
        <Link
          href={`/properties/${propertyId}/edit`}
          className="rounded-lg bg-[#f0f0ff] px-10 py-4 font-semibold text-slate-600 transition-colors hover:bg-[#e4e4fb]"
        >
          수정
        </Link>
        <Link
          href="/properties"
          className="rounded-lg bg-[#3937b8] px-12 py-4 font-semibold text-white transition-opacity hover:opacity-90"
        >
          확인
        </Link>
      </div>
    </section>
  );
}

function ReadField({
  label,
  optional,
  value,
}: {
  label: string;
  optional?: boolean;
  value: string;
}) {
  return (
    <div>
      <p className="mb-5 text-lg font-bold">
        {label} {optional ? <span className="font-medium text-slate-400">(선택)</span> : null}
      </p>
      <p className="flex min-h-14 items-center rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5">
        {value}
      </p>
    </div>
  );
}
