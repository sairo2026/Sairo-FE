"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { searchOffices } from "@/features/office/api/office.api";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { ReasonDialog } from "@/shared/components/feedback/page-parts";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createApplyGrant, revokeApplyGrant } from "../api/request.api";
import { useApplyGrants } from "../hooks/request-queries";
import { useAccessApprovals, visitKeys } from "../hooks/visit-queries";
import { GRANT_STATE_LABEL, GRANT_STATE_TONE, labelOf } from "../model/labels";
import { describeVisitError, fieldErrorMap } from "../model/messages";
import { GRANT_SCOPE_LABEL } from "../model/request-labels";
import { toKstIso } from "../model/time";

type Grant = NonNullable<ReturnType<typeof useApplyGrants>["data"]>["items"][number];
type OfficeHit = { officeId: number; name: string; address: string };

function AddGrantModal({
  propertyId,
  approvalId,
  onClose,
  onAdded,
}: {
  propertyId: number;
  approvalId: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [hits, setHits] = useState<OfficeHit[] | null>(null);
  const [picked, setPicked] = useState<OfficeHit | null>(null);
  const [membershipId, setMembershipId] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [expiresTime, setExpiresTime] = useState("");
  const [searchError, setSearchError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const search = useMutation({
    mutationFn: () =>
      searchOffices({ name: name.trim(), region: region.trim(), page: 0, size: 10 }),
    onSuccess: (data) => {
      setSearchError(undefined);
      setHits(data.items);
    },
    onError: (caught) =>
      setSearchError(describeVisitError(caught, "사무소를 검색하지 못했습니다.")),
  });

  const create = useMutation({
    mutationFn: () =>
      createApplyGrant(propertyId, approvalId, {
        granteeOfficeId: picked?.officeId ?? 0,
        granteeMembershipId: membershipId.trim() === "" ? null : Number(membershipId),
        expiresAt: expiresDate === "" ? null : toKstIso(expiresDate, expiresTime || "23:59"),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: visitKeys.all });
      onAdded();
    },
    onError: (caught) => {
      setFieldErrors(fieldErrorMap(caught));
      setFormError(describeVisitError(caught, "허용을 추가하지 못했습니다."));
    },
  });

  function submit() {
    const nextErrors: Record<string, string> = {};
    if (!picked) nextErrors.office = "허용할 사무소를 검색해 선택해 주세요.";
    if (membershipId.trim() !== "" && !/^[1-9]\d*$/.test(membershipId.trim())) {
      nextErrors.membership = "중개사 번호는 숫자로 입력해 주세요.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setFormError(undefined);
    create.mutate();
  }

  const canSearch = name.trim() !== "" && region.trim() !== "";
  return (
    <Modal
      isOpen
      title="신청 허용 추가"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={create.isPending}>
            취소
          </Button>
          <Button isLoading={create.isPending} onClick={submit}>
            허용 추가
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-caption text-ink-2">
          허용은 방문 신청 권한만 줍니다. 승인자 연락처와 조건 값, 링크 발급, 재허용, 매물 수정은
          허용에 포함되지 않습니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="사무소명" value={name} onValueChange={setName} />
          <TextField label="지역" value={region} onValueChange={setRegion} />
        </div>
        <Button
          variant="outlined"
          size="sm"
          disabled={!canSearch}
          isLoading={search.isPending}
          onClick={() => search.mutate()}
        >
          사무소 검색
        </Button>
        {searchError ? <FormAlert>{searchError}</FormAlert> : null}
        {hits && hits.length === 0 ? (
          <p className="text-caption text-ink-2">검색 결과가 없습니다.</p>
        ) : null}
        {hits && hits.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="검색 결과">
            {hits.map((hit) => (
              <li key={hit.officeId}>
                <button
                  type="button"
                  aria-pressed={picked?.officeId === hit.officeId}
                  onClick={() => {
                    setPicked(hit);
                    setFieldErrors((current) => ({ ...current, office: "" }));
                  }}
                  className={`w-full rounded-control border px-3 py-2 text-left text-caption ${picked?.officeId === hit.officeId ? "border-primary bg-primary-soft" : "border-line"}`}
                >
                  <span className="font-semibold text-ink">{hit.name}</span>
                  <span className="block text-ink-2">{hit.address}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {fieldErrors.office ? (
          <p role="alert" className="text-caption text-danger">
            {fieldErrors.office}
          </p>
        ) : null}
        <TextField
          label="특정 중개사 구성원 번호 (선택)"
          kind="number"
          value={membershipId}
          hint="비우면 사무소 전체에 허용합니다."
          onValueChange={setMembershipId}
          error={fieldErrors.membership || fieldErrors.granteeMembershipId}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField
            label="허용 만료일 (선택)"
            kind="date"
            value={expiresDate}
            onValueChange={setExpiresDate}
            error={fieldErrors.expiresAt}
          />
          <DateTimeField
            label="만료 시각"
            kind="time"
            value={expiresTime}
            onValueChange={setExpiresTime}
          />
        </div>
        {formError ? <FormAlert>{formError}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function GrantRow({ grant, onRevoke }: { grant: Grant; onRevoke: (grant: Grant) => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
          {grant.granteeOfficeName}
          <Badge tone={GRANT_STATE_TONE[grant.state]}>
            {labelOf(GRANT_STATE_LABEL, grant.state)}
          </Badge>
        </span>
        <span className="text-caption text-ink-2">
          {labelOf(GRANT_SCOPE_LABEL, grant.scope)}
          {grant.granteeMemberName ? ` · ${grant.granteeMemberName}` : ""} · 허용{" "}
          {formatSeoulDateTime(grant.grantedAt)}
          {grant.expiresAt ? ` · 만료 ${formatSeoulDateTime(grant.expiresAt)}` : " · 만료 없음"}
        </span>
        <span className="text-caption text-ink-2">
          이 허용으로 들어온 신청 대기 {grant.openRequestCount}건
          {grant.revokeReason ? ` · 회수 사유 ${grant.revokeReason}` : ""}
        </span>
      </div>
      {grant.state === "ACTIVE" ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${grant.granteeOfficeName} 허용 회수`}
          onClick={() => onRevoke(grant)}
        >
          회수
        </Button>
      ) : null}
    </li>
  );
}

export function ApplyGrantsScreen({
  propertyId,
  approvalId,
}: {
  propertyId: number;
  approvalId: number;
}) {
  const { role, isReadOnly } = useOfficeAccess();
  const queryClient = useQueryClient();
  const grants = useApplyGrants(propertyId, approvalId);
  const approvals = useAccessApprovals(propertyId);
  const [isAdding, setIsAdding] = useState(false);
  const [target, setTarget] = useState<Grant | null>(null);
  const [notice, setNotice] = useState<string>();
  const [revokeError, setRevokeError] = useState<string>();

  const revoke = useMutation({
    mutationFn: (reason: string) =>
      revokeApplyGrant(propertyId, approvalId, target?.grantId ?? 0, { reason }),
    onSuccess: async (result) => {
      setTarget(null);
      setRevokeError(undefined);
      setNotice(
        `허용을 회수했습니다. 신청 대기 ${result.closedRequestIds.length}건은 기간 만료로 종결되었고 확정된 방문 ${result.keptScheduleItemIds.length}건은 유지됩니다.`,
      );
      await queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
    onError: (caught) => setRevokeError(describeVisitError(caught, "허용을 회수하지 못했습니다.")),
  });

  if (role === "DEPUTY") {
    return (
      <EmptyState
        title="이 화면은 중개보조원에게 제공되지 않습니다."
        description="신청 허용은 승인된 대표와 소속공인중개사가 관리합니다."
      />
    );
  }
  const approval = approvals.data?.items.find((item) => item.approvalId === approvalId);
  const isPrimary = approval ? approval.approvalRole === "PRIMARY" : true;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="신청 허용 관리"
        description="다른 사무소가 이 출입승인의 매물에 방문 신청을 낼 수 있도록 허용하거나 회수합니다."
        actions={
          <div className="flex gap-2">
            <Link
              href={`/properties/${propertyId}/access-approvals`}
              className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
            >
              출입승인
            </Link>
            <Button disabled={isReadOnly || !isPrimary} onClick={() => setIsAdding(true)}>
              허용 추가
            </Button>
          </div>
        }
      />
      <Card>
        <div className="flex flex-col gap-4">
          <FormNotice>
            허용은 대표 승인자 출입승인에서만 할 수 있고 새 출입승인을 등록하면 허용이 옮겨지지
            않습니다. 허용으로 주는 권한은 방문 신청뿐이며 승인자 연락처, 조건 값, 링크 발급,
            재허용, 매물 수정은 포함되지 않습니다.
          </FormNotice>
          {!isPrimary ? (
            <FormAlert>공동 승인자 출입승인에는 신청을 허용할 수 없습니다.</FormAlert>
          ) : null}
          {notice ? <FormNotice>{notice}</FormNotice> : null}
          <QueryGate query={grants} loadingLabel="허용 목록을 불러오는 중입니다.">
            {(data) =>
              data.items.length === 0 ? (
                <EmptyState title="허용한 사무소가 없습니다." />
              ) : (
                <ul className="flex flex-col">
                  {data.items.map((item) => (
                    <GrantRow
                      key={item.grantId}
                      grant={item}
                      onRevoke={(grant) => {
                        setRevokeError(undefined);
                        setTarget(grant);
                      }}
                    />
                  ))}
                </ul>
              )
            }
          </QueryGate>
        </div>
      </Card>
      {isAdding ? (
        <AddGrantModal
          propertyId={propertyId}
          approvalId={approvalId}
          onClose={() => setIsAdding(false)}
          onAdded={() => {
            setIsAdding(false);
            setNotice("신청 허용을 추가했습니다.");
          }}
        />
      ) : null}
      <ReasonDialog
        isOpen={target !== null}
        title="신청 허용 회수"
        description={
          target
            ? `${target.granteeOfficeName}의 허용을 회수합니다. 이 허용으로 들어온 신청 대기 ${target.openRequestCount}건이 기간 만료로 종결되고, 확정된 방문은 유지됩니다.`
            : undefined
        }
        label="회수 사유"
        confirmLabel="회수"
        isPending={revoke.isPending}
        error={revokeError}
        validate={(value) => (value.trim() === "" ? "회수 사유를 입력해 주세요." : undefined)}
        onConfirm={(reason) => revoke.mutate(reason)}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
