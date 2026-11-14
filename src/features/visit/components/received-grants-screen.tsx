"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SearchField } from "@/shared/components/ui/search-field";
import { SelectField } from "@/shared/components/ui/select-field";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { addCandidate, fetchCoordination } from "../api/visit.api";
import { useCoordinationList, useReceivedGrants, visitKeys } from "../hooks/visit-queries";
import { MAX_CANDIDATES, labelOf, statusLabel } from "../model/labels";
import { describeVisitError } from "../model/messages";
import { GRANT_SCOPE_LABEL } from "../model/request-labels";

const OPEN_STATUSES = [
  "TIME_COLLECTING",
  "COORDINATABLE",
  "FINAL_CONFIRMATION_REQUIRED",
  "APPLYING",
  "RESCHEDULE_REQUIRED",
];

export function ReceivedGrantsScreen() {
  const { role, isReadOnly } = useOfficeAccess();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [coordinationId, setCoordinationId] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const grants = useReceivedGrants(keyword);
  const coordinations = useCoordinationList({ page: 0, size: 100 });
  const target = useQuery({
    queryKey: visitKeys.detail(Number(coordinationId)),
    queryFn: () => fetchCoordination(Number(coordinationId)),
    enabled: coordinationId !== "",
  });
  const add = useMutation({
    mutationFn: (propertyId: number) => addCandidate(Number(coordinationId), { propertyId }),
    onSuccess: async () => {
      setError(undefined);
      setNotice("후보 매물로 담았습니다.");
      await queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
    onError: (caught) => {
      setNotice(undefined);
      setError(describeVisitError(caught, "후보로 담지 못했습니다."));
    },
  });

  if (role === "DEPUTY") {
    return (
      <EmptyState
        title="이 화면은 중개보조원에게 제공되지 않습니다."
        description="허용받은 매물은 승인된 대표와 소속공인중개사가 봅니다."
      />
    );
  }
  const openOptions = (coordinations.data?.items ?? [])
    .filter((item) => OPEN_STATUSES.includes(item.status))
    .map((item) => ({
      value: String(item.coordinationId),
      label: `${item.customerName} · ${statusLabel(item.status)}`,
    }));
  const included = new Set(target.data?.candidateProperties.map((item) => item.propertyId) ?? []);
  const candidateCount = target.data?.candidateProperties.length ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="허용받은 매물"
        description="다른 사무소가 방문 신청을 허용한 매물을 보고 후보 매물로 담습니다."
      />
      <Card>
        <div className="flex flex-col gap-4">
          <FormNotice>
            상세주소는 확정 신청이 생긴 뒤에만 조율 상세에서 보이고 승인자 이름, 연락처, 조건 값은
            보이지 않습니다. 허용이 회수되거나 만료된 후보 매물은 신청할 수 없고, 확정 방문이 없으면
            후보에서 제거할 수 있습니다.
          </FormNotice>
          <SearchField
            label="허용받은 매물 검색"
            placeholder="매물명이나 사무소 이름으로 검색하세요."
            value={draft}
            onValueChange={setDraft}
            onSearch={() => setKeyword(draft.trim())}
          />
          <SelectField
            label="담을 조율"
            value={coordinationId}
            options={[{ value: "", label: "조율을 선택해 주세요" }, ...openOptions]}
            onValueChange={(value) => {
              setCoordinationId(value);
              setNotice(undefined);
              setError(undefined);
            }}
          />
          {notice ? <FormNotice>{notice}</FormNotice> : null}
          {error ? <FormAlert>{error}</FormAlert> : null}
          <QueryGate query={grants} loadingLabel="허용받은 매물을 불러오는 중입니다.">
            {(data) =>
              data.items.length === 0 ? (
                <EmptyState
                  title="허용받은 매물이 없습니다."
                  description="다른 사무소가 방문 신청을 허용하면 이곳에 나타납니다."
                />
              ) : (
                <ul className="flex flex-col">
                  {data.items.map((item) => {
                    const isIncluded = included.has(item.propertyId);
                    return (
                      <li
                        key={item.grantId}
                        className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                            {item.propertyName}
                            <Badge tone="teal">{item.ownerOfficeName}</Badge>
                            <Badge tone="gray">{labelOf(GRANT_SCOPE_LABEL, item.scope)}</Badge>
                          </span>
                          <span className="text-caption text-ink-2">
                            {item.propertyAddress} · {item.categoryName}
                          </span>
                          <span className="text-caption text-ink-2">
                            출입승인 {formatSeoulDateTime(item.approvalValidUntil)}까지
                            {item.grantExpiresAt
                              ? ` · 허용 만료 ${formatSeoulDateTime(item.grantExpiresAt)}`
                              : " · 허용 만료 없음"}
                          </span>
                          <span className="text-caption text-ink-2">
                            {item.conditionRegistered
                              ? `승인자 조건 등록됨${item.conditionAppliesUntil ? ` · 적용 ${formatSeoulDateTime(item.conditionAppliesUntil)}까지` : ""}`
                              : "승인자 조건이 아직 등록되지 않았습니다."}
                          </span>
                        </div>
                        {isIncluded ? (
                          <Badge tone="gray">이미 담김</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outlined"
                            disabled={
                              isReadOnly ||
                              coordinationId === "" ||
                              candidateCount >= MAX_CANDIDATES
                            }
                            isLoading={add.isPending && add.variables === item.propertyId}
                            aria-label={`${item.propertyName} 후보로 담기`}
                            onClick={() => add.mutate(item.propertyId)}
                          >
                            후보로 담기
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            }
          </QueryGate>
        </div>
      </Card>
    </div>
  );
}
