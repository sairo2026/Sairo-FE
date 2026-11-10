"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PropertyDetailResponse } from "@/lib/api/contracts/property.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, MutedNote } from "@/shared/components/feedback/page-parts";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Modal } from "@/shared/components/ui/modal";
import { Tabs } from "@/shared/components/ui/tabs";
import { formatArea, formatKrw, formatSeoulDate, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { archiveProperty, restoreProperty } from "../api/property.api";
import { propertyKeys, usePropertyDetail } from "../hooks/property-queries";
import { dealTypeLabel, daysUntil } from "../model/format";
import {
  CONTRACT_STATUS_LABEL,
  COORDINATION_STATUS_LABEL,
  LEASE_SOURCE_LABEL,
  OCCUPANCY_LABEL,
  OWNER_OCCUPANT_ROLE_LABEL,
  STAGE_LABEL,
  STAGE_TONE,
  VISIT_RESULT_LABEL,
  labelOf,
  toneOf,
} from "../model/labels";
import { describePropertyError } from "../model/messages";
import { OffersPanel } from "./offers-panel";

function customValueText(type: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (type === "BOOLEAN") return value === true ? "예" : "아니오";
  return String(value);
}

function BasicInfo({ property }: { property: PropertyDetailResponse }) {
  const days = daysUntil(property.leaseEndDate, new Date());
  return (
    <div className="flex flex-col gap-6">
      <DetailList
        items={[
          {
            label: "주소",
            value: property.address
              ? `${property.address}${property.addressDetail ? ` ${property.addressDetail}` : ""}`
              : "-",
          },
          { label: "카테고리", value: property.categoryName },
          { label: "담당 공인중개사", value: property.managingMemberName ?? "-" },
          {
            label: "전용면적",
            value: formatArea(property.exclusiveAreaSqm),
          },
          {
            label: "공급면적",
            value: formatArea(property.supplyAreaSqm),
          },
          {
            label: "대지면적",
            value: formatArea(property.landAreaSqm),
          },
          {
            label: "연면적",
            value: formatArea(property.grossFloorAreaSqm),
          },
          {
            label: "입주 가능일",
            value: property.moveInNegotiable
              ? "협의"
              : property.moveInDate
                ? formatSeoulDate(property.moveInDate)
                : "-",
          },
          {
            label: "관리비",
            value:
              property.maintenanceFeeAmount === null || property.maintenanceFeeAmount === undefined
                ? "-"
                : `${formatKrw(property.maintenanceFeeAmount)}${property.maintenanceFeeItems ? ` (${property.maintenanceFeeItems})` : ""}`,
          },
          { label: "점유상태", value: labelOf(OCCUPANCY_LABEL, property.occupancyStatus) },
          {
            label: "임대 만기",
            value: property.leaseEndDate
              ? `${formatSeoulDate(property.leaseEndDate)} · ${labelOf(LEASE_SOURCE_LABEL, property.leaseEndSource)}${days === null ? "" : ` · D-${Math.max(0, days)}`}`
              : property.referenceLeaseEndDate
                ? `${formatSeoulDate(property.referenceLeaseEndDate)} · 참고 (${property.referenceLeaseEndSource ?? "출처 없음"})`
                : "-",
          },
          { label: "설명", value: property.description ?? "-" },
          { label: "내부 메모", value: property.memo ?? "-" },
        ]}
      />
      <section aria-labelledby="custom-fields-title" className="flex flex-col gap-3">
        <h3 id="custom-fields-title" className="text-body font-semibold text-ink">
          카테고리 전용 정보
        </h3>
        {property.customFields.length === 0 ? (
          <MutedNote>입력된 전용 정보가 없습니다.</MutedNote>
        ) : (
          <DetailList
            items={property.customFields.map((item) => ({
              label: item.fieldName,
              value: customValueText(item.fieldType, item.value),
            }))}
          />
        )}
      </section>
      {property.archivedCustomFields.length > 0 ? (
        <section aria-labelledby="archived-fields-title" className="flex flex-col gap-3">
          <h3 id="archived-fields-title" className="text-body font-semibold text-ink">
            이전 카테고리에서 보관된 값
          </h3>
          <DetailList
            items={property.archivedCustomFields.map((item) => ({
              label: `${item.previousCategoryName} · ${item.fieldName}`,
              value: customValueText(item.fieldType, item.value),
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}

function RelationPanel({ property }: { property: PropertyDetailResponse }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">소유·점유 관계</h3>
        {property.ownerOccupants.length === 0 ? (
          <MutedNote>
            연결된 소유자나 점유자가 없습니다. 고객 상세에서 연결할 수 있습니다.
          </MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {property.ownerOccupants.map((item) => (
              <li
                key={item.linkId}
                className="flex flex-wrap items-center gap-3 text-body text-ink"
              >
                <Badge tone={item.role === "OWNER" ? "blue" : "teal"}>
                  {OWNER_OCCUPANT_ROLE_LABEL[item.role]}
                </Badge>
                <Link
                  href={`/customers/${item.customerId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {item.customerName}
                </Link>
                <span className="text-caption text-ink-2">
                  {formatSeoulDate(item.startDate)} ~{" "}
                  {item.endDate ? formatSeoulDate(item.endDate) : "현재"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">진행 중인 임장 조율</h3>
        {property.activeCoordinations.length === 0 ? (
          <MutedNote>진행 중인 임장 조율이 없습니다.</MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {property.activeCoordinations.map((item) => (
              <li key={item.coordinationId} className="text-body text-ink">
                {item.customerName} · {labelOf(COORDINATION_STATUS_LABEL, item.status)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">방문 이력</h3>
        {property.visits.length === 0 ? (
          <MutedNote>기록된 방문이 없습니다.</MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {property.visits.map((visit) => (
              <li key={visit.scheduleItemId} className="text-body text-ink">
                {visit.scheduledStartAt
                  ? formatSeoulDateTime(visit.scheduledStartAt)
                  : "일정 미확정"}{" "}
                · {visit.customerName} · {labelOf(VISIT_RESULT_LABEL, visit.result)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-body font-semibold text-ink">연결된 계약</h3>
        {property.contracts.length === 0 ? (
          <MutedNote>연결된 계약이 없습니다.</MutedNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {property.contracts.map((contract) => (
              <li key={contract.contractId} className="text-body text-ink">
                {dealTypeLabel(contract.dealType)} ·{" "}
                {labelOf(CONTRACT_STATUS_LABEL, contract.contractStatus)}
                {contract.signedDate ? ` · 체결 ${formatSeoulDate(contract.signedDate)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PhotosPanel({ property }: { property: PropertyDetailResponse }) {
  if (property.photos.length === 0) return <MutedNote>등록된 사진이 없습니다.</MutedNote>;
  const sorted = [...property.photos].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((photo) => (
        <li key={photo.photoId} className="flex flex-col gap-2">
          <Image
            src={photo.url}
            alt={photo.description ?? `매물 사진 ${photo.sortOrder}`}
            width={480}
            height={320}
            unoptimized
            className="h-48 w-full rounded-card-flat object-cover"
          />
          {photo.description ? (
            <p className="text-caption text-ink-2">{photo.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ArchiveDialog({
  property,
  onClose,
}: {
  property: PropertyDetailResponse;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const blockers = {
    coordinations: property.activeCoordinations,
    contracts: property.contracts.filter((contract) => contract.contractStatus === "SIGNED"),
  };
  const isBlocked = blockers.coordinations.length > 0 || blockers.contracts.length > 0;
  const mutation = useMutation({
    mutationFn: () => archiveProperty(property.propertyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      router.push("/properties");
    },
    onError: async (caught) => {
      await queryClient.invalidateQueries({ queryKey: propertyKeys.detail(property.propertyId) });
      setError(describePropertyError(caught, "매물을 보관하지 못했습니다. 다시 시도해 주세요."));
    },
  });
  return (
    <Modal
      isOpen
      title="매물 보관"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button
            isLoading={mutation.isPending}
            disabled={isBlocked}
            onClick={() => {
              setError(undefined);
              mutation.mutate();
            }}
          >
            보관
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {isBlocked ? (
          <>
            <p>진행 중인 임장 조율이나 계약을 정리하기 전에는 보관할 수 없습니다.</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {blockers.coordinations.map((item) => (
                <li key={`c-${item.coordinationId}`}>
                  임장 조율 {item.customerName} · {labelOf(COORDINATION_STATUS_LABEL, item.status)}
                </li>
              ))}
              {blockers.contracts.map((item) => (
                <li key={`k-${item.contractId}`}>
                  계약 {dealTypeLabel(item.dealType)} ·{" "}
                  {labelOf(CONTRACT_STATUS_LABEL, item.contractStatus)}
                </li>
              ))}
            </ul>
          </>
        ) : property.registrationStage === "DRAFT" ? (
          <p>
            참조가 없는 임시저장 매물은 보관하지 않고 완전히 삭제됩니다. 삭제하면 되돌릴 수
            없습니다.
          </p>
        ) : (
          <p>
            보관한 매물은 목록에서 숨겨지고 활성 신청 허용이 회수됩니다. 보관 매물 보기에서 복원할
            수 있습니다.
          </p>
        )}
        {error ? <FormAlert>{error}</FormAlert> : null}
      </div>
    </Modal>
  );
}

function DetailBody({ property }: { property: PropertyDetailResponse }) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [tab, setTab] = useState("info");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const isArchived = Boolean(property.deletedAt);

  const restoreMutation = useMutation({
    mutationFn: () => restoreProperty(property.propertyId),
    onSuccess: async () => {
      setError(undefined);
      setNotice("매물을 복원했습니다.");
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
    onError: (caught) => setError(describePropertyError(caught, "매물을 복원하지 못했습니다.")),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-ink">{property.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneOf(STAGE_TONE, property.registrationStage)}>
              {labelOf(STAGE_LABEL, property.registrationStage)}
            </Badge>
            {isArchived ? <Badge tone="red">보관됨</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/properties"
            className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            목록
          </Link>
          {isArchived ? (
            <Button
              isLoading={restoreMutation.isPending}
              disabled={isReadOnly}
              onClick={() => restoreMutation.mutate()}
            >
              복원
            </Button>
          ) : (
            <>
              <Link
                href={`/properties/${property.propertyId}/access-approvals`}
                className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
              >
                출입승인
              </Link>
              <Link
                href={`/properties/${property.propertyId}/cross-office`}
                className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
              >
                다른 사무소 신청
              </Link>
              <Link
                href={`/properties/${property.propertyId}/edit`}
                className="inline-flex h-12 items-center rounded-control bg-primary px-6 text-body font-bold text-white hover:bg-primary-hover"
              >
                수정
              </Link>
              <Button variant="ghost" disabled={isReadOnly} onClick={() => setIsArchiveOpen(true)}>
                보관
              </Button>
            </>
          )}
        </div>
      </header>
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {isArchived ? (
        <FormNotice>보관된 매물입니다. 수정하려면 먼저 복원해 주세요.</FormNotice>
      ) : null}
      <Card>
        <Tabs
          label="매물 상세"
          activeKey={tab}
          onActiveKeyChange={setTab}
          items={[
            { key: "info", label: "기본 정보", panel: <BasicInfo property={property} /> },
            {
              key: "offers",
              label: "거래 제안",
              panel: (
                <OffersPanel
                  propertyId={property.propertyId}
                  categoryName={property.categoryName}
                  isArchived={isArchived}
                />
              ),
            },
            {
              key: "relations",
              label: "소유·점유·이력",
              panel: <RelationPanel property={property} />,
            },
            { key: "photos", label: "사진", panel: <PhotosPanel property={property} /> },
          ]}
        />
      </Card>
      {isArchiveOpen ? (
        <ArchiveDialog property={property} onClose={() => setIsArchiveOpen(false)} />
      ) : null}
    </div>
  );
}

export function PropertyDetailScreen({ propertyId }: { propertyId: number }) {
  const query = usePropertyDetail(propertyId);
  return (
    <QueryGate query={query} loadingLabel="매물 정보를 불러오는 중입니다.">
      {(property) => <DetailBody property={property} />}
    </QueryGate>
  );
}
