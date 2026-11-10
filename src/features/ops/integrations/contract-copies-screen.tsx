"use client";

import Link from "next/link";
import { useState } from "react";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { OpsScreen } from "../components/common/ops-screen";
import { DateTimePair, DraftNotice, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useContractCopies, useCreateContractCopy } from "./contract-copies-api";
import {
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KIND_OPTIONS,
  EMPTY_COPY_INPUT,
  STORAGE_KEY_MAX,
  VERSION_MAX,
  toCopyBody,
  validateCopy,
} from "./contract-copies-model";
import type { ContractCopy, CopyErrors, CopyInput } from "./contract-copies-model";

function CopyForm({
  integrationId,
  onDone,
}: {
  integrationId: number;
  onDone: (message: string) => void;
}) {
  const [input, setInput] = useState<CopyInput>(EMPTY_COPY_INPUT);
  const [errors, setErrors] = useState<CopyErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateContractCopy(integrationId);
  const set = (patch: Partial<CopyInput>) => setInput((current) => ({ ...current, ...patch }));

  async function submit() {
    const found = validateCopy(input);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      const created = await create.mutateAsync(toCopyBody(input));
      setInput(EMPTY_COPY_INPUT);
      onDone(`사본 ${created.copyId}(${created.versionLabel})를 등록했습니다.`);
    } catch (caught) {
      setServerError(describeSystemError(caught, "사본을 등록하지 못했습니다."));
    }
  }

  return (
    <Card title="사본 등록" tone="flat">
      <form
        noValidate
        aria-label="계약서 사본 등록"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-caption text-ink-2">
          파일은 비공개 저장소에 먼저 올린 뒤 그 객체의 저장 키와 해시만 등록합니다. 같은 연동에
          같은 종류와 버전을 다시 등록할 수 없습니다.
        </p>
        <SelectField
          label="문서 종류"
          required
          value={input.documentKind}
          options={DOCUMENT_KIND_OPTIONS}
          onValueChange={(documentKind) => set({ documentKind })}
          error={errors.documentKind}
        />
        <TextField
          label="버전 이름"
          required
          maxLength={VERSION_MAX}
          value={input.versionLabel}
          onValueChange={(versionLabel) => set({ versionLabel })}
          error={errors.versionLabel}
        />
        <div className="flex flex-wrap gap-3">
          <DateTimeField
            label="체결일"
            kind="date"
            value={input.signedOn}
            onValueChange={(signedOn) => set({ signedOn })}
          />
          <DateTimeField
            label="유효 종료일"
            kind="date"
            value={input.validUntil}
            onValueChange={(validUntil) => set({ validUntil })}
            error={errors.validUntil}
          />
        </div>
        <TextField
          label="저장 키"
          required
          maxLength={STORAGE_KEY_MAX}
          value={input.storageKey}
          onValueChange={(storageKey) => set({ storageKey })}
          error={errors.storageKey}
          hint="비공개 저장소의 객체 키입니다. 공개 링크는 만들지 않습니다."
        />
        <TextField
          label="사본 해시(SHA-256)"
          required
          value={input.contentSha256}
          onValueChange={(contentSha256) => set({ contentSha256 })}
          error={errors.contentSha256}
          hint="64자리 16진수입니다."
        />
        <DateTimePair
          label="재수탁자 변경 사전 고지 일시"
          date={input.notifiedDate}
          time={input.notifiedTime}
          onDateChange={(notifiedDate) => set({ notifiedDate })}
          onTimeChange={(notifiedTime) => set({ notifiedTime })}
          error={errors.notifiedDate}
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
        <div>
          <Button type="submit" variant="submit" isLoading={create.isPending}>
            사본 등록
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CopyList({ items }: { items: ContractCopy[] }) {
  if (items.length === 0) {
    return (
      <section
        role="alert"
        className="rounded-card-flat border border-line bg-surface px-6 py-8 text-center"
      >
        <p className="text-body font-semibold text-ink">이 연동에 등록된 계약서 사본이 없습니다</p>
        <p className="mt-1 text-caption text-ink-2">
          공급자 계약 체결 뒤 사본의 저장 키와 해시를 등록해 주세요.
        </p>
      </section>
    );
  }
  return (
    <div className="overflow-x-auto rounded-card-flat border border-line bg-white">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">계약서 사본 목록</caption>
        <thead>
          <tr className="text-caption text-ink-2">
            {["종류", "버전", "체결일", "유효 종료일", "해시", "재수탁자 고지", "등록 시각"].map(
              (header) => (
                <th key={header} scope="col" className="border-b border-line bg-surface px-4 py-3">
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.copyId} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3">
                {DOCUMENT_KIND_LABELS[row.documentKind] ?? row.documentKind}
              </td>
              <td className="px-4 py-3">{row.versionLabel}</td>
              <td className="px-4 py-3">{row.signedOn ? formatSeoulDate(row.signedOn) : "-"}</td>
              <td className="px-4 py-3">
                {row.validUntil ? formatSeoulDate(row.validUntil) : "-"}
              </td>
              <td className="break-all px-4 py-3 font-mono text-caption">{row.contentSha256}</td>
              <td className="px-4 py-3">
                {row.subprocessorChangeNotifiedAt
                  ? formatSeoulDateTime(row.subprocessorChangeNotifiedAt)
                  : "-"}
              </td>
              <td className="px-4 py-3">{formatSeoulDateTime(row.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopiesBody({ integrationId }: { integrationId: number }) {
  const query = useContractCopies(integrationId);
  const [feedback, setFeedback] = useState<string | null>(null);
  return (
    <>
      <p className="text-caption text-ink-2">
        사본 파일의 공개 링크는 두지 않습니다. 저장 위치는 목록에 표시하지 않고 해시로 사본의
        동일성만 확인합니다.
      </p>
      <DraftNotice extra="출시 후 확장 기능입니다." />
      {feedback ? <FormMessage tone="success">{feedback}</FormMessage> : null}
      <QueryGate query={query} loadingLabel="계약서 사본을 불러오는 중입니다">
        {(data) => <CopyList items={data.items} />}
      </QueryGate>
      <CopyForm integrationId={integrationId} onDone={setFeedback} />
    </>
  );
}

export function ContractCopiesScreen({ integrationId }: { integrationId: number }) {
  return (
    <OpsScreen
      title="공급자 계약서 사본"
      description={`연동 ${integrationId}의 공급자 계약서와 처리 조건 사본을 보관합니다.`}
      roles={["PRIVACY"]}
      actions={
        <Link href="/ops/integrations" className="text-body font-semibold text-primary underline">
          연동 목록으로
        </Link>
      }
    >
      <CopiesBody integrationId={integrationId} />
    </OpsScreen>
  );
}
