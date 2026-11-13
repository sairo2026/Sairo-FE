"use client";

import { MEMBERSHIP_NOTICE_COPY } from "../model/legal-copy";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { OfficeSearchResponse } from "@/lib/api/contracts/office.schema";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import {
  acceptInvitation,
  cancelMembership,
  createMembership,
  searchOffices,
  startMembershipReapplication,
} from "../api/office.api";
import type { MembershipStatusWire } from "../api/office.api";
import { officeKeys, useMyMembership, useRefreshOfficeState } from "../hooks/office-queries";
import { ENTITY_TYPE_LABEL, ROLE_LABEL, labelOf } from "../model/labels";
import { describeOfficeError, describeRemaining, fieldErrorMap } from "../model/messages";
import {
  formatBusinessNumber,
  qualificationBody,
  validateQualification,
} from "../model/validation";
import type { FieldErrors, MembershipRole, QualificationField } from "../model/validation";
import {
  Checklist,
  ButtonRow,
  FlowFrame,
  MutedNote,
  StatusBadge,
  TextLink,
} from "@/shared/components/feedback/page-parts";
import { ROSTER_NOTICE_COPY } from "@/shared/legal/notice-copy";
import { cn } from "@/shared/lib/cn";

const SELECTED_OFFICE_KEY = "sairo.office.join-target";
const SEARCH_PAGE_SIZE = 25;

type SelectedOffice = { officeId: number; name: string; address: string };

function saveSelectedOffice(office: SelectedOffice) {
  try {
    window.sessionStorage.setItem(SELECTED_OFFICE_KEY, JSON.stringify(office));
  } catch {
    return;
  }
}

function subscribeNothing(): () => void {
  return () => undefined;
}

function readStoredOffice(): string | null {
  try {
    return window.sessionStorage.getItem(SELECTED_OFFICE_KEY);
  } catch {
    return null;
  }
}

function parseSelectedOffice(raw: string | null, officeId: number): SelectedOffice | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SelectedOffice>;
    if (
      parsed.officeId === officeId &&
      typeof parsed.name === "string" &&
      typeof parsed.address === "string"
    ) {
      return { officeId, name: parsed.name, address: parsed.address };
    }
  } catch {
    return null;
  }
  return null;
}

type SearchMode = "business" | "name";

type SubmittedSearch = { mode: SearchMode; businessNumber: string; name: string; region: string };

export function OfficeSearchScreen() {
  const router = useRouter();
  const { context } = useOfficeAccess();
  const [mode, setMode] = useState<SearchMode>("business");
  const [businessNumber, setBusinessNumber] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null);
  const [page, setPage] = useState(0);

  const resultQuery = useQuery({
    queryKey: officeKeys.search(submitted, page),
    enabled: submitted !== null,
    queryFn: () =>
      searchOffices({
        ...(submitted?.mode === "business"
          ? { businessRegistrationNumber: submitted.businessNumber }
          : { name: submitted?.name, region: submitted?.region }),
        page,
        size: SEARCH_PAGE_SIZE,
      }),
  });

  function search() {
    const next: Record<string, string | undefined> = {};
    if (mode === "business") {
      if (businessNumber.replace(/\D/g, "").length !== 10) {
        next.businessNumber = "사업자등록번호 10자리를 입력해 주세요.";
      }
    } else {
      if (name.trim() === "") next.name = "사무소명을 입력해 주세요.";
      if (region.trim() === "") next.region = "지역(시·군·구)을 입력해 주세요.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPage(0);
    setSubmitted({ mode, businessNumber, name: name.trim(), region: region.trim() });
  }

  const isBlocked =
    (context.pendingMembershipId ?? null) !== null ||
    (context.pendingRegistrationId ?? null) !== null ||
    (context.officeId ?? null) !== null;

  const searchError = resultQuery.error ? fieldErrorMap(resultQuery.error) : {};

  return (
    <FlowFrame
      title="참여할 사무소를 찾아 주세요."
      description="인증이 끝난 사무소만 검색됩니다. 사업자등록번호는 검색 조건으로만 쓰이고 결과에는 표시되지 않습니다. 대표의 개인 연락처와 직원 목록은 공개하지 않습니다."
    >
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="검색 방법" className="grid grid-cols-2 gap-2">
          {(
            [
              ["business", "사업자등록번호"],
              ["name", "사무소명과 지역"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={mode === key}
              onClick={() => setMode(key)}
              className={cn(
                "h-12 rounded-control border text-body",
                mode === key
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-line bg-surface text-ink-2 hover:border-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}
        >
          {mode === "business" ? (
            <TextField
              label="사업자등록번호"
              kind="number"
              value={businessNumber}
              onValueChange={(next) => {
                setBusinessNumber(formatBusinessNumber(next));
                setErrors({});
              }}
              placeholder="000-00-00000"
              error={errors.businessNumber ?? searchError.businessRegistrationNumber}
            />
          ) : (
            <>
              <TextField
                label="사무소명"
                value={name}
                onValueChange={(next) => {
                  setName(next);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                error={errors.name ?? searchError.name}
                maxLength={100}
              />
              <TextField
                label="지역 (시·군·구)"
                value={region}
                onValueChange={(next) => {
                  setRegion(next);
                  setErrors((current) => ({ ...current, region: undefined }));
                }}
                placeholder="종로구"
                error={errors.region ?? searchError.region}
                maxLength={50}
              />
            </>
          )}
          <ButtonRow>
            <Button variant="cancel" onClick={() => router.push("/office/start")}>
              이전
            </Button>
            <Button type="submit" isLoading={resultQuery.isFetching}>
              검색
            </Button>
          </ButtonRow>
        </form>

        {isBlocked ? (
          <FormNotice>
            이미 소속되어 있거나 진행 중인 신청·참여 요청이 있어 새로 참여를 신청할 수 없습니다.
          </FormNotice>
        ) : null}

        {submitted !== null ? (
          <SearchResults
            query={resultQuery}
            isBlocked={isBlocked}
            page={page}
            onPageChange={setPage}
            onSelect={(office) => {
              saveSelectedOffice(office);
              router.push(`/office/join/${office.officeId}`);
            }}
          />
        ) : null}
      </div>
    </FlowFrame>
  );
}

function SearchResults({
  query,
  isBlocked,
  page,
  onPageChange,
  onSelect,
}: {
  query: UseQueryResult<OfficeSearchResponse>;
  isBlocked: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (office: SelectedOffice) => void;
}) {
  if (query.isPending) {
    return (
      <p role="status" className="text-caption text-ink-2">
        사무소를 검색하는 중입니다.
      </p>
    );
  }
  if (query.isError) {
    const isValidation = Object.keys(fieldErrorMap(query.error)).length > 0;
    return (
      <div className="flex flex-col gap-3">
        <FormAlert>
          {isValidation
            ? "검색 조건을 확인해 주세요."
            : describeOfficeError(query.error, "검색하지 못했습니다. 다시 시도해 주세요.")}
        </FormAlert>
        {isValidation ? null : (
          <div>
            <Button variant="outlined" size="sm" onClick={() => void query.refetch()}>
              다시 시도
            </Button>
          </div>
        )}
      </div>
    );
  }
  const { items, totalElements } = query.data;
  if (items.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-control bg-surface px-4 py-6 text-center"
      >
        <p className="text-body font-semibold text-ink">검색 결과가 없습니다.</p>
        <MutedNote>
          인증이 끝난 사무소만 검색됩니다. 조건을 확인하거나 새 사무소를 생성해 주세요.
        </MutedNote>
        <TextLink href="/office/register">새 사무소 생성하기</TextLink>
      </div>
    );
  }
  const pageCount = Math.max(1, Math.ceil(totalElements / SEARCH_PAGE_SIZE));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((office) => (
          <li
            key={office.officeId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">{office.name}</p>
              <p className="text-caption text-ink-2">
                {labelOf(ENTITY_TYPE_LABEL, office.entityType)} · {office.registrationAuthority} ·{" "}
                {office.address}
              </p>
            </div>
            <Button
              size="sm"
              variant="outlined"
              disabled={isBlocked}
              onClick={() =>
                onSelect({ officeId: office.officeId, name: office.name, address: office.address })
              }
              aria-label={`${office.name} 참여 신청`}
            >
              참여 신청
            </Button>
          </li>
        ))}
      </ul>
      {pageCount > 1 ? (
        <nav
          aria-label="검색 결과 페이지"
          className="flex items-center justify-center gap-3 text-caption"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            이전
          </Button>
          <span aria-live="polite">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page + 1 >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            다음
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

const ROLE_CHOICES: Array<{ role: MembershipRole; label: string }> = [
  { role: "AGENT", label: "소속 공인중개사" },
  { role: "DEPUTY", label: "중개 보조원" },
];

function QualificationFields({
  role,
  qualificationNumber,
  employmentReportConfirmed,
  trainingConfirmed,
  errors,
  onChange,
}: {
  role: MembershipRole;
  qualificationNumber: string;
  employmentReportConfirmed: boolean;
  trainingConfirmed: boolean;
  errors: FieldErrors<QualificationField>;
  onChange: (patch: {
    qualificationNumber?: string;
    employmentReportConfirmed?: boolean;
    trainingConfirmed?: boolean;
  }) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {role === "AGENT" ? (
        <TextField
          label="자격증 번호"
          value={qualificationNumber}
          onValueChange={(next) => onChange({ qualificationNumber: next })}
          error={errors.qualificationNumber}
          maxLength={50}
        />
      ) : null}
      <Checklist
        id="employment-report"
        label="고용신고를 확인했습니다"
        checked={employmentReportConfirmed}
        onChange={(value) => onChange({ employmentReportConfirmed: value })}
        error={errors.employmentReportConfirmed}
      />
      <Checklist
        id="training-confirmed"
        label={role === "AGENT" ? "필요한 교육을 이수했습니다" : "직무교육을 이수했습니다"}
        checked={trainingConfirmed}
        onChange={(value) => onChange({ trainingConfirmed: value })}
        error={errors.trainingConfirmed}
      />
    </div>
  );
}

export function MembershipRequestForm({ officeId }: { officeId: number }) {
  const router = useRouter();
  const refresh = useRefreshOfficeState();
  const storedOffice = useSyncExternalStore(
    subscribeNothing,
    () => readStoredOffice(),
    () => null,
  );
  const office = useMemo(
    () => parseSelectedOffice(storedOffice, officeId),
    [storedOffice, officeId],
  );
  const [role, setRole] = useState<MembershipRole>("AGENT");
  const [qualificationNumber, setQualificationNumber] = useState("");
  const [employmentReportConfirmed, setEmploymentReportConfirmed] = useState(false);
  const [trainingConfirmed, setTrainingConfirmed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<QualificationField>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      createMembership(officeId, {
        role,
        ...qualificationBody({
          role,
          qualificationNumber,
          employmentReportConfirmed,
          trainingConfirmed,
        }),
      }),
    onSuccess: async () => {
      await refresh();
      router.replace("/office/membership");
    },
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      setErrors({
        qualificationNumber: mapped.qualificationNumber,
        employmentReportConfirmed: mapped.employmentReportConfirmed,
        trainingConfirmed: mapped.trainingConfirmed,
      });
      setFormError(describeOfficeError(caught, "참여를 요청하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function submit() {
    setFormError(undefined);
    const values = { role, qualificationNumber, employmentReportConfirmed, trainingConfirmed };
    const problems = validateQualification(values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    mutation.mutate();
  }

  return (
    <FlowFrame
      title={
        office
          ? `${office.name}에 참여를 요청하시겠습니까?`
          : "선택한 사무소에 참여를 요청하시겠습니까?"
      }
      description="대표자 이름과 연락처는 보여드리지 않습니다. 역할과 자격 정보를 입력하면 대표가 확인한 뒤 승인합니다."
    >
      <MutedNote>{MEMBERSHIP_NOTICE_COPY.join}</MutedNote>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {office ? (
          <div className="rounded-control bg-surface px-4 py-3">
            <p className="text-body font-semibold text-ink">{office.name}</p>
            <p className="text-caption text-ink-2">{office.address}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <p id="membership-role-label" className="text-caption font-semibold text-ink">
            역할 선택
          </p>
          <div
            role="radiogroup"
            aria-labelledby="membership-role-label"
            className="grid grid-cols-2 gap-2"
          >
            {ROLE_CHOICES.map((choice) => (
              <button
                key={choice.role}
                type="button"
                role="radio"
                aria-checked={role === choice.role}
                onClick={() => {
                  setRole(choice.role);
                  setErrors({});
                }}
                className={cn(
                  "h-12 rounded-control border text-body",
                  role === choice.role
                    ? "border-primary bg-primary-soft font-semibold text-primary"
                    : "border-line bg-surface text-ink-2 hover:border-primary",
                )}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
        <QualificationFields
          role={role}
          qualificationNumber={qualificationNumber}
          employmentReportConfirmed={employmentReportConfirmed}
          trainingConfirmed={trainingConfirmed}
          errors={errors}
          onChange={(patch) => {
            if (patch.qualificationNumber !== undefined)
              setQualificationNumber(patch.qualificationNumber);
            if (patch.employmentReportConfirmed !== undefined) {
              setEmploymentReportConfirmed(patch.employmentReportConfirmed);
            }
            if (patch.trainingConfirmed !== undefined)
              setTrainingConfirmed(patch.trainingConfirmed);
            setErrors({});
          }}
        />
        {formError ? (
          <div className="flex flex-col gap-2">
            <FormAlert>{formError}</FormAlert>
            <TextLink href="/office/membership">참여 요청 상태 확인하기</TextLink>
          </div>
        ) : null}
        <ButtonRow>
          <Button variant="cancel" onClick={() => router.push("/office/join")}>
            이전
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            참여 요청
          </Button>
        </ButtonRow>
      </form>
    </FlowFrame>
  );
}

const MEMBERSHIP_HEADLINE = {
  PENDING: "대표의 승인을 기다리고 있습니다.",
  APPROVED: "사무소에 참여했습니다.",
  REJECTED: "참여 요청이 거절되었습니다.",
  REVOKED: "사무소 소속이 회수되었습니다.",
  CANCELLED: "참여 요청을 철회했습니다.",
  SUSPENDED: "사무소 접근이 정지되었습니다.",
  EXPIRED: "참여 요청 기한이 지났습니다.",
} as const;

export function MembershipStatusScreen() {
  const query = useMyMembership();
  return (
    <FlowFrame title="사무소 참여 요청 상태">
      <QueryGate query={query} loadingLabel="참여 요청 상태를 불러오는 중입니다.">
        {(membership) =>
          membership === null ? (
            <div className="flex flex-col gap-4">
              <p className="text-body text-ink-2">진행 중인 참여 요청이나 초대가 없습니다.</p>
              <TextLink href="/office/start">사무소 생성/참여 선택으로 이동</TextLink>
            </div>
          ) : (
            <MembershipStatusBody
              key={`${membership.membershipId}-${membership.version}`}
              membership={membership}
            />
          )
        }
      </QueryGate>
    </FlowFrame>
  );
}

type MembershipStatus = MembershipStatusWire;

function MembershipStatusBody({ membership }: { membership: MembershipStatus }) {
  const router = useRouter();
  const refresh = useRefreshOfficeState();
  const [now] = useState(() => new Date());
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const isInvite = membership.requestSource === "INVITE";
  const isPending = membership.status === "PENDING";
  const expired =
    isPending && membership.expiresAt
      ? new Date(membership.expiresAt).getTime() <= now.getTime()
      : false;
  const needsAcceptance = isPending && isInvite && !membership.invitationAcceptedAt && !expired;
  const remaining = isPending ? describeRemaining(membership.expiresAt, now) : null;

  const cancelMutation = useMutation({
    mutationFn: () => cancelMembership(membership.membershipId),
    onSuccess: async () => {
      setConfirmingCancel(false);
      setNotice("참여 요청을 철회했습니다.");
      await refresh();
    },
    onError: (caught) => {
      setConfirmingCancel(false);
      setError(describeOfficeError(caught, "철회하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  const [isReapplying, setIsReapplying] = useState(false);

  const status = expired ? "EXPIRED" : membership.status;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          tone={
            status === "APPROVED"
              ? "green"
              : status === "PENDING"
                ? "blue"
                : status === "SUSPENDED"
                  ? "yellow"
                  : status === "CANCELLED" || status === "EXPIRED"
                    ? "gray"
                    : "red"
          }
          label={
            {
              PENDING: "승인 대기",
              APPROVED: "승인",
              REJECTED: "거절",
              REVOKED: "회수",
              CANCELLED: "취소",
              SUSPENDED: "접근 정지",
              EXPIRED: "만료",
            }[status]
          }
        />
        <p className="text-body font-semibold text-ink">{MEMBERSHIP_HEADLINE[status]}</p>
      </div>

      <div className="rounded-control bg-surface px-4 py-3">
        <p className="text-body font-semibold text-ink">{membership.officeName}</p>
        <p className="text-caption text-ink-2">
          {isInvite ? "대표가 보낸 초대" : "내가 보낸 참여 요청"} ·{" "}
          {labelOf(ROLE_LABEL, membership.role)}
        </p>
      </div>

      {isPending && !expired ? (
        <div className="flex flex-col gap-1">
          {remaining ? (
            <p className="text-body text-ink">
              {isInvite && !membership.invitationAcceptedAt ? "초대 수락 기한" : "승인 기한"}:{" "}
              {remaining}
            </p>
          ) : null}
          <MutedNote>
            {isInvite
              ? "초대는 발급 또는 재발송 후 7일 안에만 수락할 수 있습니다."
              : "참여 요청은 요청 후 30일까지 유효합니다."}
          </MutedNote>
          {membership.expiresAt ? (
            <MutedNote>만료 시각 {formatSeoulDateTime(membership.expiresAt)}</MutedNote>
          ) : null}
        </div>
      ) : null}

      {isPending && !expired && isInvite && membership.invitationAcceptedAt ? (
        <FormNotice>
          초대를 수락했습니다. 대표가 승인하면 업무 화면을 사용할 수 있습니다.
        </FormNotice>
      ) : null}

      {status === "REJECTED" && membership.rejectionReason ? (
        <p className="text-body text-ink">거절 사유: {membership.rejectionReason}</p>
      ) : null}
      {status === "EXPIRED" ? (
        <MutedNote>
          기한이 지나 요청이 만료되었습니다. 새로 참여를 신청하거나 대표에게 다시 초대를 요청해
          주세요.
        </MutedNote>
      ) : null}

      {needsAcceptance ? (
        <InvitationAcceptForm membership={membership} onDone={() => void refresh()} />
      ) : null}

      {status === "REJECTED" && membership.resolved !== true && isReapplying ? (
        <ReapplicationForm
          membership={membership}
          onCancel={() => setIsReapplying(false)}
          onDone={() => {
            setIsReapplying(false);
            void refresh();
          }}
        />
      ) : null}

      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}

      <ButtonRow>
        {status === "APPROVED" ? <Button onClick={() => router.push("/home")}>업무 시작</Button> : null}
        {status === "REJECTED" && membership.resolved !== true && !isReapplying ? (
          <Button onClick={() => setIsReapplying(true)}>재신청 시작</Button>
        ) : null}
        {status === "REJECTED" && membership.resolved === true ? (
          <Button onClick={() => router.push("/office/start")}>새로 시작</Button>
        ) : null}
        {status === "EXPIRED" || status === "CANCELLED" ? (
          <Button onClick={() => router.push("/office/start")}>새로 시작</Button>
        ) : null}
        {isPending && !expired && !isInvite ? (
          <Button variant="cancel" onClick={() => setConfirmingCancel(true)}>
            요청 철회
          </Button>
        ) : null}
      </ButtonRow>
      <p className="text-center text-caption text-ink-3">
        <Link href="/access" className="hover:underline">
          접근 안내 보기
        </Link>
      </p>

      <ConfirmDialog
        isOpen={confirmingCancel}
        title="참여 요청을 철회할까요"
        message="철회하면 대표에게 전달된 요청이 닫히고 새로 시작해야 합니다."
        confirmLabel="철회"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  );
}

function ReapplicationForm({
  membership,
  onCancel,
  onDone,
}: {
  membership: MembershipStatus;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [role, setRole] = useState<MembershipRole>(
    membership.role === "DEPUTY" ? "DEPUTY" : "AGENT",
  );
  const [qualificationNumber, setQualificationNumber] = useState("");
  const [employmentReportConfirmed, setEmploymentReportConfirmed] = useState(false);
  const [trainingConfirmed, setTrainingConfirmed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<QualificationField>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      startMembershipReapplication(membership.membershipId, {
        role,
        ...qualificationBody({
          role,
          qualificationNumber,
          employmentReportConfirmed,
          trainingConfirmed,
        }),
      }),
    onSuccess: onDone,
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      setErrors({
        qualificationNumber: mapped.qualificationNumber,
        employmentReportConfirmed: mapped.employmentReportConfirmed,
        trainingConfirmed: mapped.trainingConfirmed,
      });
      setFormError(describeOfficeError(caught, "재신청하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function submit() {
    setFormError(undefined);
    const problems = validateQualification({
      role,
      qualificationNumber,
      employmentReportConfirmed,
      trainingConfirmed,
    });
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    mutation.mutate();
  }

  return (
    <form
      noValidate
      aria-label="재신청"
      className="flex flex-col gap-4 rounded-control border border-line p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="text-body font-semibold text-ink">재신청</p>
      <MutedNote>재신청하려면 역할과 자격, 교육, 고용신고 확인을 다시 입력해야 합니다.</MutedNote>
      <div className="flex flex-col gap-2">
        <p id="reapply-role-label" className="text-caption font-semibold text-ink">
          역할 선택
        </p>
        <div
          role="radiogroup"
          aria-labelledby="reapply-role-label"
          className="grid grid-cols-2 gap-2"
        >
          {ROLE_CHOICES.map((choice) => (
            <button
              key={choice.role}
              type="button"
              role="radio"
              aria-checked={role === choice.role}
              onClick={() => {
                setRole(choice.role);
                setErrors({});
              }}
              className={cn(
                "h-12 rounded-control border text-body",
                role === choice.role
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-line bg-surface text-ink-2 hover:border-primary",
              )}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      <QualificationFields
        role={role}
        qualificationNumber={qualificationNumber}
        employmentReportConfirmed={employmentReportConfirmed}
        trainingConfirmed={trainingConfirmed}
        errors={errors}
        onChange={(patch) => {
          if (patch.qualificationNumber !== undefined)
            setQualificationNumber(patch.qualificationNumber);
          if (patch.employmentReportConfirmed !== undefined) {
            setEmploymentReportConfirmed(patch.employmentReportConfirmed);
          }
          if (patch.trainingConfirmed !== undefined) setTrainingConfirmed(patch.trainingConfirmed);
          setErrors({});
        }}
      />
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <ButtonRow>
        <Button variant="cancel" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          재신청
        </Button>
      </ButtonRow>
    </form>
  );
}

function InvitationAcceptForm({
  membership,
  onDone,
}: {
  membership: MembershipStatus;
  onDone: () => void;
}) {
  const role: MembershipRole = membership.role === "DEPUTY" ? "DEPUTY" : "AGENT";
  const [qualificationNumber, setQualificationNumber] = useState("");
  const [employmentReportConfirmed, setEmploymentReportConfirmed] = useState(false);
  const [trainingConfirmed, setTrainingConfirmed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<QualificationField>>({});
  const [formError, setFormError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      acceptInvitation(
        membership.membershipId,
        qualificationBody({
          role,
          qualificationNumber,
          employmentReportConfirmed,
          trainingConfirmed,
        }),
      ),
    onSuccess: onDone,
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      setErrors({
        qualificationNumber: mapped.qualificationNumber,
        employmentReportConfirmed: mapped.employmentReportConfirmed,
        trainingConfirmed: mapped.trainingConfirmed,
      });
      setFormError(describeOfficeError(caught, "초대를 수락하지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function submit() {
    setFormError(undefined);
    const problems = validateQualification({
      role,
      qualificationNumber,
      employmentReportConfirmed,
      trainingConfirmed,
    });
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    mutation.mutate();
  }

  return (
    <form
      noValidate
      aria-label="초대 수락"
      className="flex flex-col gap-4 rounded-control border border-line p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="text-body font-semibold text-ink">초대 수락</p>
      <MutedNote>초대로 들어와도 자격, 교육, 고용신고 확인은 다시 입력해야 합니다.</MutedNote>
      <MutedNote>{ROSTER_NOTICE_COPY.acceptDisclosure}</MutedNote>
      <QualificationFields
        role={role}
        qualificationNumber={qualificationNumber}
        employmentReportConfirmed={employmentReportConfirmed}
        trainingConfirmed={trainingConfirmed}
        errors={errors}
        onChange={(patch) => {
          if (patch.qualificationNumber !== undefined)
            setQualificationNumber(patch.qualificationNumber);
          if (patch.employmentReportConfirmed !== undefined) {
            setEmploymentReportConfirmed(patch.employmentReportConfirmed);
          }
          if (patch.trainingConfirmed !== undefined) setTrainingConfirmed(patch.trainingConfirmed);
          setErrors({});
        }}
      />
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          초대 수락
        </Button>
      </div>
    </form>
  );
}
