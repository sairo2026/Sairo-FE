"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MembershipInvitationResponseSchema } from "@/lib/api/contracts/office.schema";
import { apiFetch } from "@/shared/api/client";
import { describeAuthError, isApiCode } from "@/shared/lib/api-messages";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/components/ui/button";
import {
  OFFICE_FIELD_GAP_CLASS,
  OFFICE_FIELD_LABEL_CLASS,
} from "@/shared/components/ui/field-label";
import { useOfficeAccess } from "@/shared/session/office-access-context";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function inviteAgent(email: string) {
  return apiFetch("/api/offices/current/memberships/invite", {
    method: "POST",
    body: { email, role: "AGENT" },
    schema: MembershipInvitationResponseSchema,
  });
}

function describeInviteError(error: unknown) {
  if (isApiCode(error, "RESOURCE_NOT_FOUND")) {
    return "사이로에 가입한 이메일이 아닙니다. 가입한 이메일인지 확인해 주세요.";
  }
  if (isApiCode(error, "PENDING_MEMBERSHIP_EXISTS")) {
    return "이미 소속되어 있거나 진행 중인 참여 요청·초대가 있습니다.";
  }
  if (isApiCode(error, "FORBIDDEN")) return "이 작업을 할 권한이 없습니다.";
  return describeAuthError(error, "초대를 보내지 못했습니다. 다시 시도해 주세요.");
}

/**
 * 목록에 없는 공인중개사를 담당자로 지정하려는 대표를 위한 초대 입구.
 * 새 인적사항을 받지 않고 기존 구성원 초대(사이로 가입 이메일, 소속공인중개사)를 그대로 보낸다.
 * 초대받은 분이 수락하고 대표가 승인해야 담당 공인중개사 목록에 나타난다.
 */
export function ManagerInviteAdd() {
  const queryClient = useQueryClient();
  const { role, isReadOnly } = useOfficeAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => inviteAgent(email.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["office", "memberships"] });
      setEmail("");
      setError(undefined);
      setIsOpen(false);
      setNotice(
        "초대를 보냈습니다. 초대받은 분이 수락하고 대표가 승인하면 담당 공인중개사로 지정할 수 있습니다.",
      );
    },
    onError: (caught) => setError(describeInviteError(caught)),
  });

  if (role !== "OWNER") return null;

  function submit() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      return setError("이메일 주소를 올바르게 입력해 주세요.");
    }
    setError(undefined);
    mutation.mutate();
  }

  return (
    <div
      role="group"
      aria-label="담당 공인중개사 직접 추가"
      className={cn("flex min-w-0 flex-col", OFFICE_FIELD_GAP_CLASS)}
    >
      {notice ? (
        <p role="status" className="text-caption text-ink-2">
          {notice}
        </p>
      ) : null}
      {isOpen ? (
        <>
          <p className={OFFICE_FIELD_LABEL_CLASS}>초대할 공인중개사 이메일</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              aria-label="초대할 공인중개사 이메일"
              type="email"
              inputMode="email"
              value={email}
              maxLength={254}
              placeholder="사이로에 가입한 이메일"
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                submit();
              }}
              className="h-[42px] min-w-[200px] flex-1 rounded-control border border-control bg-white px-4 text-body text-ink"
            />
            <Button size="sm" isLoading={mutation.isPending} disabled={isReadOnly} onClick={submit}>
              초대 보내기
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => {
                setIsOpen(false);
                setEmail("");
                setError(undefined);
              }}
            >
              취소
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <div>
          <Button
            variant="ghost"
            className="h-[42px] min-w-0 shrink-0 px-4 text-body font-medium text-ink-2"
            disabled={isReadOnly}
            onClick={() => {
              setNotice(undefined);
              setIsOpen(true);
            }}
          >
            직접 입력해서 추가하기
          </Button>
        </div>
      )}
    </div>
  );
}
