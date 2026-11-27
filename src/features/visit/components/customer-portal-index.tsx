"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { fetchCustomerPortalIndex, logoutCustomerPortalIndex } from "../api/follow.api";
import { statusLabel, statusTone } from "../model/labels";

const QUERY_KEY = ["customer-visit-portal-index"] as const;

/** A bookmarked overview; responses are still submitted on their individual secure links. */
export function CustomerPortalIndex() {
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCustomerPortalIndex,
    retry: false,
  });
  const leave = useMutation({
    mutationFn: logoutCustomerPortalIndex,
    onSuccess: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: QUERY_KEY }),
        queryClient.cancelQueries({ queryKey: ["customer-visit-portal"] }),
      ]);
      queryClient.setQueryData(QUERY_KEY, { available: false, verified: false, items: [] });
      queryClient.setQueriesData(
        { queryKey: ["customer-visit-portal"] },
        { available: true, verified: false, items: [] },
      );
    },
  });

  if (requests.isPending) return <PageSkeleton />;
  if (requests.isError) {
    return (
      <FormAlert>
        방문 요청을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        <Button variant="ghost" size="sm" onClick={() => requests.refetch()}>
          다시 시도
        </Button>
      </FormAlert>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="customer-portal-title">
      <div className="space-y-2">
        <h1 id="customer-portal-title" className="text-h1 font-bold text-ink">
          내 방문 요청
        </h1>
        <p className="text-caption text-ink-2">
          같은 사무소에서 받은 방문 요청을 한곳에서 확인할 수 있습니다.
        </p>
      </div>
      {!requests.data.verified ? (
        <div className="rounded-card border border-line bg-white p-5 text-caption text-ink-2">
          방문 요청 링크에서 이메일 인증을 완료하면 이 기기에서 요청 목록을 볼 수 있습니다. 다른
          기기에서는 다시 인증해 주세요.
        </div>
      ) : (
        <>
          <div className="rounded-card border border-line bg-white p-5">
            {requests.data.items.length === 0 ? (
              <p className="text-caption text-ink-2">현재 확인할 방문 요청이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-line" aria-label="내 방문 요청 목록">
                {requests.data.items.map((item) => (
                  <li
                    key={item.coordinationId}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-body font-semibold text-ink">
                        방문 요청 #{item.coordinationId}
                      </p>
                      <p className="text-caption text-ink-2">
                        {item.periodStartDate} ~ {item.periodEndDate}
                      </p>
                    </div>
                    <Badge tone={statusTone(item.status)} className="h-8 min-w-0 px-3 text-caption">
                      {statusLabel(item.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-caption text-ink-2">
            새 방문 요청의 시간 확인·수정은 사무소에서 전달한 해당 요청 링크에서 진행해 주세요.
          </p>
          <Button
            variant="ghost"
            size="sm"
            isLoading={leave.isPending}
            onClick={() => leave.mutate()}
          >
            이 기기에서 보기 종료
          </Button>
          {leave.isError ? <FormAlert>종료하지 못했습니다. 다시 시도해 주세요.</FormAlert> : null}
        </>
      )}
    </section>
  );
}
