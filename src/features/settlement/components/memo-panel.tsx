"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { MonthlyMemoResponse } from "@/lib/api/contracts/work.schema";
import { describeWorkError } from "@/features/home/model/messages";
import { ApiError } from "@/shared/api/client";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { formatSeoulDateTime, countCodePoints } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { fetchMemo, saveMemo } from "../api/settlement.api";
import { settlementKeys, useMonthlyMemo } from "../hooks/settlement-queries";

export const MEMO_LIMIT = 2000;

type Conflict = { mine: string; latest: MonthlyMemoResponse };

function editorName(memo: MonthlyMemoResponse): string {
  if (!memo.updatedByMemberName) return "작성 기록 없음";
  const at = memo.updatedAt ? ` · ${formatSeoulDateTime(memo.updatedAt)}` : "";
  return `${memo.updatedByMemberName}${at}`;
}

function MemoEditor({ yearMonth, memo }: { yearMonth: string; memo: MonthlyMemoResponse }) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [text, setText] = useState(memo.content ?? "");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const save = useMutation({
    mutationFn: (input: { content: string; version: number }) =>
      saveMemo(yearMonth, input.version, input.content),
    onSuccess: async (saved) => {
      setConflict(null);
      setError(undefined);
      setNotice("메모를 저장했습니다.");
      setText(saved.content ?? "");
      await queryClient.invalidateQueries({ queryKey: settlementKeys.memo(yearMonth) });
    },
    onError: async (failure, variables) => {
      setNotice(undefined);
      if (failure instanceof ApiError && failure.code === "VERSION_CONFLICT") {
        try {
          const latest = await fetchMemo(yearMonth);
          setConflict({ mine: variables.content, latest });
          setError(undefined);
          return;
        } catch (reload) {
          setError(describeWorkError(reload, "최신 메모를 불러오지 못했습니다."));
          return;
        }
      }
      setError(describeWorkError(failure, "메모를 저장하지 못했습니다."));
    },
  });

  function submit() {
    if (countCodePoints(text) > MEMO_LIMIT) {
      setError(`메모는 ${MEMO_LIMIT}자까지 입력할 수 있습니다.`);
      return;
    }
    setError(undefined);
    setNotice(undefined);
    save.mutate({ content: text, version: memo.version });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-ink-2">마지막 수정: {editorName(memo)}</p>
      <label htmlFor="settlement-memo" className="sr-only">
        월간 메모
      </label>
      <textarea
        id="settlement-memo"
        value={text}
        rows={5}
        disabled={isReadOnly}
        onChange={(event) => {
          setText(event.target.value);
          setError(undefined);
        }}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-control border border-line px-4 py-3 text-body text-ink focus:border-primary"
      />
      <div className="flex items-center justify-between text-caption text-ink-3">
        <span>
          {countCodePoints(text)} / {MEMO_LIMIT}자
        </span>
        <Button onClick={submit} isLoading={save.isPending} disabled={isReadOnly}>
          메모 저장
        </Button>
      </div>
      {error ? <FormAlert>{error}</FormAlert> : null}
      {notice ? (
        <p role="status" className="text-caption font-semibold text-primary">
          {notice}
        </p>
      ) : null}
      {conflict ? (
        <div
          role="alertdialog"
          aria-label="메모 충돌"
          className="rounded-card-flat border border-primary p-4"
        >
          <p className="mb-3 font-semibold text-ink">
            저장하는 동안 다른 사람이 먼저 메모를 고쳤습니다. 내 입력과 최신 메모를 비교해 고르세요.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold text-ink-2">내 입력</p>
              <p className="whitespace-pre-wrap rounded-control bg-surface p-3 text-body">
                {conflict.mine === "" ? "(비어 있음)" : conflict.mine}
              </p>
            </div>
            <div>
              <p className="text-caption font-semibold text-ink-2">
                최신 메모 ({editorName(conflict.latest)})
              </p>
              <p className="whitespace-pre-wrap rounded-control bg-surface p-3 text-body">
                {conflict.latest.content ? conflict.latest.content : "(비어 있음)"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="cancel"
              onClick={() => {
                setText(conflict.latest.content ?? "");
                setConflict(null);
                void queryClient.invalidateQueries({ queryKey: settlementKeys.memo(yearMonth) });
              }}
            >
              최신 내용 사용
            </Button>
            <Button
              isLoading={save.isPending}
              onClick={() =>
                save.mutate({ content: conflict.mine, version: conflict.latest.version })
              }
            >
              내 입력으로 덮어쓰기
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MemoPanel({ yearMonth }: { yearMonth: string }) {
  const query = useMonthlyMemo(yearMonth);
  return (
    <section
      aria-labelledby="memo-title"
      className="rounded-card border border-line bg-white px-7 py-6"
    >
      <h2 id="memo-title" className="mb-4 text-h2 font-semibold text-ink">
        월간 메모
      </h2>
      <QueryGate query={query} loadingLabel="메모를 불러오는 중입니다.">
        {(memo) => <MemoEditor key={yearMonth} yearMonth={yearMonth} memo={memo} />}
      </QueryGate>
    </section>
  );
}
