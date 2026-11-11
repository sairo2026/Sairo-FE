"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { ButtonRow, FlowFrame, MutedNote, TextLink } from "@/shared/components/feedback/page-parts";

type Choice = "create" | "join";

const CHOICES: Array<{ key: Choice; title: string; description: string }> = [
  {
    key: "create",
    title: "새 사무소 생성",
    description: "새로운 사무소를 생성하고, 구성원을 초대할 수 있습니다.",
  },
  {
    key: "join",
    title: "기존 사무소 참여",
    description: "기존에 등록된 사무소에 참여 신청을 보냅니다.",
  },
];

export function OfficeStartScreen() {
  const router = useRouter();
  const { context } = useOfficeAccess();
  const [choice, setChoice] = useState<Choice | null>(null);

  return (
    <FlowFrame title="사무소 생성/참여 선택">
      {(() => {
        const hasRegistration =
          context.pendingRegistrationId !== null && context.pendingRegistrationId !== undefined;
        const hasMembership =
          context.pendingMembershipId !== null && context.pendingMembershipId !== undefined;
        const hasOffice = context.officeId !== null && context.officeId !== undefined;
        const isBlocked = hasRegistration || hasMembership || hasOffice;

        return (
          <div className="flex flex-col gap-6">
            {hasRegistration ? (
              <div
                role="status"
                className="flex flex-col gap-2 rounded-control bg-primary-soft px-4 py-3"
              >
                <p className="text-caption text-ink-2">
                  진행 중인 사무소 등록 신청이 있어 새로 시작할 수 없습니다.
                </p>
                <TextLink href="/office/review">심사 상태 확인하기</TextLink>
              </div>
            ) : null}
            {!hasRegistration && hasMembership ? (
              <div
                role="status"
                className="flex flex-col gap-2 rounded-control bg-primary-soft px-4 py-3"
              >
                <p className="text-caption text-ink-2">
                  진행 중인 참여 요청이나 초대가 있어 새로 시작할 수 없습니다.
                </p>
                <TextLink href="/office/membership">참여 요청 상태 확인하기</TextLink>
              </div>
            ) : null}
            {!hasRegistration && !hasMembership && hasOffice ? (
              <p
                role="status"
                className="rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2"
              >
                이미 사무소에 소속되어 있습니다.
              </p>
            ) : null}

            <div
              role="radiogroup"
              aria-label="사무소 시작 방법"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {CHOICES.map((item) => {
                const selected = choice === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isBlocked}
                    onClick={() => setChoice(item.key)}
                    className={cn(
                      "flex min-h-48 flex-col items-center justify-between gap-6 rounded-card-flat border bg-surface px-4 py-6 text-center transition-colors",
                      selected ? "border-primary bg-primary-soft" : "border-primary-line",
                      isBlocked
                        ? "cursor-not-allowed opacity-50"
                        : "hover:border-primary hover:bg-primary-soft",
                    )}
                  >
                    <span className="text-h2 font-semibold text-primary">{item.title}</span>
                    <span className="text-caption text-ink-2">{item.description}</span>
                  </button>
                );
              })}
            </div>

            <MutedNote>사무소 대표 자격은 다음 단계에서 자격증 사본으로 확인합니다.</MutedNote>

            <ButtonRow>
              <Button variant="cancel" onClick={() => router.push("/access")}>
                취소
              </Button>
              <Button
                disabled={isBlocked || choice === null}
                onClick={() => router.push(choice === "join" ? "/office/join" : "/office/register")}
              >
                다음
              </Button>
            </ButtonRow>
          </div>
        );
      })()}
    </FlowFrame>
  );
}
