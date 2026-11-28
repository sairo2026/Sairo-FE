"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/select-field";
import {
  deleteCustomerPreference,
  fetchCustomerPreference,
  saveCustomerPreference,
} from "../api/follow.api";
import type { CustomerPreference, CustomerPreferenceInput } from "../api/follow.api";
import { isApiCode } from "../model/messages";

export const CUSTOMER_PREFERENCE_QUERY_KEY = ["customer-visit-preference"] as const;
const PREFERENCE_DISCLOSURE_VERSION = "1.0";

const WEEKDAYS = [
  ["MONDAY", "월"],
  ["TUESDAY", "화"],
  ["WEDNESDAY", "수"],
  ["THURSDAY", "목"],
  ["FRIDAY", "금"],
  ["SATURDAY", "토"],
  ["SUNDAY", "일"],
] as const;

function PreferenceForm({
  preference,
  onSaved,
  onDeleted,
  onReload,
}: {
  preference: CustomerPreference;
  onSaved: (value: CustomerPreference) => void;
  onDeleted: (value: CustomerPreference) => void;
  onReload: () => void;
}) {
  const [days, setDays] = useState<CustomerPreference["preferredWeekdays"]>(
    preference.preferredWeekdays,
  );
  const [start, setStart] = useState(preference.preferredStartTime?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(preference.preferredEndTime?.slice(0, 5) ?? "");
  const [error, setError] = useState("");
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useMutation({
    mutationFn: saveCustomerPreference,
    onSuccess: onSaved,
  });
  const remove = useMutation({
    mutationFn: () => deleteCustomerPreference(preference.version, preference.sessionBinding),
    onSuccess: onDeleted,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (Boolean(start) !== Boolean(end) || (start && end && start >= end)) {
      setError("시작과 종료 시간을 함께 입력하고, 종료 시간을 더 늦게 설정해 주세요.");
      return;
    }
    if (days.length === 0 && !start) {
      setError("기본 선호 요일이나 시간을 선택해 주세요.");
      return;
    }
    if (!noticeAcknowledged) {
      setError("기본 방문 선호 저장 안내를 확인해 주세요.");
      return;
    }
    if (preference.preferenceDisclosureVersion !== PREFERENCE_DISCLOSURE_VERSION) {
      setError("저장 안내가 바뀌었습니다. 화면을 다시 열어 확인해 주세요.");
      return;
    }
    const input: CustomerPreferenceInput = {
      expectedVersion: preference.version,
      acknowledgedNoticeVersion: preference.noticeVersion,
      acknowledgedPreferenceDisclosureVersion: PREFERENCE_DISCLOSURE_VERSION,
      sessionBinding: preference.sessionBinding,
      preferredWeekdays: days,
      preferredStartTime: start ? `${start}:00` : null,
      preferredEndTime: end ? `${end}:00` : null,
    };
    save.mutate(input);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-body font-semibold text-ink">선호 요일</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {WEEKDAYS.map(([value, label]) => (
            <Checkbox
              key={value}
              label={`${label}요일`}
              checked={days.includes(value)}
              onCheckedChange={(checked) =>
                setDays((current) =>
                  checked ? [...current, value] : current.filter((day) => day !== value),
                )
              }
              disabled={save.isPending || remove.isPending}
            />
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-body font-semibold text-ink">
          선호 시작 시간
          <input
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            disabled={save.isPending || remove.isPending}
            className="block h-[58px] w-full rounded-control border border-line bg-surface px-5 font-medium focus:border-primary focus:bg-white focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </label>
        <label className="space-y-2 text-body font-semibold text-ink">
          선호 종료 시간
          <input
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            disabled={save.isPending || remove.isPending}
            className="block h-[58px] w-full rounded-control border border-line bg-surface px-5 font-medium focus:border-primary focus:bg-white focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </label>
      </div>
      <Checkbox
        label="기본 방문 선호 저장 안내를 확인했습니다. (필수)"
        checked={noticeAcknowledged}
        onCheckedChange={setNoticeAcknowledged}
        disabled={save.isPending || remove.isPending}
      />
      {error ? <FormAlert>{error}</FormAlert> : null}
      {save.isError ? (
        <FormAlert>
          {isApiCode(save.error, "NOTICE_VERSION_CHANGED")
            ? "저장 안내가 바뀌었습니다. 안내를 다시 확인해 주세요."
            : "선호를 저장하지 못했습니다. 다른 기기에서 변경했다면 새로고침 후 다시 확인해 주세요."}
          <Button variant="ghost" size="sm" onClick={onReload}>
            안내 다시 불러오기
          </Button>
        </FormAlert>
      ) : null}
      {remove.isError ? (
        <FormAlert>선호를 삭제하지 못했습니다. 다시 시도해 주세요.</FormAlert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" isLoading={save.isPending} disabled={remove.isPending}>
          선호 저장
        </Button>
        {preference.exists && !confirmDelete ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            저장한 선호 삭제
          </Button>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="rounded-control border border-line bg-surface p-4">
          <p className="text-caption text-ink-2">
            선호 요일·시간 값은 즉시 삭제합니다. 변경 기록은 보관 기한까지 유지되며, 이미 제출한
            가능한 시간과 확정 방문은 유지됩니다.
          </p>
          <div className="mt-3 flex gap-3">
            <Button
              variant="outlined"
              size="sm"
              isLoading={remove.isPending}
              disabled={save.isPending}
              onClick={() => remove.mutate()}
            >
              삭제하기
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function CustomerPortalPreferences() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const preference = useQuery({
    queryKey: CUSTOMER_PREFERENCE_QUERY_KEY,
    queryFn: fetchCustomerPreference,
    retry: false,
  });

  return (
    <section
      className="space-y-4 rounded-card border border-line bg-white p-5"
      aria-labelledby="visit-preference-title"
    >
      <div className="space-y-1">
        <h2 id="visit-preference-title" className="text-h3 font-bold text-ink">
          기본 방문 선호
        </h2>
        <p className="text-caption text-ink-2">
          선호 요일·시간을 같은 사무소의 다음 방문 요청에 참고하도록 저장합니다. 날짜별 가능 시간은
          요청마다 확인합니다.
        </p>
        {preference.data?.retentionUntil ? (
          <p className="text-caption text-ink-2">보관 기한: {preference.data.retentionUntil}</p>
        ) : null}
      </div>
      <p className="text-caption text-ink-2">
        {preference.data?.preferenceDisclosureText.split("\n").map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        방문 링크의 일반 개인정보 처리{" "}
        <Link
          href="/legal/link-notice/customer"
          className="font-semibold text-primary underline clickable-link"
        >
          자세히 보기
        </Link>
      </p>
      {preference.isPending ? (
        <p className="text-caption text-ink-2" role="status">
          선호를 불러오는 중입니다.
        </p>
      ) : preference.isError ? (
        <FormAlert>
          기본 선호를 불러오지 못했습니다.
          <Button variant="ghost" size="sm" onClick={() => preference.refetch()}>
            다시 시도
          </Button>
        </FormAlert>
      ) : (
        <PreferenceForm
          key={JSON.stringify([
            preference.data.sessionBinding,
            preference.data.noticeVersion,
            preference.data.preferenceDisclosureVersion,
            preference.data.preferenceDisclosureText,
            preference.data.version,
            preference.data.confirmedAt,
          ])}
          preference={preference.data}
          onSaved={(value) => {
            queryClient.setQueriesData({ queryKey: CUSTOMER_PREFERENCE_QUERY_KEY }, value);
            setMessage("기본 선호를 저장했습니다.");
            statusRef.current?.focus();
          }}
          onDeleted={(value) => {
            queryClient.setQueriesData({ queryKey: CUSTOMER_PREFERENCE_QUERY_KEY }, value);
            setMessage("기본 선호를 삭제했습니다.");
            statusRef.current?.focus();
          }}
          onReload={() => {
            setMessage("");
            preference.refetch();
          }}
        />
      )}
      <p ref={statusRef} className="text-caption text-primary" role="status" tabIndex={-1}>
        {message}
      </p>
    </section>
  );
}
