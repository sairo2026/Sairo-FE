"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import type { OpsHomeResponse } from "@/lib/api/contracts/ops.schema";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { formatCount, formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import { useNow } from "../../auth/model/use-now";
import { OpsScreen } from "../../components/common/ops-screen";
import { useHasOpsRole, useOpsSession } from "../../model/ops-session";
import { hasAnyRole } from "../../model/roles";
import {
  fetchOpsHome,
  fetchPendingPriceNoticesForHome,
  fetchTrialEventsForHome,
  opsHomeKeys,
} from "../api/ops-home-api";
import {
  HOME_QUEUE_CARDS,
  countOverdueIncreaseNotices,
  judgeTrialWindow,
} from "../model/home-cards";
import type { HomeQueueCard } from "../model/home-cards";

function QueueCard({ card, home }: { card: HomeQueueCard; home: OpsHomeResponse }) {
  const { roles } = useOpsSession();
  const isLinked = hasAnyRole(roles, card.roles);
  const count = card.count(home);
  const note = card.note?.(home) ?? null;
  const tone = card.isUrgent && count > 0 ? "text-danger" : "text-ink";
  const body = (
    <>
      <p className="text-caption font-semibold text-ink-2">{card.label}</p>
      <p className={`mt-2 text-h1 font-bold ${tone}`}>{formatCount(count)}건</p>
      {note ? <p className="mt-1 text-caption text-ink-2">{note}</p> : null}
      {isLinked ? (
        <p className="mt-3 text-caption font-semibold text-primary">처리 화면으로 이동</p>
      ) : (
        <p className="mt-3 text-caption text-ink-3">읽기 전용 (처리 권한 없음)</p>
      )}
    </>
  );
  return (
    <li aria-label={card.label}>
      {isLinked ? (
        <Link
          href={card.href}
          className="block rounded-card-flat border border-line bg-white p-5 hover:border-primary"
        >
          {body}
        </Link>
      ) : (
        <div className="rounded-card-flat border border-line bg-surface p-5">{body}</div>
      )}
    </li>
  );
}

function ExecSummaryCard({ summary }: { summary: NonNullable<OpsHomeResponse["execSummary"]> }) {
  const counts = [
    ["체험 사무소", summary.trialOfficeCount],
    ["유료 정상 사무소", summary.activeOfficeCount],
    ["미납 사무소", summary.pastDueOfficeCount],
    ["종료 사무소", summary.endedOfficeCount],
  ] as const;
  return (
    <Card title="경영 지표" tone="flat" aria-label="경영 지표">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {counts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-caption font-semibold text-ink-2">{label}</dt>
            <dd className="mt-1 text-h2 font-bold text-ink">{formatCount(value)}곳</dd>
          </div>
        ))}
        <div>
          <dt className="text-caption font-semibold text-ink-2">당월 순수납</dt>
          <dd className="mt-1 text-h2 font-bold text-ink">
            {formatKrw(summary.netCollectedAmount)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-caption text-ink-2">
        기준 시각 {formatSeoulDateTime(summary.asOf)}. 순수납은 한국 시간 기준 당월 1일 00:00부터 이
        시각까지 수납 승인액에서 환불 완료액을 뺀 누계입니다.
      </p>
    </Card>
  );
}

function TrialWarningCard() {
  const query = useQuery({ queryKey: opsHomeKeys.trialEvents, queryFn: fetchTrialEventsForHome });
  const now = useNow(60_000);
  const status = useMemo(
    () => (query.data ? judgeTrialWindow(query.data.items, now) : null),
    [query.data, now],
  );
  return (
    <Card title="일반 체험 이벤트" tone="flat" aria-label="일반 체험 이벤트 점검">
      {query.isPending ? <p className="text-body text-ink-2">확인하는 중입니다.</p> : null}
      {query.isError ? (
        <div className="flex items-center gap-3">
          <p role="alert" className="text-body text-danger">
            체험 이벤트를 불러오지 못했습니다.
          </p>
          <Button size="sm" variant="outlined" onClick={() => void query.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : null}
      {status?.kind === "none" ? (
        <p role="alert" className="text-body text-danger">
          활성 상태인 일반 체험 이벤트가 없습니다. 신규 가입 사무소에 무료 체험이 부여되지 않습니다.
        </p>
      ) : null}
      {status?.kind === "ending" ? (
        <p role="alert" className="text-body text-danger">
          {status.daysLeft > 0
            ? `「${status.name}」의 가입 창이 ${status.daysLeft}일 뒤(${formatSeoulDateTime(status.endsAt)}) 종료됩니다.`
            : `「${status.name}」의 가입 창이 종료되었습니다.`}{" "}
          다음 이벤트를 준비해 주세요.
        </p>
      ) : null}
      {status?.kind === "ok" ? (
        <p className="text-body text-ink-2">
          활성 일반 체험 이벤트의 가입 창이 60일 넘게 남아 있습니다.
        </p>
      ) : null}
    </Card>
  );
}

function PriceNoticeCard() {
  const query = useQuery({
    queryKey: opsHomeKeys.priceNotices,
    queryFn: fetchPendingPriceNoticesForHome,
  });
  const now = useNow(60_000);
  const count = useMemo(
    () => (query.data ? countOverdueIncreaseNotices(query.data.items, now) : null),
    [query.data, now],
  );
  const isTruncated = query.data ? query.data.totalElements > query.data.items.length : false;
  return (
    <Card title="인상 가격 변경 안내" tone="flat" aria-label="인상 가격 변경 안내 점검">
      {query.isPending ? <p className="text-body text-ink-2">확인하는 중입니다.</p> : null}
      {query.isError ? (
        <div className="flex items-center gap-3">
          <p role="alert" className="text-body text-danger">
            가격 변경 안내를 불러오지 못했습니다.
          </p>
          <Button size="sm" variant="outlined" onClick={() => void query.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : null}
      {count !== null ? (
        <>
          <p className={`text-h2 font-bold ${count > 0 ? "text-danger" : "text-ink"}`}>
            응답 기한이 지난 안내 {count}건{isTruncated ? " 이상" : ""}
          </p>
          <p className="mt-1 text-caption text-ink-2">
            인상 안내 가운데 응답 기한이 지났지만 아직 응답이 없는 건수입니다.
          </p>
        </>
      ) : null}
    </Card>
  );
}

function HomeBody({ home }: { home: OpsHomeResponse }) {
  const canSeeTrial = useHasOpsRole(["OPS"]);
  const canSeePrice = useHasOpsRole(["BILLING"]);
  return (
    <>
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="처리 대기 큐"
      >
        {HOME_QUEUE_CARDS.map((card) => (
          <QueueCard key={card.key} card={card} home={home} />
        ))}
      </ul>
      {home.execSummary ? <ExecSummaryCard summary={home.execSummary} /> : null}
      {canSeeTrial || canSeePrice ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {canSeeTrial ? <TrialWarningCard /> : null}
          {canSeePrice ? <PriceNoticeCard /> : null}
        </div>
      ) : null}
    </>
  );
}

export function OpsHomeScreen() {
  const query = useQuery({ queryKey: opsHomeKeys.home, queryFn: fetchOpsHome });
  return (
    <OpsScreen title="운영 홈" description="처리해야 할 일을 큐별로 모아 봅니다." roles={[]}>
      <QueryGate query={query} loadingLabel="운영 현황을 불러오는 중입니다.">
        {(home) => <HomeBody home={home} />}
      </QueryGate>
    </OpsScreen>
  );
}
