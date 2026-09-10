"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createCoordination } from "../api/coordination.api";
import { useCoordinationProperty } from "../hooks/use-coordination-property";
import { dealTypeLabels, formatPhoneNumber } from "../model/coordination";
import type { CoordinationCreateResult } from "../schemas/coordination.schema";
import { CandidateTimePicker } from "./candidate-time-picker";
import { CoordinationLoadError } from "./coordination-load-error";
import { LinkCreatedDialog } from "./link-created-dialog";

type Step = "tenant-info" | "candidate-times" | "link-created";

export function CoordinationRequestFlow({ propertyId }: { propertyId: number }) {
  const router = useRouter();
  const { state, retry } = useCoordinationProperty(propertyId);
  const [step, setStep] = useState<Step>("tenant-info");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [candidateTimes, setCandidateTimes] = useState<Date[]>([]);
  const [linkResult, setLinkResult] = useState<CoordinationCreateResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (state.status === "loading") {
    return <p className="text-slate-500">매물 정보를 불러오는 중입니다.</p>;
  }
  if (state.status === "error") {
    return <CoordinationLoadError kind={state.kind} onRetry={retry} />;
  }
  const property = state.property;

  function handleTenantInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantName.trim() || !tenantPhone.trim()) {
      setError("세입자 이름과 연락처를 모두 입력해주세요.");
      return;
    }
    setError("");
    setStep("candidate-times");
  }

  async function handleCandidateTimesSubmit() {
    if (candidateTimes.length === 0) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createCoordination(propertyId, {
        tenantName: tenantName.trim(),
        tenantPhone: tenantPhone.trim(),
        candidateTimes,
      });
      setLinkResult(result);
      setStep("link-created");
    } catch {
      setError("임장 조율 링크를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "tenant-info") {
    return (
      <form onSubmit={handleTenantInfoSubmit} className="max-w-[820px]">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">임장 조율 생성</h1>
          <Link
            href="/properties"
            className="rounded-lg bg-[#f0f0ff] px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-[#e4e4fb]"
          >
            매물 다시 선택
          </Link>
        </div>
        <div className="mb-10 grid gap-8 rounded-2xl border border-[#dfe3ec] p-8 sm:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <ReadField label="매물 주소" value={property.address} />
            <ReadField label="매물 상세 주소" optional value={property.addressDetail ?? "-"} />
            <ReadField label="매물명" optional value={property.propertyName ?? "-"} />
          </div>
          <div>
            <p className="mb-5 text-lg font-bold">거래 유형</p>
            <span className="inline-block rounded-lg border border-[#3937b8] px-6 py-4 font-semibold text-[#3937b8]">
              {dealTypeLabels[property.dealType]}
            </span>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label className="mb-5 block text-lg font-bold" htmlFor="tenant-name">
              임장 희망 고객 이름
            </label>
            <input
              id="tenant-name"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              placeholder="임장을 희망하는 고객의 이름을 입력해 주세요."
              className="h-14 w-full rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5"
            />
          </div>
          <div>
            <label className="mb-5 block text-lg font-bold" htmlFor="tenant-phone">
              임장 희망 고객 연락처
            </label>
            <input
              id="tenant-phone"
              value={tenantPhone}
              onChange={(event) => setTenantPhone(formatPhoneNumber(event.target.value))}
              placeholder="임장을 희망하는 고객의 연락처를 입력해 주세요."
              className="h-14 w-full rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-5"
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div className="mt-16 flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-[#f0f0ff] px-10 py-4 font-semibold text-slate-600 transition-colors hover:bg-[#e4e4fb]"
          >
            생성 취소
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#3937b8] px-12 py-4 font-semibold text-white transition-opacity hover:opacity-90"
          >
            다음
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="max-w-[1010px]">
      <div aria-hidden={step === "link-created"} inert={step === "link-created"}>
        <CandidateTimePicker
          value={candidateTimes}
          onChange={setCandidateTimes}
          onBack={() => setStep("tenant-info")}
          onSubmit={() => void handleCandidateTimesSubmit()}
          isSubmitting={isSubmitting}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {step === "link-created" && linkResult ? (
        <LinkCreatedDialog
          customerLinkUrl={linkResult.customerLinkUrl}
          candidateTimes={candidateTimes}
          onBackToCandidateTimes={() => setStep("candidate-times")}
          onFinish={() => router.push(`/coordinations/${linkResult.coordinationId}`)}
        />
      ) : null}
    </div>
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
      <p className="mb-3 font-bold">
        {label} {optional ? <span className="font-medium text-slate-400">(선택)</span> : null}
      </p>
      <p className="flex min-h-12 items-center rounded-lg border border-[#dfe3ec] bg-[#f8f9fd] px-4 text-sm">
        {value}
      </p>
    </div>
  );
}
