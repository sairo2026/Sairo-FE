"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import { Button } from "@/shared/components/ui/button";
import { SelectableCard } from "@/shared/components/ui/selectable-card";
import { ButtonRow, FlowFrame, TextLink } from "@/shared/components/feedback/page-parts";

type Choice = "create" | "join";

const CHOICES: Array<{ key: Choice; title: string; description: string; image: string }> = [
  {
    key: "create",
    title: "새 사무소 생성",
    description: "새로운 사무소를 생성하고, 구성원을 초대할 수 있습니다.",
    image: "/office-start/create.png",
  },
  {
    key: "join",
    title: "기존 사무소 참여",
    description: "기존에 등록된 사무소에 참여 신청을 보냅니다.",
    image: "/office-start/join.png",
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
          <div className="flex flex-col gap-11">
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
              className="flex flex-wrap justify-center gap-4 md:gap-[52px]"
            >
              {CHOICES.map((item) => {
                const selected = choice === item.key;
                return (
                  <SelectableCard
                    key={item.key}
                    selectionRole="radio"
                    variant="outline-card"
                    isSelected={selected}
                    disabled={isBlocked}
                    onClick={() => setChoice(item.key)}
                    className="flex min-h-[144px] w-full flex-col items-center justify-center gap-2 rounded-card-flat px-4 py-5 text-center md:h-[312px] md:w-[260px] md:justify-between md:gap-0 md:pt-9 md:pb-2"
                  >
                    <span className="text-h3 font-semibold">{item.title}</span>
                    <Image
                      src={item.image}
                      alt=""
                      aria-hidden="true"
                      width={160}
                      height={160}
                      className="h-16 w-16 object-contain md:h-40 md:w-40"
                    />
                    <span className="text-body font-medium md:w-[165px]">{item.description}</span>
                  </SelectableCard>
                );
              })}
            </div>

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
