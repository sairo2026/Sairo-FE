"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { CustomerDetailResponse } from "@/lib/api/contracts/customer.schema";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import type { BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { formatSeoulDate } from "@/shared/lib/format";
import {
  createOwnerOccupant,
  createPropertyInterest,
  updateOwnerOccupant,
  updatePropertyInterest,
} from "../api/customer.api";
import { customerKeys, usePropertySearch } from "../hooks/customer-queries";
import { RELATION_ROLE_LABEL } from "../model/labels";
import { describeCustomerError, isApiCode } from "../model/messages";

type Relation = CustomerDetailResponse["relatedProperties"][number];

const ROLE_TONE: Record<Relation["role"], BadgeTone> = {
  OWNER: "green",
  OCCUPANT: "teal",
  INTEREST: "blue",
};

function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function RelationRow({
  customer,
  relation,
  isEditable,
  onChanged,
}: {
  customer: CustomerDetailResponse;
  relation: Relation;
  isEditable: boolean;
  onChanged: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [endDate, setEndDate] = useState(relation.endDate ?? "");
  const [note, setNote] = useState(relation.note ?? "");
  const [error, setError] = useState<string>();
  const isInterest = relation.role === "INTEREST";

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (isInterest && relation.interestId !== null) {
        await updatePropertyInterest(
          relation.interestId,
          {
            endDate: endDate === "" ? null : endDate,
            note: note.trim() === "" ? null : note.trim(),
          },
          customer.version,
        );
        return;
      }
      if (relation.linkId !== null) {
        await updateOwnerOccupant(
          relation.linkId,
          { endDate: endDate === "" ? null : endDate },
          customer.version,
        );
        return;
      }
      throw new Error("수정할 수 없는 관계입니다.");
    },
    onSuccess: async () => {
      setIsEditing(false);
      setError(undefined);
      onChanged("관계를 수정했습니다.");
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        await queryClient.invalidateQueries({ queryKey: customerKeys.detail(customer.customerId) });
      }
      setError(describeCustomerError(caught, "관계를 수정하지 못했습니다."));
    },
  });

  function save() {
    if (endDate !== "" && endDate < relation.startDate) {
      setError("종료일은 시작일보다 앞설 수 없습니다.");
      return;
    }
    setError(undefined);
    mutation.mutate();
  }

  return (
    <li className="flex flex-col gap-2 rounded-card-flat border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={ROLE_TONE[relation.role]} className="h-8 min-w-[56px] px-3 text-caption">
            {RELATION_ROLE_LABEL[relation.role]}
          </Badge>
          <Link
            href={`/properties/${relation.propertyId}`}
            className="font-semibold text-primary hover:underline"
          >
            {relation.propertyName}
          </Link>
          <span className="text-caption text-ink-2">
            {formatSeoulDate(relation.startDate)} ~{" "}
            {relation.endDate ? formatSeoulDate(relation.endDate) : "현재"}
          </span>
        </div>
        {isEditable ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing((value) => !value)}>
            {isEditing ? "닫기" : "종료일·메모 수정"}
          </Button>
        ) : null}
      </div>
      {isInterest && relation.note ? (
        <p className="text-caption text-ink-2">메모: {relation.note}</p>
      ) : null}
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <DateTimeField
            label="종료일"
            kind="date"
            value={endDate}
            min={relation.startDate}
            onValueChange={setEndDate}
          />
          {isInterest ? (
            <TextField label="관계 메모" value={note} maxLength={200} onValueChange={setNote} />
          ) : null}
          <div>
            <Button size="sm" isLoading={mutation.isPending} onClick={save}>
              저장
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
    </li>
  );
}

function AddRelationForm({
  customer,
  onAdded,
}: {
  customer: CustomerDetailResponse;
  onAdded: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState("INTEREST");
  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [startDate, setStartDate] = useState(todayInSeoul());
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const search = usePropertySearch(keyword);

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const id = Number(propertyId);
      if (kind === "INTEREST") {
        await createPropertyInterest(customer.customerId, {
          propertyId: id,
          startDate,
          endDate: endDate === "" ? null : endDate,
          note: note.trim() === "" ? null : note.trim(),
        });
        return;
      }
      await createOwnerOccupant(id, {
        customerId: customer.customerId,
        role: kind,
        startDate,
      });
    },
    onSuccess: async () => {
      setPropertyId("");
      setNote("");
      setEndDate("");
      setError(undefined);
      onAdded("관계를 추가했습니다.");
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (caught) => setError(describeCustomerError(caught, "관계를 추가하지 못했습니다.")),
  });

  function submit() {
    if (propertyId === "") return setError("연결할 매물을 선택해 주세요.");
    if (startDate === "") return setError("시작일을 입력해 주세요.");
    if (endDate !== "" && endDate < startDate) {
      return setError("종료일은 시작일보다 앞설 수 없습니다.");
    }
    setError(undefined);
    mutation.mutate();
  }

  return (
    <div className="flex flex-col gap-4 rounded-card-flat border border-dashed border-line p-5">
      <h3 className="text-body font-semibold text-ink">매물 연결 추가</h3>
      <SelectField
        label="관계"
        value={kind}
        options={[
          { value: "INTEREST", label: "관심 매물" },
          { value: "OWNER", label: "소유" },
          { value: "OCCUPANT", label: "점유" },
        ]}
        onValueChange={setKind}
      />
      <TextField
        label="매물 검색"
        value={searchText}
        actionLabel="검색"
        onAction={() => setKeyword(searchText)}
        isActionDisabled={searchText.trim() === ""}
        onValueChange={setSearchText}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setKeyword(searchText);
          }
        }}
      />
      {keyword.trim() !== "" ? (
        search.isPending ? (
          <p role="status" className="text-caption text-ink-2">
            매물을 검색하는 중입니다.
          </p>
        ) : search.isError ? (
          <FormAlert>
            {describeCustomerError(search.error, "매물을 검색하지 못했습니다.")}
          </FormAlert>
        ) : search.data.items.length === 0 ? (
          <p className="text-caption text-ink-2">검색 결과가 없습니다.</p>
        ) : (
          <RadioGroup
            legend="연결할 매물"
            name="relation-property"
            value={propertyId}
            options={search.data.items.map((item) => ({
              value: String(item.propertyId),
              label: `${item.name}${item.address ? ` · ${item.address}` : ""}`,
            }))}
            onValueChange={setPropertyId}
          />
        )
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateTimeField label="시작일" kind="date" value={startDate} onValueChange={setStartDate} />
        {kind === "INTEREST" ? (
          <DateTimeField
            label="종료일 (선택)"
            kind="date"
            value={endDate}
            onValueChange={setEndDate}
          />
        ) : null}
      </div>
      {kind === "INTEREST" ? (
        <TextField label="관계 메모" value={note} maxLength={200} onValueChange={setNote} />
      ) : (
        <p className="text-caption text-ink-2">
          소유·점유 관계는 담당자가 직접 확인한 내용으로 기록되며 계약 체결이 자동으로 바꾸지
          않습니다.
        </p>
      )}
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div>
        <Button size="sm" isLoading={mutation.isPending} onClick={submit}>
          연결 추가
        </Button>
      </div>
    </div>
  );
}

export function RelationsPanel({
  customer,
  canEdit,
}: {
  customer: CustomerDetailResponse;
  canEdit: boolean;
}) {
  const [notice, setNotice] = useState<string>();
  return (
    <div className="flex flex-col gap-5">
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {customer.relatedProperties.length === 0 ? (
        <p className="text-caption text-ink-2">연결된 매물이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {customer.relatedProperties.map((relation) => (
            <RelationRow
              key={`${relation.role}-${relation.linkId ?? relation.interestId}-${relation.endDate ?? ""}-${relation.note ?? ""}`}
              customer={customer}
              relation={relation}
              isEditable={canEdit}
              onChanged={setNotice}
            />
          ))}
        </ul>
      )}
      {canEdit ? <AddRelationForm customer={customer} onAdded={setNotice} /> : null}
    </div>
  );
}
