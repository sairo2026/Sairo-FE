"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { EnterpriseLeadStatusResponse } from "@/lib/api/contracts/support.schema";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { DetailList, StatusBadge } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Checkbox } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { ENTERPRISE_PRIVACY_COPY } from "@/shared/legal/notice-copy";
import { useLegalCompanyInfo } from "@/shared/legal/use-legal-values";
import { formatKrw, formatSeoulDateTime } from "@/shared/lib/format";
import {
  acceptEnterpriseQuote,
  createEnterpriseLead,
  fetchEnterpriseLead,
  rejectEnterpriseQuote,
} from "../api/support.api";
import { ENTERPRISE_STATUS } from "../model/labels";
import { SUPPORT_COPY as COPY, describeSupportError } from "../model/messages";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  branchCount: string;
  expectedSeats: string;
  migrationNeeded: boolean;
  content: string;
  acknowledged: boolean;
};

const EMPTY_FORM: FormState = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  branchCount: "1",
  expectedSeats: "",
  migrationNeeded: false,
  content: "",
  acknowledged: false,
};

function EnterprisePrivacyNotice() {
  const company = useLegalCompanyInfo();
  const operator = company.data?.businessName;
  const contact = company.data?.privacyContact;
  return (
    <div className="flex flex-col gap-1 text-caption text-ink-2">
      <p className="font-semibold">{ENTERPRISE_PRIVACY_COPY.title}</p>
      <ul className="flex flex-col gap-1">
        {ENTERPRISE_PRIVACY_COPY.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {operator ? <li>관리 주체: {operator}</li> : null}
        {contact ? <li>문의: {contact}</li> : null}
      </ul>
      <p>{ENTERPRISE_PRIVACY_COPY.caution}</p>
    </div>
  );
}

function LeadForm({
  onCreated,
}: {
  onCreated: (created: { leadId: number; trackingKey: string }) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: createEnterpriseLead,
    onSuccess: (created) => {
      setForm(EMPTY_FORM);
      onCreated({ leadId: created.leadId, trackingKey: created.trackingKey });
    },
    onError: (caught) => setError(describeSupportError(caught, "문의를 접수하지 못했습니다.")),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function submit() {
    const next: Record<string, string> = {};
    if (form.companyName.trim() === "") next.companyName = COPY.fieldRequired;
    if (form.contactName.trim() === "") next.contactName = COPY.fieldRequired;
    if (!EMAIL_PATTERN.test(form.contactEmail.trim())) next.contactEmail = COPY.emailInvalid;
    if (form.contactPhone.trim() === "") next.contactPhone = COPY.fieldRequired;
    if (!/^\d+$/.test(form.branchCount) || Number(form.branchCount) < 1) {
      next.branchCount = COPY.positiveNumber;
    }
    if (!/^\d+$/.test(form.expectedSeats) || Number(form.expectedSeats) < 1) {
      next.expectedSeats = COPY.positiveNumber;
    }
    if (form.content.trim() === "") next.content = COPY.fieldRequired;
    if (!form.acknowledged) next.acknowledged = COPY.privacyNoticeRequired;
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      branchCount: Number(form.branchCount),
      expectedSeats: Number(form.expectedSeats),
      migrationNeeded: form.migrationNeeded,
      content: form.content.trim(),
      privacyNoticeAcknowledged: true,
    });
  }

  return (
    <Card title={COPY.enterpriseFormTitle}>
      <div className="flex flex-col gap-5">
        <TextField
          label={COPY.companyName}
          value={form.companyName}
          onValueChange={(value) => update("companyName", value)}
          error={errors.companyName || undefined}
          required
        />
        <TextField
          label={COPY.contactName}
          value={form.contactName}
          onValueChange={(value) => update("contactName", value)}
          error={errors.contactName || undefined}
          required
        />
        <TextField
          label={COPY.contactEmail}
          value={form.contactEmail}
          onValueChange={(value) => update("contactEmail", value)}
          error={errors.contactEmail || undefined}
          required
        />
        <TextField
          label={COPY.contactPhone}
          kind="tel"
          value={form.contactPhone}
          onValueChange={(value) => update("contactPhone", value)}
          error={errors.contactPhone || undefined}
          required
        />
        <TextField
          label={COPY.branchCount}
          kind="number"
          value={form.branchCount}
          onValueChange={(value) => update("branchCount", value)}
          error={errors.branchCount || undefined}
          required
        />
        <TextField
          label={COPY.expectedSeats}
          kind="number"
          value={form.expectedSeats}
          onValueChange={(value) => update("expectedSeats", value)}
          error={errors.expectedSeats || undefined}
          required
        />
        <Checkbox
          label={COPY.migrationNeeded}
          checked={form.migrationNeeded}
          onCheckedChange={(checked) => update("migrationNeeded", checked)}
        />
        <TextAreaField
          label={COPY.enterpriseContent}
          value={form.content}
          onValueChange={(value) => update("content", value)}
          error={errors.content || undefined}
        />
        <EnterprisePrivacyNotice />
        <div className="flex flex-col gap-1">
          <Checkbox
            label={COPY.privacyNoticeLabel}
            checked={form.acknowledged}
            onCheckedChange={(checked) => update("acknowledged", checked)}
          />
          {errors.acknowledged ? (
            <p role="alert" className="text-caption text-danger">
              {errors.acknowledged}
            </p>
          ) : null}
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div>
          <Button isLoading={mutation.isPending} onClick={submit}>
            {COPY.enterpriseSubmit}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Lookup({ initial }: { initial: { leadId: string; trackingKey: string } }) {
  const [leadId, setLeadId] = useState(initial.leadId);
  const [trackingKey, setTrackingKey] = useState(initial.trackingKey);
  const [lead, setLead] = useState<EnterpriseLeadStatusResponse>();
  const [lookedUp, setLookedUp] = useState<{ leadId: number; trackingKey: string }>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [now] = useState(() => Date.now());

  const lookupMutation = useMutation({
    mutationFn: fetchEnterpriseLead,
    onSuccess: (result, variables) => {
      setLead(result);
      setLookedUp(variables);
      setError(undefined);
    },
    onError: (caught) => {
      setLead(undefined);
      setError(
        caught instanceof ApiError && caught.status === 404
          ? COPY.lookupNotFound
          : describeSupportError(caught, "진행 상태를 조회하지 못했습니다."),
      );
    },
  });

  const decideMutation = useMutation({
    mutationFn: (request: { kind: "accept" | "reject"; quoteId: number }) => {
      if (!lookedUp) throw new Error("조회 정보가 없습니다.");
      const body = {
        leadId: lookedUp.leadId,
        quoteId: request.quoteId,
        trackingKey: lookedUp.trackingKey,
      };
      return request.kind === "accept" ? acceptEnterpriseQuote(body) : rejectEnterpriseQuote(body);
    },
    onSuccess: (result, variables) => {
      setError(undefined);
      setMessage(variables.kind === "accept" ? COPY.quoteAccepted : COPY.quoteRejected);
      setLead((current) => (current ? { ...current, status: result.status } : current));
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeSupportError(caught, "견적을 처리하지 못했습니다."));
    },
  });

  function lookup() {
    const next: Record<string, string> = {};
    if (!/^\d+$/.test(leadId)) next.leadId = COPY.fieldRequired;
    if (trackingKey.trim() === "") next.trackingKey = COPY.fieldRequired;
    setErrors(next);
    setError(undefined);
    setMessage(undefined);
    if (Object.keys(next).length > 0) return;
    lookupMutation.mutate({ leadId: Number(leadId), trackingKey: trackingKey.trim() });
  }

  const status = lead ? ENTERPRISE_STATUS[lead.status] : undefined;
  const isExpired =
    lead?.quoteExpiresAt !== null &&
    lead?.quoteExpiresAt !== undefined &&
    new Date(lead.quoteExpiresAt).getTime() < now;
  const canDecide =
    lead !== undefined &&
    lead.status === "QUOTED" &&
    lead.quoteId !== null &&
    lead.quoteId !== undefined &&
    !isExpired;

  return (
    <Card title={COPY.enterpriseLookupTitle}>
      <div className="flex flex-col gap-5">
        <TextField
          label={COPY.lookupLeadId}
          kind="number"
          value={leadId}
          onValueChange={setLeadId}
          error={errors.leadId}
        />
        <TextField
          label={COPY.lookupKey}
          value={trackingKey}
          onValueChange={setTrackingKey}
          error={errors.trackingKey}
          autoComplete="off"
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div>
          <Button variant="outlined" isLoading={lookupMutation.isPending} onClick={lookup}>
            {COPY.lookupSubmit}
          </Button>
        </div>
        {lead ? (
          <section aria-label="문의 진행 상태" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge tone={status?.tone ?? "gray"} label={status?.label ?? lead.status} />
              <span className="text-caption text-ink-2">
                {formatSeoulDateTime(lead.updatedAt)} 갱신
              </span>
            </div>
            {lead.quoteAmount !== null && lead.quoteAmount !== undefined ? (
              <DetailList
                items={[
                  { label: COPY.quoteAmount, value: formatKrw(lead.quoteAmount) },
                  {
                    label: COPY.quoteExpires,
                    value: lead.quoteExpiresAt ? formatSeoulDateTime(lead.quoteExpiresAt) : "-",
                  },
                ]}
              />
            ) : null}
            {canDecide && lead.quoteId !== null && lead.quoteId !== undefined ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  isLoading={decideMutation.isPending}
                  onClick={() =>
                    decideMutation.mutate({ kind: "accept", quoteId: lead.quoteId ?? 0 })
                  }
                >
                  {COPY.quoteAccept}
                </Button>
                <Button
                  variant="ghost"
                  isLoading={decideMutation.isPending}
                  onClick={() =>
                    decideMutation.mutate({ kind: "reject", quoteId: lead.quoteId ?? 0 })
                  }
                >
                  {COPY.quoteReject}
                </Button>
              </div>
            ) : null}
            {lead.status === "QUOTED" && isExpired ? (
              <p className="text-caption text-ink-2">{COPY.quoteExpiredNote}</p>
            ) : null}
            {message ? (
              <p role="status" className="text-caption font-semibold text-primary">
                {message}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </Card>
  );
}

export function EnterpriseScreen() {
  const [created, setCreated] = useState<{ leadId: number; trackingKey: string }>();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={COPY.enterprisePageTitle} description={COPY.enterpriseDescription} />
      {created ? (
        <FormNotice>
          <span className="flex flex-col gap-1">
            <span>{COPY.keyNotice}</span>
            <span>{ENTERPRISE_PRIVACY_COPY.keyWarning}</span>
            <span>
              {COPY.leadId} <strong>{created.leadId}</strong>
            </span>
            <span>
              {COPY.trackingKey} <strong className="break-all">{created.trackingKey}</strong>
            </span>
          </span>
        </FormNotice>
      ) : null}
      <LeadForm onCreated={setCreated} />
      <Lookup
        key={created ? created.leadId : "empty"}
        initial={{
          leadId: created ? String(created.leadId) : "",
          trackingKey: created?.trackingKey ?? "",
        }}
      />
    </div>
  );
}
