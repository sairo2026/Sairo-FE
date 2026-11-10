"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  acceptTransfer,
  createTransfer,
  rejectTransfer,
  withdrawTransfer,
} from "../api/office.api";
import {
  officeKeys,
  useCurrentOffice,
  useCurrentTransfer,
  useMemberships,
  useTransferStatus,
} from "../hooks/office-queries";
import { TRANSFER_STATUS_LABEL, labelOf } from "../model/labels";
import { OWNER_TRANSFER_COPY } from "../model/legal-copy";
import { describeOfficeError } from "../model/messages";
import { MutedNote, ReasonDialog, StatusBadge } from "@/shared/components/feedback/page-parts";

type TransferView = {
  transferId: number;
  fromDisplayName: string;
  toDisplayName: string;
  status: string;
  requestedAt: string;
  acceptDeadlineAt: string;
  acceptedAt: string | null;
  completedAt?: string | null;
  withdrawnAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
};

const STEPS = ["대기", "수락됨", "심사 중", "완료"] as const;

function activeStep(status: string): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "ACCEPTED":
      return 1;
    case "UNDER_REVIEW":
      return 2;
    case "COMPLETED":
      return 3;
    default:
      return -1;
  }
}

function stepTime(view: TransferView, index: number): string | null {
  if (index === 0) return view.requestedAt;
  if (index === 1) return view.acceptedAt;
  if (index === 3) return view.completedAt ?? null;
  return null;
}

function TransferTimeline({ view }: { view: TransferView }) {
  const current = activeStep(view.status);
  const isTerminalStop = current === -1;
  const stopTime = view.rejectedAt ?? view.withdrawnAt ?? view.acceptDeadlineAt;
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="대표 이전 진행 상태" className="flex flex-wrap gap-3">
        {STEPS.map((label, index) => {
          const reached = !isTerminalStop && index <= current;
          const at = stepTime(view, index);
          return (
            <li
              key={label}
              aria-current={index === current ? "step" : undefined}
              className={
                reached
                  ? "min-w-24 rounded-control border border-primary bg-primary-soft px-4 py-3"
                  : "min-w-24 rounded-control border border-line bg-surface px-4 py-3 text-ink-3"
              }
            >
              <p className="text-body font-semibold">{label}</p>
              {reached && at ? (
                <p className="text-caption text-ink-2">{formatSeoulDateTime(at)}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
      {isTerminalStop ? (
        <div className="flex flex-col gap-1">
          <StatusBadge
            tone={view.status === "REJECTED" ? "red" : "gray"}
            label={labelOf(TRANSFER_STATUS_LABEL, view.status)}
          />
          <p className="text-caption text-ink-2">
            {labelOf(TRANSFER_STATUS_LABEL, view.status)} 시각 {formatSeoulDateTime(stopTime)}
          </p>
          {view.rejectionReason ? (
            <p className="text-body text-ink">거절 사유: {view.rejectionReason}</p>
          ) : null}
        </div>
      ) : null}
      <p className="text-body text-ink">
        {view.fromDisplayName} 대표가 {view.toDisplayName}님에게 대표 자리를 넘깁니다.
      </p>
      {!isTerminalStop && current < 2 ? (
        <MutedNote>수락 기한 {formatSeoulDateTime(view.acceptDeadlineAt)}</MutedNote>
      ) : null}
    </div>
  );
}

function CandidatePicker({ onCreated }: { onCreated: (transferId: number) => void }) {
  const query = useMemberships({ status: "APPROVED", page: 0, size: 100 });
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string>();
  const { isReadOnly } = useOfficeAccess();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createTransfer(Number(selected)),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: officeKeys.transfer });
      onCreated(result.transferId);
    },
    onError: (caught) =>
      setError(describeOfficeError(caught, "대표 이전을 시작하지 못했습니다. 다시 시도해 주세요.")),
  });

  const candidates = (query.data?.items ?? []).filter(
    (item) => item.role === "AGENT" && item.userId !== null,
  );

  function submit() {
    setError(undefined);
    if (selected === "") {
      setError("넘길 대상을 선택해 주세요.");
      return;
    }
    mutation.mutate();
  }

  return (
    <QueryGate query={query} loadingLabel="후보를 불러오는 중입니다.">
      {() => (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <MutedNote>
            승인된 소속공인중개사 중에서만 고를 수 있습니다. 시작하기 전에 본인 확인을 한 번 더
            합니다.
          </MutedNote>
          {candidates.length === 0 ? (
            <p
              role="status"
              className="rounded-control bg-surface px-4 py-3 text-caption text-ink-2"
            >
              넘길 수 있는 소속공인중개사가 없습니다. 먼저 소속공인중개사를 초대해 승인해 주세요.
            </p>
          ) : (
            <SelectField
              label="새 대표 후보"
              value={selected}
              placeholder="선택해 주세요"
              options={candidates.map((item) => ({
                value: String(item.userId),
                label: item.displayName,
              }))}
              onValueChange={(next) => {
                setSelected(next);
                setError(undefined);
              }}
              error={error}
            />
          )}
          {error && candidates.length === 0 ? <FormAlert>{error}</FormAlert> : null}
          <div>
            <Button
              type="submit"
              isLoading={mutation.isPending}
              disabled={isReadOnly || candidates.length === 0}
            >
              대표 이전 신청
            </Button>
          </div>
        </form>
      )}
    </QueryGate>
  );
}

export function OwnerTransferScreen() {
  const { role, isReadOnly } = useOfficeAccess();
  const queryClient = useQueryClient();
  const currentQuery = useCurrentTransfer();
  const office = useCurrentOffice();
  const [trackedId, setTrackedId] = useState<number | null>(null);
  const trackedQuery = useTransferStatus(
    currentQuery.data === null && trackedId !== null ? trackedId : null,
  );
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const isOwner = role === "OWNER";

  async function refresh(transferId: number) {
    setTrackedId(transferId);
    await queryClient.invalidateQueries({ queryKey: officeKeys.transfer });
  }

  const withdraw = useMutation({
    mutationFn: (id: number) => withdrawTransfer(id),
    onSuccess: async (result) => {
      setConfirmWithdraw(false);
      setNotice("대표 이전을 철회했습니다.");
      await refresh(result.transferId);
    },
    onError: (caught) => {
      setConfirmWithdraw(false);
      setError(describeOfficeError(caught, "철회하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  const accept = useMutation({
    mutationFn: (id: number) => acceptTransfer(id),
    onSuccess: async (result) => {
      setNotice("대표 이전을 수락했습니다. 운영자 승인을 기다립니다.");
      await refresh(result.transferId);
    },
    onError: async (caught) => {
      setError(describeOfficeError(caught, "수락하지 못했습니다. 다시 시도해 주세요."));
      await queryClient.invalidateQueries({ queryKey: officeKeys.transfer });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectTransfer(id, reason),
    onSuccess: async (result) => {
      setRejecting(false);
      setNotice("대표 이전을 거절했습니다.");
      await refresh(result.transferId);
    },
    onError: (caught) => {
      setRejecting(false);
      setError(describeOfficeError(caught, "거절하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대표 이전"
        description="대표 자리를 다른 소속공인중개사에게 넘깁니다. 수락과 운영자 승인을 거쳐 완료됩니다."
        actions={
          <Link
            href="/members"
            className="inline-flex h-9 items-center rounded-control border border-line px-3.5 text-caption text-ink-2 hover:border-primary hover:text-primary"
          >
            구성원 목록
          </Link>
        }
      />
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <ul className="flex list-disc flex-col gap-1 pl-5 text-caption text-ink-2">
        {OWNER_TRANSFER_COPY.guide.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <QueryGate query={currentQuery} loadingLabel="대표 이전 상태를 불러오는 중입니다.">
        {(current) => {
          if (current !== null) {
            return (
              <Card title="진행 중인 대표 이전">
                <div className="flex flex-col gap-6">
                  <TransferTimeline view={current} />
                  <div className="flex flex-wrap gap-3">
                    {isOwner ? (
                      <Button
                        variant="cancel"
                        disabled={isReadOnly}
                        onClick={() => {
                          setError(undefined);
                          setConfirmWithdraw(true);
                        }}
                      >
                        대표 이전 철회
                      </Button>
                    ) : current.status === "PENDING" ? (
                      <>
                        <p className="w-full text-body text-ink">
                          {OWNER_TRANSFER_COPY.targetAccept(
                            office.data?.name ?? "사무소",
                            formatSeoulDateTime(current.acceptDeadlineAt),
                          )}
                        </p>
                        <Button
                          isLoading={accept.isPending}
                          disabled={isReadOnly}
                          onClick={() => {
                            setError(undefined);
                            setNotice(undefined);
                            accept.mutate(current.transferId);
                          }}
                        >
                          수락
                        </Button>
                        <Button
                          variant="cancel"
                          disabled={isReadOnly}
                          onClick={() => {
                            setError(undefined);
                            setRejecting(true);
                          }}
                        >
                          거절
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <ConfirmDialog
                  isOpen={confirmWithdraw}
                  title="대표 이전을 철회할까요"
                  message="철회하면 진행 중인 이전이 끝나고 지금 대표가 그대로 유지됩니다."
                  confirmLabel="철회"
                  isPending={withdraw.isPending}
                  onConfirm={() => withdraw.mutate(current.transferId)}
                  onCancel={() => setConfirmWithdraw(false)}
                />
                <ReasonDialog
                  isOpen={rejecting}
                  title="대표 이전 거절"
                  label="거절 사유 (선택)"
                  confirmLabel="거절"
                  isPending={reject.isPending}
                  validate={(value) =>
                    value.trim().length > 500 ? "사유는 500자 이하로 입력해 주세요." : undefined
                  }
                  onConfirm={(reason) => reject.mutate({ id: current.transferId, reason })}
                  onClose={() => setRejecting(false)}
                />
              </Card>
            );
          }
          return (
            <div className="flex flex-col gap-6">
              {trackedQuery.data ? (
                <Card title="최근 대표 이전">
                  <TransferTimeline view={trackedQuery.data} />
                </Card>
              ) : null}
              {isOwner ? (
                <Card title="새 대표 이전">
                  <CandidatePicker onCreated={(id) => setTrackedId(id)} />
                </Card>
              ) : (
                <p
                  role="status"
                  className="rounded-control bg-surface px-4 py-3 text-caption text-ink-2"
                >
                  진행 중인 대표 이전이 없습니다.
                </p>
              )}
            </div>
          );
        }}
      </QueryGate>
    </div>
  );
}
