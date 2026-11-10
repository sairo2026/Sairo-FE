"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { TextLink } from "@/shared/components/feedback/page-parts";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/ui/page-header";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { SupportInquiryNotice } from "@/shared/legal/data-rights-notices";
import { countCodePoints } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { createInquiry } from "../api/support.api";
import { supportKeys } from "../hooks/support-queries";
import { INQUIRY_CATEGORIES, INQUIRY_CONTENT_MAX } from "../model/labels";
import { SUPPORT_COPY as COPY, describeSupportError } from "../model/messages";

export function InquiryNewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role, isReadOnly } = useOfficeAccess();
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: createInquiry,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: supportKeys.all });
      router.push(`/support/${created.inquiryId}?received=1`);
    },
    onError: (caught) => setError(describeSupportError(caught, "문의를 접수하지 못했습니다.")),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (category === "") next.category = COPY.categoryRequired;
    if (content.trim() === "") next.content = COPY.contentRequired;
    else if (countCodePoints(content) > INQUIRY_CONTENT_MAX) {
      next.content = COPY.contentTooLong(INQUIRY_CONTENT_MAX);
    }
    setErrors(next);
    setError(undefined);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({
      category,
      content: content.trim(),
      requestScope: scope.trim() === "" ? null : scope.trim(),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <PageHeader
        title={COPY.newTitle}
        actions={<TextLink href="/support">서비스 이용</TextLink>}
      />
      <SupportInquiryNotice isOwner={role === "OWNER"} />
      <Card>
        <div className="flex flex-col gap-5">
          <SelectField
            label={COPY.categoryLabel}
            value={category}
            placeholder={COPY.categoryPlaceholder}
            options={INQUIRY_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))}
            onValueChange={(value) => {
              setCategory(value);
              setErrors((current) => ({ ...current, category: "" }));
            }}
            error={errors.category || undefined}
          />
          <TextAreaField
            label={COPY.contentLabel}
            value={content}
            onValueChange={(value) => {
              setContent(value);
              setErrors((current) => ({ ...current, content: "" }));
            }}
            error={errors.content || undefined}
            hint={`${countCodePoints(content)} / ${INQUIRY_CONTENT_MAX}자`}
          />
          <TextField
            label={COPY.scopeLabel}
            value={scope}
            onValueChange={setScope}
            hint={COPY.scopeHint}
            maxLength={500}
          />
          {error ? <FormAlert>{error}</FormAlert> : null}
          <div>
            <Button isLoading={mutation.isPending} disabled={isReadOnly} onClick={submit}>
              {COPY.submit}
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
