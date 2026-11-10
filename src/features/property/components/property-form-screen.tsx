"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PropertyDetailResponse } from "@/lib/api/contracts/property.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DateTimeField } from "@/shared/components/ui/date-time-field";
import { Checkbox, SelectField } from "@/shared/components/ui/select-field";
import { Modal } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { TextField } from "@/shared/components/ui/text-field";
import { PROPERTY_ENTRY_COPY } from "@/shared/legal/notice-copy";
import { useAssignableMembers } from "@/shared/session/assignable-members";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  changePropertyCategory,
  checkDuplicateProperty,
  createProperty,
  deletePhoto,
  fetchProperty,
  putFieldValue,
  updatePhoto,
  updateProperty,
  uploadPhoto,
} from "../api/property.api";
import {
  propertyKeys,
  useFieldDefinitions,
  usePropertyCategories,
  usePropertyDetail,
} from "../hooks/property-queries";
import {
  EMPTY_PROPERTY_FORM,
  fieldRawFromValue,
  formFromDetail,
  toCreateRequest,
  toFieldPayload,
  toUpdateRequest,
  validateFieldValue,
  validatePropertyForm,
} from "../model/form";
import type {
  FieldDefinition,
  PropertyFormErrors,
  PropertyFormField,
  PropertyFormValues,
} from "../model/form";
import { OCCUPANCY_LABEL, OCCUPANCY_STATUSES } from "../model/labels";
import { describePropertyError, fieldErrorMap, isApiCode } from "../model/messages";
import { CustomFieldsSection } from "./custom-fields-section";
import type { FieldValueMap } from "./custom-fields-section";
import { QueuedPhotoList, SavedPhotoList, toQueuedPhoto, validatePhotoFile } from "./photo-section";
import type { QueuedPhoto } from "./photo-section";

type DuplicateMatch = {
  propertyId: number;
  address: string | null;
  addressDetail?: string | null;
  categoryName: string;
  registrationStage: string;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card tone="flat" title={title}>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  );
}

function DuplicateDialog({
  matches,
  reason,
  error,
  isPending,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  matches: DuplicateMatch[];
  reason: string;
  error?: string;
  isPending: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen
      title="같은 주소의 매물이 있습니다"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={isPending}>
            돌아가기
          </Button>
          <Button isLoading={isPending} onClick={onConfirm}>
            별도 매물로 등록
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {matches.map((match) => (
            <li key={match.propertyId} className="flex items-center justify-between gap-3">
              <span>
                {match.address} {match.addressDetail ?? ""} · {match.categoryName}
              </span>
              <Link
                href={`/properties/${match.propertyId}`}
                className="text-caption font-semibold text-primary hover:underline"
              >
                기존 매물 보기
              </Link>
            </li>
          ))}
        </ul>
        <TextField
          label="별도 등록 사유"
          hint="다른 권리나 거래 단위라서 따로 등록해야 하는 이유를 적어 주세요."
          value={reason}
          maxLength={200}
          onValueChange={onReasonChange}
          error={error}
        />
      </div>
    </Modal>
  );
}

function CategoryChangeDialog({
  propertyId,
  currentCategoryId,
  version,
  onClose,
  onChanged,
}: {
  propertyId: number;
  currentCategoryId: number;
  version: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const categories = usePropertyCategories();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: () => changePropertyCategory(propertyId, Number(target), version),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      onChanged();
    },
    onError: async (caught) => {
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        await queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
      }
      setError(describePropertyError(caught, "카테고리를 바꾸지 못했습니다."));
    },
  });
  const options = (categories.data?.items ?? [])
    .filter((item) => item.active && item.categoryId !== currentCategoryId)
    .map((item) => ({ value: String(item.categoryId), label: item.name }));
  return (
    <Modal
      isOpen
      title="카테고리 변경"
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button
            isLoading={mutation.isPending}
            disabled={target === ""}
            onClick={() => {
              setError(undefined);
              mutation.mutate();
            }}
          >
            변경
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p>이전 카테고리의 전용 입력값은 지우지 않고 보관되며 매물 상세에서 확인할 수 있습니다.</p>
        <SelectField
          label="새 카테고리"
          value={target}
          placeholder="카테고리를 선택해 주세요."
          options={options}
          onValueChange={setTarget}
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
      </div>
    </Modal>
  );
}

type FormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      detail: PropertyDetailResponse;
      initialNotice?: string;
      onReload: (notice?: string) => void;
    };

export function PropertyForm(props: FormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const isEdit = props.mode === "edit";
  const detail = props.mode === "edit" ? props.detail : null;

  const [values, setValues] = useState<PropertyFormValues>(() =>
    detail ? formFromDetail(detail) : EMPTY_PROPERTY_FORM,
  );
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [fieldRaw, setFieldRaw] = useState<FieldValueMap>({});
  const [fieldErrors, setFieldErrors] = useState<Record<number, string | undefined>>({});
  const [queued, setQueued] = useState<QueuedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState<string | undefined>(
    props.mode === "edit" ? props.initialNotice : undefined,
  );
  const [isConflict, setIsConflict] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [duplicateError, setDuplicateError] = useState<string>();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const pendingActivate = useRef(false);
  const photoSeq = useRef(0);

  const categories = usePropertyCategories();
  const members = useAssignableMembers();
  const categoryId = values.categoryId === "" ? null : Number(values.categoryId);
  const definitions = useFieldDefinitions(categoryId);
  const live = usePropertyDetail(detail?.propertyId ?? 0);
  const current = live.data ?? detail;

  const savedValueOf = (definition: FieldDefinition): string => {
    const saved = current?.customFields.find(
      (item) => item.fieldDefinitionId === definition.fieldDefinitionId,
    );
    return fieldRawFromValue(definition, saved?.value);
  };
  const rawOf = (definition: FieldDefinition): string =>
    fieldRaw[definition.fieldDefinitionId] ?? savedValueOf(definition);
  const displayedValues: FieldValueMap = {};
  for (const definition of definitions.data?.items ?? []) {
    displayedValues[definition.fieldDefinitionId] = rawOf(definition);
  }

  function setField<K extends PropertyFormField>(key: K, value: PropertyFormValues[K]) {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }));
  }

  function validateAll(activate: boolean) {
    const nextErrors = validatePropertyForm(values, { requireCategory: !isEdit, activate });
    const nextFieldErrors: Record<number, string | undefined> = {};
    for (const definition of definitions.data?.items ?? []) {
      if (!definition.active) continue;
      const problem = validateFieldValue(definition, rawOf(definition));
      if (problem) nextFieldErrors[definition.fieldDefinitionId] = problem;
    }
    setErrors(nextErrors);
    setFieldErrors(nextFieldErrors);
    return Object.keys(nextErrors).length === 0 && Object.keys(nextFieldErrors).length === 0;
  }

  function changedFieldWrites(): Array<{ definition: FieldDefinition; raw: string }> {
    const writes: Array<{ definition: FieldDefinition; raw: string }> = [];
    for (const definition of definitions.data?.items ?? []) {
      if (!definition.active) continue;
      const raw = rawOf(definition);
      const baseline = isEdit ? savedValueOf(definition) : "";
      if (raw !== baseline) writes.push({ definition, raw });
    }
    return writes;
  }

  const saveMutation = useMutation({
    mutationFn: async (input: { activate: boolean; overrideReason: string }) => {
      const writes = changedFieldWrites();
      const submitValues = { ...values, duplicateOverrideReason: input.overrideReason };
      if (detail) {
        const updated = await updateProperty(
          detail.propertyId,
          toUpdateRequest(submitValues, input.activate),
          current?.version ?? detail.version,
        );
        let version = updated.version;
        for (const write of writes) {
          const written = await putFieldValue(
            detail.propertyId,
            write.definition.fieldDefinitionId,
            toFieldPayload(write.definition, write.raw),
            version,
          );
          version = written.version;
        }
        return { propertyId: detail.propertyId, partial: false };
      }
      const created = await createProperty(toCreateRequest(submitValues));
      try {
        let version = created.version;
        for (const write of writes) {
          const written = await putFieldValue(
            created.propertyId,
            write.definition.fieldDefinitionId,
            toFieldPayload(write.definition, write.raw),
            version,
          );
          version = written.version;
        }
        for (const photo of queued) {
          const form = new FormData();
          form.append("file", photo.file);
          if (photo.description.trim() !== "") form.append("description", photo.description.trim());
          await uploadPhoto(created.propertyId, form);
        }
        if (input.activate) {
          const latest = await fetchProperty(created.propertyId);
          await updateProperty(created.propertyId, { registrationStage: "ACTIVE" }, latest.version);
        }
      } catch (caught) {
        throw Object.assign(new Error("partial"), {
          propertyId: created.propertyId,
          cause: caught,
        });
      }
      return { propertyId: created.propertyId, partial: false };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      router.push(`/properties/${result.propertyId}`);
    },
    onError: async (caught) => {
      const partial = caught as { propertyId?: number; cause?: unknown };
      if (partial.propertyId !== undefined) {
        await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
        setFormError(
          `${describePropertyError(partial.cause, "일부 내용을 저장하지 못했습니다.")} 매물은 임시저장되었습니다. 매물 수정 화면에서 이어서 입력해 주세요.`,
        );
        setNotice(undefined);
        router.push(`/properties/${partial.propertyId}/edit`);
        return;
      }
      if (isApiCode(caught, "VERSION_CONFLICT")) {
        setIsConflict(true);
        await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      }
      const mapped = fieldErrorMap(caught);
      if (Object.keys(mapped).length > 0) {
        setErrors((currentErrors) => ({ ...currentErrors, ...mapped }));
      }
      setFormError(
        describePropertyError(caught, "매물을 저장하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  const photoMutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: async () => {
      setPhotoError(undefined);
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
    onError: (caught) =>
      setPhotoError(describePropertyError(caught, "사진을 처리하지 못했습니다.")),
  });

  async function submit(activate: boolean) {
    setFormError(undefined);
    setIsConflict(false);
    setNotice(undefined);
    pendingActivate.current = activate;
    if (!validateAll(activate)) return;
    if (!isEdit && values.address.trim() !== "" && values.duplicateOverrideReason === "") {
      try {
        const result = await checkDuplicateProperty(
          values.address.trim(),
          values.addressDetail.trim(),
        );
        if (result.matches.length > 0) {
          setDuplicates(result.matches);
          return;
        }
      } catch (caught) {
        setFormError(
          describePropertyError(caught, "같은 주소의 매물이 있는지 확인하지 못했습니다."),
        );
        return;
      }
    }
    saveMutation.mutate({ activate, overrideReason: values.duplicateOverrideReason });
  }

  function confirmDuplicate() {
    if (values.duplicateOverrideReason.trim() === "") {
      setDuplicateError("별도 등록 사유를 입력해 주세요.");
      return;
    }
    setDuplicateError(undefined);
    setDuplicates(null);
    saveMutation.mutate({
      activate: pendingActivate.current,
      overrideReason: values.duplicateOverrideReason.trim(),
    });
  }

  function addQueuedPhotos(files: File[]) {
    let count = queued.length;
    const accepted: QueuedPhoto[] = [];
    for (const file of files) {
      const problem = validatePhotoFile(file, count);
      if (problem) {
        setPhotoError(problem);
        continue;
      }
      photoSeq.current += 1;
      accepted.push(toQueuedPhoto(file, `queued-${photoSeq.current}`));
      count += 1;
    }
    if (accepted.length > 0) setPhotoError(undefined);
    setQueued((existing) => [...existing, ...accepted]);
  }

  function uploadSaved(files: File[]) {
    if (!detail) return;
    const existingCount = current?.photos.length ?? 0;
    const first = files[0];
    if (!first) return;
    const problem = validatePhotoFile(first, existingCount);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    const form = new FormData();
    form.append("file", first);
    photoMutation.mutate(() => uploadPhoto(detail.propertyId, form));
  }

  const isBusy = saveMutation.isPending;
  const title = isEdit ? "매물 수정" : "매물 등록";
  const isDraft = !isEdit || current?.registrationStage === "DRAFT";

  return (
    <form
      noValidate
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      <PageHeader title={title} />
      <FormNotice>{PROPERTY_ENTRY_COPY.responsibility}</FormNotice>
      {isReadOnly ? (
        <FormNotice>
          결제가 지연되어 읽기만 가능합니다. 저장하려면 결제를 먼저 마쳐 주세요.
        </FormNotice>
      ) : null}
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {isConflict && props.mode === "edit" ? (
        <div>
          <Button variant="outlined" size="sm" onClick={() => props.onReload()}>
            최신 내용 불러오기
          </Button>
        </div>
      ) : null}
      {notice ? <FormNotice>{notice}</FormNotice> : null}

      <Section title="기본 정보">
        <TextField
          label="매물명"
          required
          value={values.name}
          maxLength={100}
          onValueChange={(value) => setField("name", value)}
          error={errors.name}
        />
        {isEdit ? (
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold text-ink">카테고리</p>
            <div className="flex items-center gap-3">
              <span className="text-body text-ink">{current?.categoryName}</span>
              <Button
                variant="outlined"
                size="sm"
                disabled={isReadOnly}
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                카테고리 변경
              </Button>
            </div>
          </div>
        ) : (
          <SelectField
            label="카테고리"
            required
            value={values.categoryId}
            placeholder="카테고리를 선택해 주세요."
            options={(categories.data?.items ?? [])
              .filter((item) => item.active)
              .map((item) => ({ value: String(item.categoryId), label: item.name }))}
            onValueChange={(value) => {
              setField("categoryId", value);
              setFieldRaw({});
              setFieldErrors({});
            }}
            error={errors.categoryId}
          />
        )}
        <TextField
          label="매물 주소"
          value={values.address}
          onValueChange={(value) => {
            setField("address", value);
            setField("duplicateOverrideReason", "");
          }}
          error={errors.address}
        />
        <TextField
          label="매물 상세 주소 (선택)"
          value={values.addressDetail}
          onValueChange={(value) => setField("addressDetail", value)}
          error={errors.addressDetail}
        />
        <SelectField
          label="담당 공인중개사"
          value={values.managingMembershipId}
          options={[
            { value: "", label: "선택 안 함" },
            ...(members.data ?? []).map((item) => ({
              value: String(item.membershipId),
              label: item.displayName,
            })),
          ]}
          onValueChange={(value) => setField("managingMembershipId", value)}
          error={errors.managingMembershipId}
        />
      </Section>

      <Section title="면적·입주·점유">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="전용면적 (㎡)"
            inputMode="decimal"
            value={values.exclusiveAreaSqm}
            onValueChange={(value) => setField("exclusiveAreaSqm", value)}
            error={errors.exclusiveAreaSqm}
          />
          <TextField
            label="공급면적 (㎡)"
            inputMode="decimal"
            value={values.supplyAreaSqm}
            onValueChange={(value) => setField("supplyAreaSqm", value)}
            error={errors.supplyAreaSqm}
          />
          <TextField
            label="대지면적 (㎡)"
            inputMode="decimal"
            value={values.landAreaSqm}
            onValueChange={(value) => setField("landAreaSqm", value)}
            error={errors.landAreaSqm}
          />
          <TextField
            label="연면적 (㎡)"
            inputMode="decimal"
            value={values.grossFloorAreaSqm}
            onValueChange={(value) => setField("grossFloorAreaSqm", value)}
            error={errors.grossFloorAreaSqm}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <DateTimeField
            label="입주 가능일"
            kind="date"
            value={values.moveInDate}
            onValueChange={(value) => setField("moveInDate", value)}
            error={errors.moveInDate}
          />
          <div className="flex items-end pb-3">
            <Checkbox
              label="입주 가능일 협의"
              checked={values.moveInNegotiable}
              onCheckedChange={(value) => setField("moveInNegotiable", value)}
            />
          </div>
          <TextField
            label="관리비 (원)"
            kind="number"
            value={values.maintenanceFeeAmount}
            onValueChange={(value) => setField("maintenanceFeeAmount", value)}
            error={errors.maintenanceFeeAmount}
          />
          <TextField
            label="관리비 포함 항목"
            value={values.maintenanceFeeItems}
            onValueChange={(value) => setField("maintenanceFeeItems", value)}
            error={errors.maintenanceFeeItems}
          />
        </div>
        <SelectField
          label="점유상태"
          value={values.occupancyStatus}
          options={OCCUPANCY_STATUSES.map((value) => ({ value, label: OCCUPANCY_LABEL[value] }))}
          onValueChange={(value) => setField("occupancyStatus", value)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <DateTimeField
            label="참고 임대 만기일"
            kind="date"
            value={values.referenceLeaseEndDate}
            onValueChange={(value) => setField("referenceLeaseEndDate", value)}
            error={errors.referenceLeaseEndDate}
          />
          <TextField
            label="만기일 확인 출처"
            value={values.referenceLeaseEndSource}
            onValueChange={(value) => setField("referenceLeaseEndSource", value)}
            error={errors.referenceLeaseEndSource}
          />
        </div>
      </Section>

      <Section title="설명·메모">
        <TextAreaField
          label="설명"
          value={values.description}
          onValueChange={(value) => setField("description", value)}
          error={errors.description}
        />
        <TextAreaField
          label="사무소 내부 메모"
          value={values.memo}
          onValueChange={(value) => setField("memo", value)}
          error={errors.memo}
        />
      </Section>

      <Section title="카테고리 전용 정보">
        {categoryId === null ? (
          <p className="text-caption text-ink-2">
            카테고리를 선택하면 전용 입력 항목이 나타납니다.
          </p>
        ) : definitions.isPending ? (
          <p role="status" className="text-caption text-ink-2">
            입력 항목을 불러오는 중입니다.
          </p>
        ) : definitions.isError ? (
          <FormAlert>
            전용 입력 항목을 불러오지 못했습니다.{" "}
            <button type="button" className="underline" onClick={() => void definitions.refetch()}>
              다시 시도
            </button>
          </FormAlert>
        ) : (
          <CustomFieldsSection
            definitions={definitions.data.items}
            values={displayedValues}
            errors={fieldErrors}
            disabled={isReadOnly}
            onChange={(id, raw) => {
              setFieldRaw((existing) => ({ ...existing, [id]: raw }));
              setFieldErrors((existing) => ({ ...existing, [id]: undefined }));
            }}
          />
        )}
      </Section>

      <Section title="사진">
        {detail ? (
          <SavedPhotoList
            photos={(current?.photos ?? []).map((photo) => ({
              photoId: photo.photoId,
              url: photo.url,
              description: photo.description,
              sortOrder: photo.sortOrder,
            }))}
            error={photoError}
            isBusy={photoMutation.isPending}
            onAdd={uploadSaved}
            onSave={(photoId, description, sortOrder) =>
              photoMutation.mutate(() =>
                updatePhoto(
                  detail.propertyId,
                  photoId,
                  {
                    description: description.trim() === "" ? null : description.trim(),
                    sortOrder,
                  },
                  current?.version ?? detail.version,
                ),
              )
            }
            onDelete={(photoId) =>
              photoMutation.mutate(() => deletePhoto(detail.propertyId, photoId))
            }
          />
        ) : (
          <QueuedPhotoList
            photos={queued}
            error={photoError}
            onAdd={addQueuedPhotos}
            onChange={(key, description) =>
              setQueued((existing) =>
                existing.map((photo) => (photo.key === key ? { ...photo, description } : photo)),
              )
            }
            onRemove={(key) =>
              setQueued((existing) => existing.filter((photo) => photo.key !== key))
            }
          />
        )}
      </Section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={detail ? `/properties/${detail.propertyId}` : "/properties"}
          className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-control bg-primary-soft px-10 text-body font-medium text-ink-2 hover:bg-primary-line"
        >
          취소
        </Link>
        <Button
          type="submit"
          variant={isDraft ? "outlined" : "submit"}
          isLoading={isBusy}
          disabled={isReadOnly}
        >
          {isEdit ? "저장" : "임시저장"}
        </Button>
        {isDraft ? (
          <Button isLoading={isBusy} disabled={isReadOnly} onClick={() => void submit(true)}>
            {isEdit ? "활성 등록으로 전환" : "활성 등록"}
          </Button>
        ) : null}
      </div>

      {duplicates ? (
        <DuplicateDialog
          matches={duplicates}
          reason={values.duplicateOverrideReason}
          error={duplicateError}
          isPending={saveMutation.isPending}
          onReasonChange={(value) => {
            setField("duplicateOverrideReason", value);
            setDuplicateError(undefined);
          }}
          onConfirm={confirmDuplicate}
          onClose={() => setDuplicates(null)}
        />
      ) : null}
      {isCategoryDialogOpen && detail ? (
        <CategoryChangeDialog
          propertyId={detail.propertyId}
          currentCategoryId={current?.categoryId ?? detail.categoryId}
          version={current?.version ?? detail.version}
          onClose={() => setIsCategoryDialogOpen(false)}
          onChanged={() => {
            setIsCategoryDialogOpen(false);
            setFieldRaw({});
            setFieldErrors({});
            if (props.mode === "edit") {
              props.onReload("카테고리를 바꿨습니다. 이전 입력값은 보관되었습니다.");
            }
          }}
        />
      ) : null}
    </form>
  );
}

function TextAreaField({
  label,
  value,
  onValueChange,
  error,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
}) {
  const id = `textarea-${label}`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        className="rounded-control border border-line bg-surface p-4 text-body text-ink focus:border-primary focus:bg-white"
      />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PropertyCreateScreen() {
  return <PropertyForm mode="create" />;
}

export function PropertyEditScreen({ propertyId }: { propertyId: number }) {
  const query = usePropertyDetail(propertyId);
  const [resetKey, setResetKey] = useState(0);
  const [reloadNotice, setReloadNotice] = useState<string>();
  const queryClient = useQueryClient();
  return (
    <QueryGate query={query} loadingLabel="매물 정보를 불러오는 중입니다.">
      {(detail) =>
        detail.deletedAt ? (
          <FormAlert>
            보관된 매물은 수정할 수 없습니다. 매물 상세에서 복원한 뒤 수정해 주세요.
          </FormAlert>
        ) : (
          <PropertyForm
            key={`${propertyId}-${resetKey}`}
            mode="edit"
            detail={detail}
            initialNotice={reloadNotice}
            onReload={(notice) => {
              setReloadNotice(notice);
              void queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
              setResetKey((value) => value + 1);
            }}
          />
        )
      }
    </QueryGate>
  );
}
