"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import { FormAlert, FormNotice } from "@/shared/components/feedback/form-frame";
import { useRefreshOfficeState } from "../hooks/office-queries";
import { createRegistration, lookupOffice } from "../api/office.api";
import { ENTITY_TYPE_LABEL, APPLICANT_RELATION_OPTIONS } from "../model/labels";
import { describeOfficeError, fieldErrorMap, isApiCode } from "../model/messages";
import { formatBusinessNumber, validateLookup, validateRegistration } from "../model/validation";
import type { EntityType, FieldErrors, LookupField, RegistrationField } from "../model/validation";
import { Button } from "@/shared/components/ui/button";
import { RadioGroup, SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { REGISTRATION_NOTICE_COPY } from "../model/legal-copy";
import { ButtonRow, FlowFrame, MutedNote, TextLink } from "@/shared/components/feedback/page-parts";

const ENTITY_OPTIONS = (Object.keys(ENTITY_TYPE_LABEL) as EntityType[]).map((value) => ({
  value,
  label: ENTITY_TYPE_LABEL[value],
}));

type Step = "lookup" | "details";

/** 조회 서버가 응답하지 못한 경우만 직접 입력으로 이어 갈 수 있다. 입력값 오류와 권한 오류는 제외한다. */
function isLookupUnavailable(caught: unknown): boolean {
  if (!(caught instanceof ApiError)) return true;
  return caught.status === 404 || caught.status >= 500;
}

export function OfficeRegistrationForm() {
  const router = useRouter();
  const refresh = useRefreshOfficeState();
  const [step, setStep] = useState<Step>("lookup");
  const [entityType, setEntityType] = useState<EntityType>("INDIVIDUAL");
  const [authority, setAuthority] = useState("");
  const [license, setLicense] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [relation, setRelation] = useState("");
  const [errors, setErrors] = useState<FieldErrors<RegistrationField | LookupField>>({});
  const [formError, setFormError] = useState<string>();
  const [existingOffice, setExistingOffice] = useState(false);
  const [conflictLink, setConflictLink] = useState<string>();
  const [lookupFailed, setLookupFailed] = useState(false);

  const lookupMutation = useMutation({
    mutationFn: lookupOffice,
    onSuccess: (result) => {
      if (result.existingOfficeId !== null && result.existingOfficeId !== undefined) {
        setExistingOffice(true);
        return;
      }
      setStep("details");
    },
    onError: (caught) => {
      setErrors(fieldErrorMap(caught));
      setLookupFailed(isLookupUnavailable(caught));
      setFormError(
        describeOfficeError(caught, "사무소를 확인하지 못했습니다. 다시 시도해 주세요."),
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: createRegistration,
    onSuccess: async (result) => {
      await refresh();
      const params = new URLSearchParams({
        registrationId: String(result.registrationId),
        entity: entityType,
      });
      if (result.warning) params.set("warning", result.warning);
      router.push(`/office/register/evidence?${params.toString()}`);
    },
    onError: (caught) => {
      const mapped = fieldErrorMap(caught);
      setErrors(mapped);
      if (isApiCode(caught, "PENDING_REGISTRATION_EXISTS")) setConflictLink("/office/review");
      if (isApiCode(caught, "OFFICE_ALREADY_EXISTS")) setConflictLink("/office/join");
      setFormError(describeOfficeError(caught, "신청을 만들지 못했습니다. 다시 시도해 주세요."));
    },
  });

  function lookup() {
    setFormError(undefined);
    setLookupFailed(false);
    setExistingOffice(false);
    const problems: FieldErrors<RegistrationField | LookupField> = validateLookup({
      registrationAuthority: authority,
      realEstateLicenseNumber: license,
    });
    if (businessNumber.replace(/\D/g, "").length !== 10) {
      problems.businessRegistrationNumber = "사업자등록번호 10자리를 입력해 주세요.";
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    lookupMutation.mutate({
      entityType,
      registrationAuthority: authority.trim(),
      realEstateLicenseNumber: license.trim(),
    });
  }

  function submit() {
    setFormError(undefined);
    setConflictLink(undefined);
    const values = {
      entityType,
      registrationAuthority: authority,
      realEstateLicenseNumber: license,
      businessRegistrationNumber: businessNumber,
      requestedOfficeName: officeName,
      requestedRepresentativeName: representativeName,
      requestedRepresentativePhone: phone,
      requestedAddress: address,
      applicantRegistrationRelation: relation,
    };
    const problems = validateRegistration(values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    createMutation.mutate({
      ...values,
      registrationAuthority: authority.trim(),
      realEstateLicenseNumber: license.trim(),
      requestedOfficeName: officeName.trim(),
      requestedRepresentativeName: representativeName.trim(),
      requestedAddress: address.trim(),
    });
  }

  function clear(field: RegistrationField | LookupField) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  if (step === "lookup") {
    return (
      <FlowFrame title={"신규 사무소를 등록합니다.\n중개사무소 등록번호를 입력해 주십시오."}>
        <form
          noValidate
          className="flex flex-col gap-11"
          onSubmit={(event) => {
            event.preventDefault();
            lookup();
          }}
        >
          <div className="flex flex-col gap-7">
            <TextField
              label="중개사무소 사업자등록번호"
              kind="number"
              value={businessNumber}
              onValueChange={(next) => {
                setBusinessNumber(formatBusinessNumber(next));
                clear("businessRegistrationNumber");
              }}
              placeholder="중개사무소의 사업자등록번호를 입력해 주세요."
              error={errors.businessRegistrationNumber}
            />
            <TextField
              label="중개사무소 등록관청"
              value={authority}
              onValueChange={(next) => {
                setAuthority(next);
                clear("registrationAuthority");
              }}
              placeholder="중개사무소를 등록한 관청을 입력해 주세요."
              error={errors.registrationAuthority}
              maxLength={100}
            />
            <TextField
              label="중개사무소 개설등록번호"
              value={license}
              onValueChange={(next) => {
                setLicense(next);
                clear("realEstateLicenseNumber");
              }}
              placeholder="중개사무소의 개설등록번호를 입력해 주세요."
              error={errors.realEstateLicenseNumber}
              maxLength={30}
            />
            <RadioGroup
              legend="사업자 구분"
              name="entityType"
              value={entityType}
              options={ENTITY_OPTIONS}
              onValueChange={(next) => setEntityType(next as EntityType)}
            />
            {existingOffice ? (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-control bg-primary-soft px-4 py-3"
              >
                <p className="text-caption text-ink">
                  이미 등록된 사무소입니다. 새로 등록하지 않고 기존 사무소에 참여를 신청해 주세요.
                </p>
                <TextLink href="/office/join">기존 사무소 참여하기</TextLink>
              </div>
            ) : null}
            {formError ? <FormAlert>{formError}</FormAlert> : null}
            {lookupFailed ? (
              <div className="flex flex-col gap-2">
                <MutedNote>
                  조회에 실패해도 사무소 정보를 직접 입력해 신청할 수 있습니다. 이미 등록된 사무소는
                  신청 단계에서 다시 확인합니다.
                </MutedNote>
                <div>
                  <Button
                    variant="cancel"
                    onClick={() => {
                      setFormError(undefined);
                      setErrors({});
                      setStep("details");
                    }}
                  >
                    정보 직접 입력
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <ButtonRow>
            <Button variant="cancel" onClick={() => router.push("/office/start")}>
              이전
            </Button>
            <Button type="submit" isLoading={lookupMutation.isPending}>
              다음
            </Button>
          </ButtonRow>
          <div className="flex flex-col gap-2">
            <MutedNote>
              같은 등록관청과 개설등록번호의 사무소가 이미 있으면 새로 등록하지 않고 참여를
              신청합니다.
            </MutedNote>
            <MutedNote>
              기존 사무소와 사업자등록번호가 겹치면 경고가 표시되지만 신청은 막히지 않습니다.
            </MutedNote>
          </div>
        </form>
      </FlowFrame>
    );
  }

  return (
    <FlowFrame
      title={
        lookupFailed
          ? "신규 사무소 정보 조회에 실패했습니다.\n정보를 직접 입력해 주십시오."
          : "신규 사무소 등록을 위한 기본 정보를 입력해 주십시오."
      }
    >
      <form
        noValidate
        className="flex flex-col gap-11"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-7">
          <TextField
            label="사무소명"
            value={officeName}
            onValueChange={(next) => {
              setOfficeName(next);
              clear("requestedOfficeName");
            }}
            placeholder="예시: 김땡땡사무소"
            error={errors.requestedOfficeName}
            maxLength={100}
          />
          <TextField
            label="사무소 대표자명"
            value={representativeName}
            onValueChange={(next) => {
              setRepresentativeName(next);
              clear("requestedRepresentativeName");
            }}
            placeholder="예시: 김땡땡"
            error={errors.requestedRepresentativeName}
            maxLength={50}
          />
          <TextField
            label="사무소 대표 연락처"
            kind="tel"
            value={phone}
            onValueChange={(next) => {
              setPhone(next);
              clear("requestedRepresentativePhone");
            }}
            placeholder="예시: 010-0000-0000"
            error={errors.requestedRepresentativePhone}
          />
          <TextField
            label="중개사무소 주소"
            value={address}
            onValueChange={(next) => {
              setAddress(next);
              clear("requestedAddress");
            }}
            placeholder="예시: 서울시 땡땡구 땡땡동"
            error={errors.requestedAddress}
            maxLength={300}
          />
          <SelectField
            label="신청자의 등록관계"
            value={relation}
            options={[...APPLICANT_RELATION_OPTIONS]}
            placeholder="선택해 주세요"
            onValueChange={(next) => {
              setRelation(next);
              clear("applicantRegistrationRelation");
            }}
            error={errors.applicantRegistrationRelation}
          />
          {formError ? (
            <div className="flex flex-col gap-2">
              <FormAlert>{formError}</FormAlert>
              {conflictLink ? (
                <TextLink href={conflictLink}>
                  {conflictLink === "/office/review"
                    ? "심사 상태 확인하기"
                    : "기존 사무소 참여하기"}
                </TextLink>
              ) : null}
            </div>
          ) : null}
          {createMutation.isSuccess ? (
            <FormNotice>신청을 만들었습니다. 이동하는 중입니다.</FormNotice>
          ) : null}
        </div>
        <ButtonRow>
          <Button
            variant="cancel"
            onClick={() => {
              setStep("lookup");
              setLookupFailed(false);
              setErrors({});
              setFormError(undefined);
            }}
          >
            이전
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            다음
          </Button>
        </ButtonRow>
        <div className="flex flex-col gap-2">
          <MutedNote>대표 자격은 다음 단계에서 자격증 사본으로 확인합니다.</MutedNote>
          <MutedNote>{REGISTRATION_NOTICE_COPY.intro}</MutedNote>
          <MutedNote>{REGISTRATION_NOTICE_COPY.scope}</MutedNote>
          <MutedNote>
            제출하면 작성 중 상태의 신청이 만들어지고 증빙 업로드 화면으로 이동합니다.
          </MutedNote>
        </div>
      </form>
    </FlowFrame>
  );
}
