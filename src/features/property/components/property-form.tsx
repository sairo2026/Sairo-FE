"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { checkDuplicateAddress, createProperty, updateProperty } from "../api/property.api";
import { dealTypeLabels, optionalText } from "../model/property";
import { propertyDealTypes, type PropertyDealType } from "../schemas/property.schema";

function toFieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fieldErrors?.length) return {};
  return Object.fromEntries(error.fieldErrors.map((item) => [item.field, item.message]));
}

function toGeneralErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && !error.fieldErrors?.length) return error.message;
  return fallback;
}

type PropertyFormProps = {
  mode: "create" | "edit";
  propertyId?: number;
  initialValues?: {
    address: string;
    addressDetail: string | null;
    propertyName: string | null;
    dealType: PropertyDealType;
  };
};

export function PropertyForm({ mode, propertyId, initialValues }: PropertyFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [addressDetail, setAddressDetail] = useState(initialValues?.addressDetail ?? "");
  const [propertyName, setPropertyName] = useState(initialValues?.propertyName ?? "");
  const [dealType, setDealType] = useState<PropertyDealType>(initialValues?.dealType ?? "MONTHLY");
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isDuplicateOpen) return;
    dialogTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsDuplicateOpen(false);
        return;
      }
      const dialog = dialogRef.current;
      if (event.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      dialogTriggerRef.current?.focus();
    };
  }, [isDuplicateOpen]);

  async function save() {
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      if (mode === "create") {
        await createProperty({
          address: address.trim(),
          addressDetail: optionalText(addressDetail),
          propertyName: optionalText(propertyName),
          dealType,
        });
        router.push("/properties");
      } else if (propertyId !== undefined) {
        await updateProperty(propertyId, {
          address: address.trim(),
          addressDetail: optionalText(addressDetail),
          propertyName: optionalText(propertyName),
        });
        router.push(`/properties/${propertyId}`);
      }
      router.refresh();
    } catch (caught: unknown) {
      setFieldErrors(toFieldErrorMap(caught));
      setError(
        toGeneralErrorMessage(
          caught,
          "매물 정보를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address.trim()) {
      setError("매물 주소를 입력해주세요.");
      return;
    }
    if (mode === "edit") {
      await save();
      return;
    }
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const duplicates = await checkDuplicateAddress(address.trim());
      if (duplicates.length > 0) {
        const firstDuplicate = duplicates[0];
        setDuplicateId(firstDuplicate?.propertyId ?? null);
        setIsDuplicateOpen(true);
        return;
      }
      await save();
    } catch (caught: unknown) {
      setError(
        toGeneralErrorMessage(
          caught,
          "중복 주소를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-[596px]">
        <h1 className="mb-10 text-3xl font-bold">
          {mode === "create" ? "매물 등록" : "매물 정보 수정"}
        </h1>
        <div className="space-y-8">
          <FormField
            label="매물 주소"
            value={address}
            onChange={setAddress}
            placeholder="매물의 주소를 입력해 주세요."
            required
            error={fieldErrors.address}
          />
          <FormField
            label="매물 상세 주소"
            optional
            value={addressDetail}
            onChange={setAddressDetail}
            placeholder="호수 등 매물의 상세 주소를 입력해 주세요."
            error={fieldErrors.addressDetail}
          />
          <FormField
            label="매물명"
            optional
            value={propertyName}
            onChange={setPropertyName}
            placeholder="매물을 간단하게 저장할 이름을 입력해 주세요."
            error={fieldErrors.propertyName}
          />
          <fieldset>
            <legend className="mb-5 text-lg font-bold">
              거래 유형{" "}
              {mode === "edit" ? (
                <span className="font-medium text-slate-400">(수정이 불가능합니다.)</span>
              ) : null}
            </legend>
            <div className="flex gap-4">
              {propertyDealTypes.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={mode === "edit"}
                  onClick={() => setDealType(value)}
                  className={`rounded-lg border px-6 py-4 font-semibold transition-colors ${dealType === value ? "border-[#3937b8] bg-white text-[#3937b8]" : "border-[#dfe3ec] bg-[#f8f9fd] enabled:hover:border-[#3937b8]"}`}
                >
                  {dealTypeLabels[value]}
                </button>
              ))}
            </div>
            {fieldErrors.dealType ? (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {fieldErrors.dealType}
              </p>
            ) : null}
          </fieldset>
        </div>
        {error ? (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div className="mt-28 flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-[#f0f0ff] px-10 py-4 font-semibold text-slate-600 transition-colors hover:bg-[#e4e4fb]"
          >
            {mode === "edit" ? "수정 취소" : "취소"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#3937b8] px-12 py-4 font-semibold text-white transition-opacity enabled:hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "처리 중" : "등록"}
          </button>
        </div>
      </form>
      {isDuplicateOpen ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-title"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 outline-none"
        >
          <div className="rounded-3xl bg-white px-10 py-12 text-center shadow-xl">
            <h2 id="duplicate-title" className="mb-10 text-2xl font-bold">
              중복된 주소의 매물이 이미 등록되어 있습니다.
            </h2>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => duplicateId !== null && router.push(`/properties/${duplicateId}`)}
                className="rounded-lg bg-[#f0f0ff] px-6 py-4 font-semibold text-slate-600 transition-colors hover:bg-[#e4e4fb]"
              >
                기존 매물 확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDuplicateOpen(false);
                  void save();
                }}
                className="rounded-lg bg-[#3937b8] px-6 py-4 font-semibold text-white transition-opacity hover:opacity-90"
              >
                그래도 등록
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type FormFieldProps = {
  label: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
};
function FormField({
  label,
  optional,
  value,
  onChange,
  placeholder,
  required,
  error,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-5 block text-lg font-bold">
        {label} {optional ? <span className="font-medium text-slate-400">(선택)</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`h-14 w-full rounded-lg border bg-[#f8f9fd] px-5 ${error ? "border-red-500" : "border-[#dfe3ec]"}`}
      />
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </label>
  );
}
