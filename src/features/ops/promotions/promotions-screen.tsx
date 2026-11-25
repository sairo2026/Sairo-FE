"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { fetchOfficeDetail } from "../offices/api/ops-offices-api";
import { BillingNav } from "../billing/billing-nav";
import { OpsScreen } from "../components/common/ops-screen";
import { FailureNotice, SuccessNotice } from "../content-common/notice-banner";
import { usePromotionActions, usePromotionCampaigns, usePromotionGrants } from "./promotion-api";

function seoulOffset(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+09:00` : null;
}

export function OpsPromotionsScreen() {
  const campaigns = usePromotionCampaigns();
  const grants = usePromotionGrants();
  const actions = usePromotionActions();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [months, setMonths] = useState("1");
  const [maximum, setMaximum] = useState("");
  const [officeText, setOfficeText] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [reconcileGrant, setReconcileGrant] = useState<{
    id: number;
    officeId: number;
    nextPeriodStart: string;
  } | null>(null);
  const [historicalMembers, setHistoricalMembers] = useState("");
  const [reconciliationReason, setReconciliationReason] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const officeId = /^\d+$/.test(officeText) ? Number(officeText) : null;
  const office = useQuery({
    queryKey: ["ops", "promotion-office-preview", officeId],
    queryFn: () => {
      if (officeId === null) throw new Error("사무소 번호가 필요합니다.");
      return fetchOfficeDetail(officeId);
    },
    enabled: selectedCampaign !== null && officeId !== null && officeId > 0,
    retry: false,
  });

  async function act(work: () => Promise<unknown>, message: string) {
    setFailure(null);
    setSuccess(null);
    try {
      await work();
      setSuccess(message);
    } catch {
      setFailure("처리하지 못했습니다. 운영자 권한과 재인증 상태를 확인한 뒤 다시 시도해 주세요.");
    }
  }

  async function create() {
    const start = seoulOffset(starts);
    const end = seoulOffset(ends);
    const count = Number(months);
    const cap = maximum.trim() ? Number(maximum) : null;
    if (
      !name.trim() ||
      !/^[A-Z0-9_-]{4,40}$/.test(code) ||
      !start ||
      !end ||
      new Date(start) >= new Date(end) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 120 ||
      (cap !== null && (!Number.isInteger(cap) || cap < 1))
    ) {
      setFailure("이름, 대문자 코드, 적용 기간, 무료 개월 수를 확인해 주세요.");
      return;
    }
    await act(
      () =>
        actions.create.mutateAsync({
          name: name.trim(),
          code,
          applicationStartsAt: start,
          applicationEndsAt: end,
          freeMonths: count,
          maxOffices: cap,
        }),
      "초안이 생성되었습니다. 다른 결제 담당 운영자의 재인증 승인이 있어야 활성화됩니다.",
    );
  }

  const busy = Object.values(actions).some((action) => action.isPending);

  return (
    <OpsScreen
      title="무료 프로모션"
      description="0원 내부 이용기간을 관리합니다. Toss 카드 승인은 생성되지 않습니다."
      roles={["BILLING"]}
    >
      <BillingNav current="promotions" />
      <FailureNotice message={failure} />
      <SuccessNotice message={success} />
      <Card title="캠페인 초안 만들기">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="캠페인 이름" value={name} onValueChange={setName} />
          <TextField label="코드 (대문자·숫자)" value={code} onValueChange={setCode} />
          <label className="flex flex-col gap-1 text-body">
            적용 시작 (한국시간)
            <input
              className="rounded border border-line p-2"
              type="datetime-local"
              value={starts}
              onChange={(event) => setStarts(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-body">
            적용 종료 (한국시간)
            <input
              className="rounded border border-line p-2"
              type="datetime-local"
              value={ends}
              onChange={(event) => setEnds(event.target.value)}
            />
          </label>
          <TextField
            label="무료 개월 수 (1~120)"
            kind="number"
            value={months}
            onValueChange={setMonths}
          />
          <TextField
            label="최대 사무소 수 (비워 두면 제한 없음)"
            kind="number"
            value={maximum}
            onValueChange={setMaximum}
          />
        </div>
        <div className="mt-4">
          <Button disabled={busy} onClick={() => void create()}>
            초안 생성
          </Button>
        </div>
      </Card>
      <Card title="캠페인 (최근 100건)">
        {campaigns.isPending ? <p>캠페인을 불러오는 중입니다.</p> : null}
        {campaigns.isError ? <p role="alert">캠페인을 불러오지 못했습니다.</p> : null}
        {campaigns.data?.length === 0 ? (
          <p className="text-body text-ink-2">등록된 캠페인이 없습니다.</p>
        ) : null}
        <ul className="flex flex-col divide-y divide-line">
          {campaigns.data?.map((campaign) => (
            <li
              key={campaign.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 text-body"
            >
              <div>
                <p className="font-semibold">
                  {campaign.name} · {campaign.code}
                </p>
                <p className="text-ink-2">
                  {campaign.status} · {campaign.freeMonths}개월 ·{" "}
                  {formatSeoulDateTime(campaign.startsAt)} ~ {formatSeoulDateTime(campaign.endsAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {campaign.status === "DRAFT" ? (
                  <Button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "작성자가 아닌 다른 결제 담당 운영자로 재인증한 뒤 이 캠페인을 활성화합니까?",
                        )
                      )
                        void act(
                          () => actions.activate.mutateAsync(campaign.id),
                          "캠페인이 활성화되었습니다.",
                        );
                    }}
                  >
                    승인·활성화
                  </Button>
                ) : null}
                {campaign.status === "ACTIVE" ? (
                  <>
                    <Button
                      variant="outlined"
                      disabled={busy}
                      onClick={() => setSelectedCampaign(campaign.id)}
                    >
                      사무소 지급
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "새 지급만 중단합니다. 이미 지급된 무료기간은 유지됩니다. 계속합니까?",
                          )
                        )
                          void act(
                            () => actions.end.mutateAsync(campaign.id),
                            "신규 지급이 중단되었습니다.",
                          );
                      }}
                    >
                      신규 지급 종료
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {selectedCampaign !== null ? (
        <Card title="사무소별 무료기간 지급">
          <p className="mb-3 text-body text-ink-2">
            현재 유료 청구가 없는 결제 전 사무소에만 지급할 수 있습니다. 지급 후 첫 무료기간이 즉시
            시작됩니다.
          </p>
          <TextField
            label="사무소 번호"
            kind="number"
            value={officeText}
            onValueChange={setOfficeText}
          />
          {office.isPending && officeId ? <p className="mt-2">사무소 확인 중입니다.</p> : null}
          {office.isError ? (
            <p role="alert" className="mt-2 text-danger">
              사무소를 확인할 수 없습니다.
            </p>
          ) : null}
          {office.data ? (
            <p className="mt-2 font-semibold">
              확인된 사무소: {office.data.name} (#{office.data.officeId}) ·{" "}
              {office.data.registrationStatus}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button
              disabled={!office.data || busy}
              onClick={() => {
                if (
                  office.data &&
                  window.confirm(
                    `${office.data.name} (#${office.data.officeId})에 무료 프로모션을 지급합니까?`,
                  )
                )
                  void act(
                    () =>
                      actions.grant.mutateAsync({
                        campaignId: selectedCampaign,
                        officeId: office.data.officeId,
                      }),
                    "무료기간이 지급되었습니다.",
                  );
              }}
            >
              확인 후 지급
            </Button>
            <Button variant="ghost" onClick={() => setSelectedCampaign(null)}>
              닫기
            </Button>
          </div>
        </Card>
      ) : null}
      {reconcileGrant ? (
        <Card title="누락된 무료 이용기간 대사">
          <p className="mb-3 text-body text-ink-2">
            사무소 #{reconcileGrant.officeId} · 시작{" "}
            {formatSeoulDateTime(reconcileGrant.nextPeriodStart)}. 당시 과금 대상 인원을 근거 자료로
            확인한 뒤 한 기간씩 기록합니다. 카드 청구는 실행하지 않습니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="당시 과금 대상 인원"
              kind="number"
              value={historicalMembers}
              onValueChange={setHistoricalMembers}
            />
            <TextField
              label="확인 근거와 사유 (10자 이상)"
              value={reconciliationReason}
              onValueChange={setReconciliationReason}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              disabled={busy}
              onClick={() => {
                const count = Number(historicalMembers);
                if (
                  !/^\d+$/.test(historicalMembers) ||
                  !Number.isSafeInteger(count) ||
                  count < 1 ||
                  reconciliationReason.trim().length < 10
                ) {
                  setFailure("당시 인원과 10자 이상의 확인 사유를 입력해 주세요.");
                  return;
                }
                if (
                  window.confirm(
                    `사무소 #${reconcileGrant.officeId}의 누락 기간을 당시 인원 ${count}명으로 기록합니까?`,
                  )
                ) {
                  void act(
                    () =>
                      actions.reconcilePeriod.mutateAsync({
                        id: reconcileGrant.id,
                        historicalMembers: count,
                        reason: reconciliationReason.trim(),
                      }),
                    "누락 기간을 기록했습니다. 다음 기간이 남았는지 다시 확인해 주세요.",
                  );
                }
              }}
            >
              한 기간 기록
            </Button>
            <Button variant="ghost" onClick={() => setReconcileGrant(null)}>
              닫기
            </Button>
          </div>
        </Card>
      ) : null}
      <Card title="지급 내역 (최근 100건)">
        {grants.isPending ? <p>지급 내역을 불러오는 중입니다.</p> : null}
        {grants.isError ? <p role="alert">지급 내역을 불러오지 못했습니다.</p> : null}
        {grants.data?.length === 0 ? (
          <p className="text-body text-ink-2">지급 내역이 없습니다.</p>
        ) : null}
        <ul className="flex flex-col divide-y divide-line">
          {grants.data?.map((grant) => (
            <li
              key={grant.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-body"
            >
              <span>
                #{grant.id} · 사무소 #{grant.officeId} · {grant.status} · 무료 종료{" "}
                {formatSeoulDateTime(grant.freeEndsAt)}
              </span>
              {grant.status === "ACTIVE" ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `사무소 #${grant.officeId}의 무료 사용을 즉시 종료합니다. 기존 기록은 보존됩니다. 계속합니까?`,
                      )
                    )
                      void act(
                        () => actions.revoke.mutateAsync(grant.id),
                        "무료 지급이 회수되었습니다.",
                      );
                  }}
                >
                  즉시 회수
                </Button>
              ) : null}
              {grant.status === "RECONCILIATION_REQUIRED" ? (
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => {
                    setReconcileGrant({
                      id: grant.id,
                      officeId: grant.officeId,
                      nextPeriodStart: grant.nextPeriodStart,
                    });
                    setHistoricalMembers("");
                    setReconciliationReason("");
                  }}
                >
                  기간 대사
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </OpsScreen>
  );
}
