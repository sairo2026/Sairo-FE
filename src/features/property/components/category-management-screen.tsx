"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ErrorScreen } from "@/shared/components/feedback/error-screen";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { countCodePoints, TEXT_LIMITS } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import type {
  PropertyCategoryListResponse,
  PropertyFieldDefinitionListResponse,
} from "@/lib/api/contracts/property.schema";
import {
  createCategory,
  createFieldDefinition,
  updateCategory,
  updateFieldDefinition,
} from "../api/property.api";
import {
  propertyKeys,
  useFieldDefinitions,
  usePropertyCategories,
} from "../hooks/property-queries";
import { FIELD_TYPES, FIELD_TYPE_LABEL, labelOf } from "../model/labels";
import { describePropertyError, fieldErrorMap } from "../model/messages";

type Category = PropertyCategoryListResponse["items"][number];
type Definition = PropertyFieldDefinitionListResponse["items"][number];

function nameError(value: string, label: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return `${label} 이름을 입력해 주세요.`;
  if (countCodePoints(trimmed) > max) return `${label} 이름은 ${max}자 이하로 입력해 주세요.`;
  return undefined;
}

function CategoryCreateForm({ onCreated }: { onCreated: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () => createCategory({ name: name.trim() }),
    onSuccess: async () => {
      setName("");
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: propertyKeys.categories });
      onCreated("카테고리를 만들었습니다.");
    },
    onError: (caught) =>
      setError(
        fieldErrorMap(caught).name ??
          describePropertyError(caught, "카테고리를 만들지 못했습니다."),
      ),
  });
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = nameError(name, "카테고리", TEXT_LIMITS.title);
        if (problem) return setError(problem);
        setError(undefined);
        mutation.mutate();
      }}
    >
      <TextField
        label="새 카테고리 이름"
        value={name}
        maxLength={TEXT_LIMITS.title}
        onValueChange={(value) => {
          setName(value);
          setError(undefined);
        }}
        error={error}
      />
      <div>
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          카테고리 만들기
        </Button>
      </div>
    </form>
  );
}

function CategoryRow({
  category,
  isSelected,
  onSelect,
  onNotice,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (body: { name?: string; active?: boolean }) =>
      updateCategory(category.categoryId, body),
    onSuccess: async (_, body) => {
      setIsEditing(false);
      setError(undefined);
      onNotice(
        body.active === false ? "카테고리를 비활성화했습니다." : "카테고리 이름을 바꿨습니다.",
      );
      await queryClient.invalidateQueries({ queryKey: propertyKeys.categories });
    },
    onError: (caught) => setError(describePropertyError(caught, "카테고리를 수정하지 못했습니다.")),
  });
  return (
    <li className="flex flex-col gap-2 rounded-card-flat border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            className={
              isSelected ? "font-bold text-primary" : "font-semibold text-ink hover:text-primary"
            }
          >
            {category.name}
          </button>
          {category.isSystem ? <Badge tone="gray">기본 · 수정 불가</Badge> : null}
          {!category.active ? <Badge tone="gray">비활성</Badge> : null}
        </div>
        {!category.isSystem && category.active ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing((value) => !value)}>
              이름 수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate({ active: false })}
            >
              비활성화
            </Button>
          </div>
        ) : null}
      </div>
      {isEditing ? (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const problem = nameError(name, "카테고리", TEXT_LIMITS.title);
            if (problem) return setError(problem);
            mutation.mutate({ name: name.trim() });
          }}
        >
          <TextField label="카테고리 이름" value={name} onValueChange={setName} />
          <div>
            <Button type="submit" size="sm" isLoading={mutation.isPending}>
              저장
            </Button>
          </div>
        </form>
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
    </li>
  );
}

function FieldRow({
  categoryId,
  definition,
  isLocked,
  onNotice,
}: {
  categoryId: number;
  definition: Definition;
  isLocked: boolean;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(definition.fieldName);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (body: { fieldName?: string; active?: boolean }) =>
      updateFieldDefinition(categoryId, definition.fieldDefinitionId, body),
    onSuccess: async (_, body) => {
      setIsEditing(false);
      setError(undefined);
      onNotice(
        body.active === false ? "입력 항목을 보관했습니다." : "입력 항목 이름을 바꿨습니다.",
      );
      await queryClient.invalidateQueries({ queryKey: propertyKeys.fields(categoryId) });
    },
    onError: (caught) =>
      setError(describePropertyError(caught, "입력 항목을 수정하지 못했습니다.")),
  });
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-body text-ink">
          <span className="font-medium">{definition.fieldName}</span>
          <span className="text-caption text-ink-2">
            {labelOf(FIELD_TYPE_LABEL, definition.fieldType)}
          </span>
          {definition.unit ? (
            <span className="text-caption text-ink-2">{definition.unit}</span>
          ) : null}
          {!definition.active ? <Badge tone="gray">보관됨</Badge> : null}
        </div>
        {!isLocked && definition.active ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing((value) => !value)}>
              이름 수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate({ active: false })}
            >
              보관
            </Button>
          </div>
        ) : null}
      </div>
      {isEditing ? (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const problem = nameError(name, "입력 항목", TEXT_LIMITS.customFieldName);
            if (problem) return setError(problem);
            mutation.mutate({ fieldName: name.trim() });
          }}
        >
          <TextField label="입력 항목 이름" value={name} onValueChange={setName} />
          <div>
            <Button type="submit" size="sm" isLoading={mutation.isPending}>
              저장
            </Button>
          </div>
        </form>
      ) : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
    </li>
  );
}

function FieldCreateForm({
  categoryId,
  onNotice,
}: {
  categoryId: number;
  onNotice: (m: string) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("TEXT");
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () =>
      createFieldDefinition(categoryId, { fieldName: name.trim(), fieldType: type }),
    onSuccess: async () => {
      setName("");
      setError(undefined);
      onNotice("입력 항목을 추가했습니다.");
      await queryClient.invalidateQueries({ queryKey: propertyKeys.fields(categoryId) });
    },
    onError: (caught) =>
      setError(describePropertyError(caught, "입력 항목을 추가하지 못했습니다.")),
  });
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = nameError(name, "입력 항목", TEXT_LIMITS.customFieldName);
        if (problem) return setError(problem);
        setError(undefined);
        mutation.mutate();
      }}
    >
      <TextField
        label="새 입력 항목 이름"
        value={name}
        maxLength={TEXT_LIMITS.customFieldName}
        onValueChange={(value) => {
          setName(value);
          setError(undefined);
        }}
        error={error}
      />
      <SelectField
        label="입력 항목 형식"
        value={type}
        options={FIELD_TYPES.map((value) => ({ value, label: FIELD_TYPE_LABEL[value] }))}
        onValueChange={setType}
      />
      <p className="text-caption text-ink-2">
        값이 입력된 항목은 형식을 바꾸거나 삭제할 수 없고 보관만 할 수 있습니다.
      </p>
      <div>
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          입력 항목 추가
        </Button>
      </div>
    </form>
  );
}

function FieldsPanel({
  category,
  onNotice,
}: {
  category: Category;
  onNotice: (m: string) => void;
}) {
  const query = useFieldDefinitions(category.categoryId);
  return (
    <Card tone="flat" title={`${category.name} 입력 항목`}>
      <QueryGate query={query} loadingLabel="입력 항목을 불러오는 중입니다.">
        {(data) => (
          <div className="flex flex-col gap-5">
            {category.isSystem ? (
              <p className="text-caption text-ink-2">
                기본 카테고리의 입력 항목은 수정하거나 보관할 수 없습니다.
              </p>
            ) : null}
            {data.items.length === 0 ? (
              <p className="text-caption text-ink-2">등록된 입력 항목이 없습니다.</p>
            ) : (
              <ul>
                {data.items.map((definition) => (
                  <FieldRow
                    key={`${definition.fieldDefinitionId}-${definition.fieldName}-${definition.active}`}
                    categoryId={category.categoryId}
                    definition={definition}
                    isLocked={category.isSystem}
                    onNotice={onNotice}
                  />
                ))}
              </ul>
            )}
            {category.isSystem || !category.active ? null : (
              <FieldCreateForm categoryId={category.categoryId} onNotice={onNotice} />
            )}
          </div>
        )}
      </QueryGate>
    </Card>
  );
}

export function CategoryManagementScreen() {
  const { role } = useOfficeAccess();
  const query = usePropertyCategories();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string>();

  if (role === "DEPUTY") return <ErrorScreen kind="forbidden" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="카테고리·입력 항목 관리"
        description="사무소가 쓰는 매물 카테고리와 전용 입력 항목을 관리합니다."
        actions={
          <Link
            href="/properties"
            className="inline-flex h-12 items-center rounded-control border border-line bg-white px-6 text-body font-medium text-ink-2 hover:border-primary hover:text-primary"
          >
            매물 목록
          </Link>
        }
      />
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      <QueryGate query={query} loadingLabel="카테고리를 불러오는 중입니다.">
        {(data) => {
          const selected = data.items.find((item) => item.categoryId === selectedId) ?? null;
          return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card tone="flat" title="카테고리">
                <div className="flex flex-col gap-5">
                  <ul className="flex flex-col gap-3">
                    {data.items.map((category) => (
                      <CategoryRow
                        key={`${category.categoryId}-${category.name}-${category.active}`}
                        category={category}
                        isSelected={selectedId === category.categoryId}
                        onSelect={() => setSelectedId(category.categoryId)}
                        onNotice={setNotice}
                      />
                    ))}
                  </ul>
                  <CategoryCreateForm onCreated={setNotice} />
                </div>
              </Card>
              {selected ? (
                <FieldsPanel category={selected} onNotice={setNotice} />
              ) : (
                <Card tone="flat" title="입력 항목">
                  <p className="text-caption text-ink-2">
                    카테고리 이름을 눌러 입력 항목을 확인하고 관리하세요.
                  </p>
                </Card>
              )}
            </div>
          );
        }}
      </QueryGate>
    </div>
  );
}
