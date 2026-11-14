"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PropertyOfferListResponse } from "@/lib/api/contracts/property.schema";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Chip } from "@/shared/components/ui/chip";
import { TextField } from "@/shared/components/ui/text-field";
import { createOffer, updateOffer } from "../api/property.api";
import { propertyKeys, usePropertyOffers } from "../hooks/property-queries";
import { formatOfferPrice, formatWonCompact } from "../model/format";
import {
  DEAL_TYPES,
  DEAL_TYPE_LABEL,
  OFFER_STATUS_LABEL,
  OFFER_STATUS_TONE,
  SALE_PREMIUM_CATEGORY_NAME,
  labelOf,
  toneOf,
} from "../model/labels";
import type { DealType, OfferStatus } from "../model/labels";
import { describePropertyError, fieldErrorMap, isApiCode } from "../model/messages";

type Offer = PropertyOfferListResponse["items"][number];

type PriceValues = { salePrice: string; deposit: string; rent: string; premium: string };
const EMPTY_PRICES: PriceValues = { salePrice: "", deposit: "", rent: "", premium: "" };

const ACTIVE_STATUSES: readonly string[] = ["AVAILABLE", "NEGOTIATING"];

const TRANSITIONS: Record<string, Array<{ to: OfferStatus; label: string }>> = {
  AVAILABLE: [
    { to: "NEGOTIATING", label: "협의 시작" },
    { to: "COMPLETED", label: "거래 완료" },
    { to: "WITHDRAWN", label: "철회" },
  ],
  NEGOTIATING: [
    { to: "AVAILABLE", label: "협의 중단" },
    { to: "COMPLETED", label: "거래 완료" },
    { to: "WITHDRAWN", label: "철회" },
  ],
};

function validatePrices(
  dealType: DealType,
  values: PriceValues,
  allowPremium: boolean,
): Partial<Record<keyof PriceValues, string>> {
  const errors: Partial<Record<keyof PriceValues, string>> = {};
  const amount = /^\d+$/;
  if (dealType === "SALE" && !amount.test(values.salePrice.trim())) {
    errors.salePrice = "매매가를 0 이상의 정수(원)로 입력해 주세요.";
  }
  if ((dealType === "JEONSE" || dealType === "MONTHLY") && !amount.test(values.deposit.trim())) {
    errors.deposit = "보증금을 0 이상의 정수(원)로 입력해 주세요.";
  }
  if (dealType === "MONTHLY" && !amount.test(values.rent.trim())) {
    errors.rent = "월세를 0 이상의 정수(원)로 입력해 주세요.";
  }
  const premium = values.premium.trim();
  if (allowPremium && premium !== "" && !/^-?\d+$/.test(premium)) {
    errors.premium = "프리미엄은 정수(원)로 입력해 주세요. 음수도 입력할 수 있습니다.";
  }
  return errors;
}

function toPriceBody(dealType: DealType, values: PriceValues, allowPremium: boolean) {
  const premium = values.premium.trim();
  return {
    salePrice: dealType === "SALE" ? Number(values.salePrice) : null,
    depositAmount: dealType === "SALE" ? null : Number(values.deposit),
    monthlyRentAmount: dealType === "MONTHLY" ? Number(values.rent) : null,
    premiumAmount: allowPremium && premium !== "" ? Number(premium) : null,
  };
}

function PriceForm({
  dealType,
  allowPremium,
  initial,
  submitLabel,
  isPending,
  serverErrors,
  onSubmit,
  onCancel,
}: {
  dealType: DealType;
  allowPremium: boolean;
  initial: PriceValues;
  submitLabel: string;
  isPending: boolean;
  serverErrors: Record<string, string>;
  onSubmit: (body: ReturnType<typeof toPriceBody>) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<PriceValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof PriceValues, string>>>({});

  function set(key: keyof PriceValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const next = validatePrices(dealType, values, allowPremium);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(toPriceBody(dealType, values, allowPremium));
  }

  const hintOf = (value: string) =>
    /^-?\d+$/.test(value.trim()) ? formatWonCompact(Number(value)) : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {dealType === "SALE" ? (
        <TextField
          label="매매가 (원)"
          kind="number"
          value={values.salePrice}
          hint={hintOf(values.salePrice)}
          onValueChange={(value) => set("salePrice", value)}
          error={errors.salePrice ?? serverErrors.salePrice}
        />
      ) : (
        <TextField
          label="보증금 (원)"
          kind="number"
          value={values.deposit}
          hint={hintOf(values.deposit)}
          onValueChange={(value) => set("deposit", value)}
          error={errors.deposit ?? serverErrors.depositAmount}
        />
      )}
      {dealType === "MONTHLY" ? (
        <TextField
          label="월세 (원)"
          kind="number"
          value={values.rent}
          hint={hintOf(values.rent)}
          onValueChange={(value) => set("rent", value)}
          error={errors.rent ?? serverErrors.monthlyRentAmount}
        />
      ) : null}
      {allowPremium ? (
        <TextField
          label="합의한 프리미엄 (원)"
          value={values.premium}
          hint="분양권 매물에서만 음수를 입력할 수 있습니다. 매물 전용 필드의 프리미엄과는 별개의 값입니다."
          onValueChange={(value) => set("premium", value)}
          error={errors.premium ?? serverErrors.premiumAmount}
        />
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={isPending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="cancel" size="sm" onClick={onCancel} disabled={isPending}>
            취소
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function pricesOf(offer: Offer): PriceValues {
  return {
    salePrice: offer.salePrice === null ? "" : String(offer.salePrice),
    deposit: offer.depositAmount === null ? "" : String(offer.depositAmount),
    rent: offer.monthlyRentAmount === null ? "" : String(offer.monthlyRentAmount),
    premium: offer.premiumAmount === null ? "" : String(offer.premiumAmount),
  };
}

function DealTypePanel({
  propertyId,
  dealType,
  offers,
  isArchived,
  allowPremium,
}: {
  propertyId: number;
  dealType: DealType;
  offers: Offer[];
  isArchived: boolean;
  allowPremium: boolean;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string>();
  const activeOffer = offers.find((offer) => ACTIVE_STATUSES.includes(offer.status));
  const closedOffers = offers.filter((offer) => !ACTIVE_STATUSES.includes(offer.status));

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
  }

  function handleError(caught: unknown) {
    if (isApiCode(caught, "VERSION_CONFLICT") || isApiCode(caught, "INVALID_TRANSITION")) {
      void refresh();
    }
    setServerErrors(fieldErrorMap(caught));
    setError(describePropertyError(caught, "제안을 저장하지 못했습니다. 다시 시도해 주세요."));
  }

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof toPriceBody>) =>
      createOffer(propertyId, { dealType, ...body }),
    onSuccess: async () => {
      setError(undefined);
      setServerErrors({});
      setNotice(`${DEAL_TYPE_LABEL[dealType]} 제안을 등록했습니다.`);
      await refresh();
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      offer: Offer;
      body: Partial<ReturnType<typeof toPriceBody>> & { status?: OfferStatus };
    }) => updateOffer(propertyId, input.offer.offerId, input.body, input.offer.version),
    onSuccess: async () => {
      setError(undefined);
      setServerErrors({});
      setIsEditing(false);
      setNotice("제안을 수정했습니다.");
      await refresh();
    },
    onError: handleError,
  });

  return (
    <div className="flex flex-col gap-4">
      {isArchived ? (
        <FormNotice>보관된 매물의 제안은 등록하거나 수정할 수 없습니다.</FormNotice>
      ) : null}
      {notice ? <FormNotice>{notice}</FormNotice> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
      {activeOffer ? (
        <div className="flex flex-col gap-3 rounded-card-flat border border-line p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={toneOf(OFFER_STATUS_TONE, activeOffer.status)}>
              {labelOf(OFFER_STATUS_LABEL, activeOffer.status)}
            </Badge>
            <p className="text-h2 font-semibold text-ink">{formatOfferPrice(activeOffer)}</p>
            {activeOffer.premiumAmount !== null ? (
              <span className="text-caption text-ink-2">
                합의 프리미엄 {formatWonCompact(activeOffer.premiumAmount)}
              </span>
            ) : null}
          </div>
          {isEditing ? (
            <PriceForm
              dealType={dealType}
              allowPremium={allowPremium}
              initial={pricesOf(activeOffer)}
              submitLabel="가격 저장"
              isPending={updateMutation.isPending}
              serverErrors={serverErrors}
              onSubmit={(body) => updateMutation.mutate({ offer: activeOffer, body })}
              onCancel={() => setIsEditing(false)}
            />
          ) : null}
          {!isArchived && !isEditing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outlined" size="sm" onClick={() => setIsEditing(true)}>
                가격 수정
              </Button>
              {(TRANSITIONS[activeOffer.status] ?? []).map((transition) => (
                <Button
                  key={transition.to}
                  variant="ghost"
                  size="sm"
                  isLoading={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ offer: activeOffer, body: { status: transition.to } })
                  }
                >
                  {transition.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : isArchived ? (
        <p className="text-body text-ink-2">등록된 {DEAL_TYPE_LABEL[dealType]} 제안이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-card-flat border border-dashed border-line p-5">
          <p className="text-body font-semibold text-ink">
            진행 중인 {DEAL_TYPE_LABEL[dealType]} 제안이 없습니다. 새로 등록해 주세요.
          </p>
          <PriceForm
            dealType={dealType}
            allowPremium={allowPremium}
            initial={EMPTY_PRICES}
            submitLabel="제안 등록"
            isPending={createMutation.isPending}
            serverErrors={serverErrors}
            onSubmit={(body) => createMutation.mutate(body)}
          />
        </div>
      )}
      {closedOffers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold text-ink-2">종료된 제안</p>
          <p className="text-caption text-ink-2">
            완료와 철회된 제안은 상태를 바꿀 수 없습니다. 계약이 취소되어도 완료된 제안은 되돌아가지
            않습니다.
          </p>
          <ul className="flex flex-col gap-2">
            {closedOffers.map((offer) => (
              <li key={offer.offerId} className="flex items-center gap-3 text-body text-ink">
                <Badge tone={toneOf(OFFER_STATUS_TONE, offer.status)}>
                  {labelOf(OFFER_STATUS_LABEL, offer.status)}
                </Badge>
                {formatOfferPrice(offer)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function OffersPanel({
  propertyId,
  categoryName,
  isArchived,
}: {
  propertyId: number;
  categoryName: string;
  isArchived: boolean;
}) {
  const query = usePropertyOffers(propertyId);
  const [dealType, setDealType] = useState<DealType>("MONTHLY");
  return (
    <QueryGate query={query} loadingLabel="거래 제안을 불러오는 중입니다.">
      {(data) => (
        <div className="flex flex-col gap-5">
          <div role="group" aria-label="거래유형" className="flex gap-2">
            {DEAL_TYPES.map((type) => (
              <Chip key={type} isSelected={dealType === type} onClick={() => setDealType(type)}>
                {DEAL_TYPE_LABEL[type]}
              </Chip>
            ))}
          </div>
          <DealTypePanel
            key={dealType}
            propertyId={propertyId}
            dealType={dealType}
            offers={data.items.filter((offer) => offer.dealType === dealType)}
            isArchived={isArchived}
            allowPremium={categoryName === SALE_PREMIUM_CATEGORY_NAME}
          />
        </div>
      )}
    </QueryGate>
  );
}
