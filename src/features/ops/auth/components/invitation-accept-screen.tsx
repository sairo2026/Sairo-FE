"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, ApiNetworkError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { RAW_ACCESS_PLEDGE_COPY } from "@/shared/legal/notice-copy";
import { PageSkeleton } from "@/shared/components/feedback/skeleton";
import { formatWait } from "@/shared/lib/api-messages";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { OPS_ROLE_LABELS, toOpsRoles } from "../../model/roles";
import {
  InvitationApiError,
  previewInvitation,
  startInvitationKakao,
  toInvitationState,
} from "../api/ops-auth-api";
import type { InvitationState } from "../api/ops-auth-api";
import { OpsNotice, OpsPublicFrame, primaryLinkClass } from "./ops-public-frame";

const STATE_COPY: Record<InvitationState, { title: string; description: string }> = {
  EXPIRED: {
    title: "초대 링크가 만료되었습니다",
    description: "초대 유효기간 72시간이 지났습니다. 보안관리자에게 새 초대를 요청해 주세요.",
  },
  CANCELLED: {
    title: "취소된 초대입니다",
    description: "보안관리자가 이 초대를 취소했습니다. 필요하면 새 초대를 요청해 주세요.",
  },
  ACCEPTED: {
    title: "이미 수락한 초대입니다",
    description: "이 초대로는 운영자 계정이 이미 만들어졌습니다. 운영자 로그인으로 들어가 주세요.",
  },
};

function describeProblem(error: unknown): { title: string; description: string } {
  if (error instanceof InvitationApiError && error.code === "INVITATION_NOT_USABLE") {
    return error.invitationState
      ? STATE_COPY[error.invitationState]
      : {
          title: "사용할 수 없는 초대입니다",
          description: "만료되었거나 취소되었거나 이미 수락한 초대입니다.",
        };
  }
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        title: "초대 링크를 찾을 수 없습니다",
        description: "링크가 올바른지 확인하거나 보안관리자에게 새 초대를 요청해 주세요.",
      };
    }
    if (error.status === 429) {
      return {
        title: "요청이 너무 많습니다",
        description: error.retryAfterSeconds
          ? `${formatWait(error.retryAfterSeconds)} 뒤에 다시 시도해 주세요.`
          : "잠시 뒤에 다시 시도해 주세요.",
      };
    }
  }
  if (error instanceof ApiNetworkError) {
    return { title: "서버에 연결하지 못했습니다", description: "잠시 뒤에 다시 시도해 주세요." };
  }
  return { title: "초대를 확인하지 못했습니다", description: "잠시 뒤에 다시 시도해 주세요." };
}

function ProblemView({ error }: { error: unknown }) {
  const { title, description } = describeProblem(error);
  const isAccepted = error instanceof InvitationApiError && error.invitationState === "ACCEPTED";
  return (
    <OpsPublicFrame title={title} description={description}>
      {isAccepted ? (
        <a href="/ops/login" className={primaryLinkClass}>
          운영자 로그인으로 이동
        </a>
      ) : null}
    </OpsPublicFrame>
  );
}

function defaultNavigate(url: string) {
  window.location.assign(url);
}

type Props = {
  token?: string;
  errorCode?: string;
  errorState?: string;
  navigate?: (url: string) => void;
};

export function InvitationAcceptScreen({
  token,
  errorCode,
  errorState,
  navigate = defaultNavigate,
}: Props) {
  const [startError, setStartError] = useState<unknown>(null);
  const preview = useQuery({
    queryKey: ["ops", "invitation-preview", token],
    queryFn: ({ signal }) => previewInvitation(token ?? "", signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
  const start = useMutation({
    mutationFn: () => startInvitationKakao(token ?? ""),
    onSuccess: (result) => navigate(result.authorizationUrl),
    onError: setStartError,
  });

  if (errorCode === "OPERATOR_ALREADY_EXISTS") {
    return (
      <OpsPublicFrame
        title="이미 운영자 계정이 있습니다"
        description="이 카카오 계정은 이미 운영자 계정으로 등록되어 있어 초대를 다시 수락할 수 없습니다. 운영자 로그인을 이용해 주세요."
      >
        <a href="/ops/login" className={primaryLinkClass}>
          운영자 로그인으로 이동
        </a>
      </OpsPublicFrame>
    );
  }
  if (errorCode === "INVITATION_NOT_USABLE") {
    const state = toInvitationState(errorState);
    const copy = state
      ? STATE_COPY[state]
      : {
          title: "사용할 수 없는 초대입니다",
          description: "만료되었거나 취소되었거나 이미 수락한 초대입니다.",
        };
    return <OpsPublicFrame title={copy.title} description={copy.description} />;
  }
  if (errorCode === "INVALID_REQUEST" || errorCode === "RATE_LIMITED") {
    return (
      <OpsPublicFrame
        title="카카오 인증을 마치지 못했습니다"
        description={
          errorCode === "RATE_LIMITED"
            ? "요청이 많아 잠시 멈췄습니다. 잠시 뒤 이메일로 받은 초대 링크를 다시 열어 주세요."
            : "인증 시간이 지났거나 인증이 취소되었습니다. 이메일로 받은 초대 링크를 다시 열어 처음부터 진행해 주세요."
        }
      />
    );
  }
  if (!token) {
    return (
      <OpsPublicFrame
        title="초대 링크가 올바르지 않습니다"
        description="이메일로 받은 초대 링크를 그대로 열어 주세요."
      />
    );
  }
  if (preview.isPending) return <PageSkeleton label="초대를 확인하는 중입니다." />;
  if (preview.isError) return <ProblemView error={preview.error} />;

  const roles = toOpsRoles(preview.data.roles);
  const startMessage = startError ? describeProblem(startError) : null;

  return (
    <OpsPublicFrame
      title="운영자 초대"
      description="초대를 확인한 뒤 카카오 인증과 인증 앱 등록을 마치면 운영자 계정이 만들어집니다."
    >
      <dl className="grid gap-3 text-body">
        <div>
          <dt className="text-caption font-semibold text-ink-2">초대받는 분</dt>
          <dd className="text-ink">{preview.data.inviteeName}</dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-ink-2">부여될 역할</dt>
          <dd className="text-ink">
            {roles.length > 0 ? roles.map((role) => OPS_ROLE_LABELS[role]).join(", ") : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-caption font-semibold text-ink-2">초대 만료</dt>
          <dd className="text-ink">{formatSeoulDateTime(preview.data.expiresAt)}</dd>
        </div>
      </dl>
      <OpsNotice>
        카카오 인증 뒤 15분 안에 인증 앱 등록을 마쳐야 합니다. 시간이 지나면 초대 링크부터 다시
        시작해 주세요.
      </OpsNotice>
      <OpsNotice>{RAW_ACCESS_PLEDGE_COPY.inviteDuty}</OpsNotice>
      {startMessage ? (
        <OpsNotice tone="error">
          {startMessage.title}. {startMessage.description}
        </OpsNotice>
      ) : null}
      <Button
        fullWidth
        isLoading={start.isPending}
        onClick={() => {
          setStartError(null);
          start.mutate();
        }}
      >
        카카오로 인증하고 계속
      </Button>
    </OpsPublicFrame>
  );
}
