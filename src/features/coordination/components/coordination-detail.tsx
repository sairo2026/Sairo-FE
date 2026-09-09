"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { EntityLoadError } from "@/shared/components/entity-load-error";
import { completeVisit, confirmCoordination } from "../api/coordination.api";
import {
  customerResponseResultLabels,
  dealTypeLabels,
  formatCandidateLabelFromIso,
  formatShortSchedule,
} from "../model/coordination";
import type {
  CoordinationCandidateTimeItem,
  CoordinationCustomerResponseItem,
  CoordinationDetailResult,
} from "../schemas/coordination.schema";
import { CoordinationStatusBadge } from "./coordination-status-badge";
import { CustomerLinkDialog } from "./customer-link-dialog";
import { useCoordinationDetail } from "../hooks/use-coordination-detail";

export function CoordinationDetail({ coordinationId }: { coordinationId: number }) {
  const { state, retry, refetch } = useCoordinationDetail(coordinationId);

  if (state.status === "loading") {
    return <p className="text-slate-500">임장 조율 정보를 불러오는 중입니다.</p>;
  }
  if (state.status === "error") {
    return (
      <EntityLoadError
        kind={state.kind}
        onRetry={retry}
        forbiddenMessage="이 임장 조율 건에 접근할 권한이 없습니다."
        notFoundMessage="임장 조율 건을 찾을 수 없습니다."
        backHref="/coordinations"
        backLabel="임장 조율 목록으로"
      />
    );
  }

  return <DetailBody coordinationId={coordinationId} detail={state.detail} onChanged={refetch} />;
}

function DetailBody({
  coordinationId,
  detail,
  onChanged,
}: {
  coordinationId: number;
  detail: CoordinationDetailResult;
  onChanged: () => void;
}) {
  const [openLinkDialog, setOpenLinkDialog] = useState<{
    title: string;
    url: string;
    expiresAt: string;
  } | null>(null);

  const candidateTimesById = new Map(
    detail.candidateTimes.map((candidate) => [candidate.candidateTimeId, candidate]),
  );

  const isFinalized = detail.status === "SCHEDULE_CONFIRMED" || detail.status === "VISIT_COMPLETED";
  const isTenantNoneAvailable = !isFinalized && detail.tenantResponse.result === "NONE_AVAILABLE";
  const canCreateBuyerLink =
    !isFinalized &&
    !isTenantNoneAvailable &&
    detail.status !== "TENANT_CHECKING" &&
    detail.buyerResponses.length === 0;

  return (
    <section className="max-w-[1010px]">
      <Link
        href="/coordinations"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#3937b8]"
      >
        ← 임장 조율 목록으로
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">임장 조율 상세</h1>
        <div className="flex flex-wrap gap-3">
          {!isFinalized &&
          detail.tenantResponse.customerLinkUrl &&
          detail.tenantResponse.linkExpiresAt ? (
            <button
              type="button"
              onClick={() =>
                setOpenLinkDialog({
                  title: "세입자와 임장 일정을 조율하는 링크입니다.",
                  url: detail.tenantResponse.customerLinkUrl ?? "",
                  expiresAt: detail.tenantResponse.linkExpiresAt ?? "",
                })
              }
              className="rounded-lg border border-[#3937b8] px-5 py-3 text-sm font-semibold text-[#3937b8]"
            >
              🔗 세입자용 링크
            </button>
          ) : null}
          {canCreateBuyerLink ? (
            <Link
              href={`/coordinations/${coordinationId}/buyer-link`}
              className="rounded-lg border border-[#3937b8] px-5 py-3 text-sm font-semibold text-[#3937b8]"
            >
              🔗 구매희망자용 링크
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mb-10 rounded-2xl border border-[#dfe3ec] p-6">
        <p className="mb-4 text-lg font-bold">기본 정보</p>
        <div className="grid gap-6 sm:grid-cols-[1.3fr_1.6fr_1fr_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">고객 / 연락처</p>
            <p className="font-bold">
              {detail.tenantResponse.name ?? "-"} / {detail.tenantResponse.phone ?? "-"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">주소</p>
            <p className="font-bold">
              {detail.property.address}
              {detail.property.addressDetail ? ` ${detail.property.addressDetail}` : ""}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">임장 일정</p>
            <p className="flex h-11 items-center rounded-lg border border-[#dfe3ec] px-4 font-semibold">
              {detail.scheduledAt ? formatShortSchedule(detail.scheduledAt) : "미정"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">조율 현황</p>
            <CoordinationStatusBadge status={detail.status} />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          거래 유형: {dealTypeLabels[detail.property.dealType]}
        </p>
      </div>

      <div className="mb-10">
        <p className="mb-5 text-lg font-bold">조율 진행 상황</p>

        <StepHeading step={1} label="공인중개사님의 선택" />
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {detail.candidateTimes.map((candidate) => (
            <span
              key={candidate.candidateTimeId}
              className="rounded-lg border border-[#dfe3ec] px-4 py-3 text-center text-sm font-semibold"
            >
              {formatCandidateLabelFromIso(candidate.startsAt)}
            </span>
          ))}
        </div>

        <StepHeading step={2} label="세입자님의 선택" />
        <ResponseBlock
          response={detail.tenantResponse}
          candidateTimesById={candidateTimesById}
          isFinalized={isFinalized}
          onOpenLink={(url, expiresAt) =>
            setOpenLinkDialog({
              title: "세입자와 임장 일정을 조율하는 링크입니다.",
              url,
              expiresAt,
            })
          }
        />

        {!isTenantNoneAvailable ? (
          <div className="mt-10">
            <StepHeading step={3} label="구매희망자님의 선택" />
            {detail.buyerResponses.length === 0 ? (
              <p className="mb-4 text-sm text-slate-500">
                상단에서 링크를 생성해 구매희망자에게 전달해 주십시오.
              </p>
            ) : (
              detail.buyerResponses.map((buyer) => (
                <div key={buyer.responseId} className="mb-8">
                  <ResponseBlock
                    response={buyer}
                    candidateTimesById={candidateTimesById}
                    isFinalized={isFinalized}
                    onOpenLink={(url, expiresAt) =>
                      setOpenLinkDialog({
                        title: "구매희망자와 임장 일정을 조율하는 링크입니다.",
                        url,
                        expiresAt,
                      })
                    }
                  />
                </div>
              ))
            )}
          </div>
        ) : null}

        {detail.status === "FINAL_CONFIRMATION_REQUIRED" ? (
          <FinalConfirmationPanel
            coordinationId={coordinationId}
            buyerResponses={detail.buyerResponses}
            candidateTimesById={candidateTimesById}
            onConfirmed={onChanged}
          />
        ) : null}
      </div>

      <BottomActions
        coordinationId={coordinationId}
        status={detail.status}
        hideCancel={isTenantNoneAvailable}
        onCompleted={onChanged}
      />

      {openLinkDialog ? (
        <CustomerLinkDialog
          title={openLinkDialog.title}
          customerLinkUrl={openLinkDialog.url}
          linkExpiresAt={openLinkDialog.expiresAt}
          onClose={() => setOpenLinkDialog(null)}
        />
      ) : null}
    </section>
  );
}

function StepHeading({ step, label }: { step: number; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3937b8] text-sm font-bold text-white">
        {step}
      </span>
      <p className="font-bold">{label}</p>
    </div>
  );
}

function ResponseBlock({
  response,
  candidateTimesById,
  isFinalized,
  onOpenLink,
}: {
  response: CoordinationCustomerResponseItem;
  candidateTimesById: Map<number, CoordinationCandidateTimeItem>;
  isFinalized: boolean;
  onOpenLink: (url: string, expiresAt: string) => void;
}) {
  const router = useRouter();
  const isTenantNoneAvailable = response.role === "TENANT" && response.result === "NONE_AVAILABLE";

  if (isTenantNoneAvailable) {
    return (
      <div className="mb-4">
        <p className="mb-4 text-sm text-red-600">
          세입자가 위 선택지 중 가능한 시간이 없다고 답변했습니다. 새로운 후보를 선택해 다시 요청해
          주세요.
        </p>
        <button
          type="button"
          onClick={() => router.push("/coordinations")}
          className="rounded-lg bg-[#f0f0ff] px-8 py-4 font-semibold text-slate-600"
        >
          조율 취소
        </button>
      </div>
    );
  }

  const offeredCandidates = response.offeredCandidateIds
    .map((id) => candidateTimesById.get(id))
    .filter((item): item is CoordinationCandidateTimeItem => item !== undefined);

  return (
    <div className="mb-4">
      {response.result === "WAITING" ? (
        <p className="mb-4 text-sm text-slate-500">
          {response.role === "TENANT" ? "세입자" : "구매희망자"}가 링크를 받고 날짜와 시간을
          선택하는 중입니다.
        </p>
      ) : null}
      {response.result === "NONE_AVAILABLE" ? (
        <p className="mb-4 text-sm text-red-600">
          구매희망자가 위 선택지 중 가능한 시간이 없다고 답변했습니다.
        </p>
      ) : null}
      {response.result === "EXPIRED" ? (
        <p className="mb-4 text-sm text-red-600">링크가 만료됐습니다.</p>
      ) : null}
      {response.result === "NOT_SELECTED" ? (
        <p className="mb-4 text-sm text-slate-500">최종 확정에서 선택되지 않았습니다.</p>
      ) : null}
      {(response.result === "AVAILABLE_SUBMITTED" || response.result === "CONFIRMED") &&
      offeredCandidates.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {offeredCandidates.map((candidate) => (
            <span
              key={candidate.candidateTimeId}
              className={`rounded-lg border px-4 py-3 text-center text-sm font-semibold ${
                response.selectedCandidateIds.includes(candidate.candidateTimeId)
                  ? "border-[#3937b8] bg-[#3937b8] text-white"
                  : "border-[#dfe3ec] bg-white text-[#182033]"
              }`}
            >
              {formatCandidateLabelFromIso(candidate.startsAt)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">
          {customerResponseResultLabels[response.result]}
        </span>
        {!isFinalized && response.customerLinkUrl && response.linkExpiresAt ? (
          <button
            type="button"
            onClick={() => onOpenLink(response.customerLinkUrl ?? "", response.linkExpiresAt ?? "")}
            className="text-sm font-semibold text-[#3937b8]"
          >
            링크 다시 보기
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FinalConfirmationPanel({
  coordinationId,
  buyerResponses,
  candidateTimesById,
  onConfirmed,
}: {
  coordinationId: number;
  buyerResponses: CoordinationCustomerResponseItem[];
  candidateTimesById: Map<number, CoordinationCandidateTimeItem>;
  onConfirmed: () => void;
}) {
  const availableBuyer = buyerResponses.find((buyer) => buyer.result === "AVAILABLE_SUBMITTED");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!availableBuyer || selectedCandidateId === null) return;
    setIsSubmitting(true);
    setError("");
    try {
      await confirmCoordination(coordinationId, {
        buyerResponseId: availableBuyer.responseId,
        candidateTimeId: selectedCandidateId,
      });
      onConfirmed();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? "선택한 구매희망자나 후보 시간이 더 이상 유효하지 않습니다. 화면을 새로고침해 확인해주세요."
          : "최종 확정을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!availableBuyer) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        가능 시간을 제출한 구매희망자가 아직 없어 최종 확정을 진행할 수 없습니다.
      </p>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-[#3937b8] p-6">
      <p className="mb-4 text-lg font-bold">일정 최종 확정</p>
      <p className="mb-4 text-sm font-semibold">확정할 방문 일시를 선택해주세요.</p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {availableBuyer.selectedCandidateIds.map((candidateId) => {
          const candidate = candidateTimesById.get(candidateId);
          if (!candidate) return null;
          return (
            <button
              key={candidateId}
              type="button"
              onClick={() => setSelectedCandidateId(candidateId)}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                selectedCandidateId === candidateId
                  ? "border-[#3937b8] bg-[#3937b8] text-white"
                  : "border-[#dfe3ec] bg-white text-[#182033]"
              }`}
            >
              {formatCandidateLabelFromIso(candidate.startsAt)}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={selectedCandidateId === null || isSubmitting}
        className="rounded-lg bg-[#3937b8] px-8 py-4 font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "처리 중" : "일정 최종 확정"}
      </button>
    </div>
  );
}

function BottomActions({
  coordinationId,
  status,
  hideCancel,
  onCompleted,
}: {
  coordinationId: number;
  status: CoordinationDetailResult["status"];
  hideCancel: boolean;
  onCompleted: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleComplete() {
    setIsSubmitting(true);
    setError("");
    try {
      await completeVisit(coordinationId);
      onCompleted();
    } catch {
      setError("임장 완료 처리를 하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "VISIT_COMPLETED") {
    return (
      <div className="flex flex-wrap gap-4">
        <Link
          href="/coordinations"
          className="rounded-lg bg-[#f0f0ff] px-8 py-4 font-semibold text-slate-600"
        >
          임장 조율 목록으로
        </Link>
        <Link href="/" className="rounded-lg bg-[#3937b8] px-8 py-4 font-semibold text-white">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        {status !== "SCHEDULE_CONFIRMED" && !hideCancel ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-[#f0f0ff] px-8 py-4 font-semibold text-slate-400"
          >
            조율 취소
          </button>
        ) : null}
        {status === "SCHEDULE_CONFIRMED" ? (
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={isSubmitting}
            className="rounded-lg bg-[#3937b8] px-8 py-4 font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? "처리 중" : "임장 완료"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
