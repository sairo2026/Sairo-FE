"use client";

import type { ApproverConfirmedScheduleResponse } from "@/lib/api/contracts/visit.schema";
import type { ApproverCompare } from "../api/approver.api";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { FormNotice } from "@/shared/components/feedback/form-frame";
import { Badge } from "@/shared/components/ui/badge";
import { formatSeoulDateTime } from "@/shared/lib/format";
import { APPLICANT_RELATION_LABEL, ITEM_RESULT_LABEL, labelOf } from "../model/labels";
import { ApproverRequestList } from "./approver-requests";

export function ApproverConfirmed({
  base,
  data,
  changeData,
  readOnly,
  noticeVersion,
}: {
  base: string;
  data: ApproverConfirmedScheduleResponse;
  changeData: ApproverCompare | null;
  readOnly: boolean;
  noticeVersion: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="발급 사무소 문의처"
        className="flex flex-col gap-1 rounded-card-flat border border-line bg-white px-5 py-4"
      >
        <p className="text-body font-semibold text-ink">{data.officeName}</p>
        <p className="text-caption text-ink-2">
          확정된 일정을 바꿔야 하면 이 화면에서 요청을 받지 않으니 아래 번호로 사무소에 문의해
          주세요.
        </p>
        <a href={`tel:${data.officeContactPhone}`} className="text-body font-semibold text-primary">
          {data.officeContactPhone}
        </a>
      </section>

      <section aria-label="확정된 방문" className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-ink">확정된 방문</h3>
        {data.items.length === 0 ? (
          <EmptyState
            title="확정된 방문이 없습니다"
            description="신청을 선택해 확정하면 이곳에 일정이 나타납니다."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.items.map((item) => (
              <li
                key={item.scheduleItemId}
                className="flex flex-col gap-2 rounded-card-flat border border-line bg-white px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-ink">
                    {formatSeoulDateTime(item.scheduledStartAt)} ~{" "}
                    {formatSeoulDateTime(item.scheduledEndAt)}
                  </span>
                  <Badge
                    tone={
                      item.result === "COMPLETED"
                        ? "green"
                        : item.result === "SCHEDULED"
                          ? "blue"
                          : "gray"
                    }
                    className="h-8 min-w-0 px-3 text-caption"
                  >
                    {labelOf(ITEM_RESULT_LABEL, item.result)}
                  </Badge>
                  {item.state === "RESCHEDULE_REQUIRED" ? (
                    <Badge tone="red" className="h-8 min-w-0 px-3 text-caption">
                      재조율 필요
                    </Badge>
                  ) : null}
                  {item.applicantRelation === "GRANTED_OFFICE" ? (
                    <Badge tone="amber" className="h-8 min-w-0 px-3 text-caption">
                      {labelOf(APPLICANT_RELATION_LABEL, item.applicantRelation)}의 방문
                    </Badge>
                  ) : null}
                </div>
                <p className="text-caption text-ink-2">
                  {item.applicantOfficeName} · {item.applicantBrokerName}
                </p>
                {item.state === "RESCHEDULE_REQUIRED" ? (
                  <p className="text-caption text-ink-2">
                    조건이 바뀌어 일정 조정이 필요합니다. 일정은 그대로 유지되며 중개사가 변경안을
                    올리면 아래에서 선택할 수 있습니다.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="받은 변경 신청" className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-ink">받은 변경 신청</h3>
        {changeData && noticeVersion ? (
          <ApproverRequestList
            base={base}
            data={changeData}
            kind="CHANGE"
            readOnly={readOnly}
            noticeVersion={noticeVersion}
          />
        ) : (
          <FormNotice>
            {readOnly
              ? "공동 승인자는 변경 신청을 볼 수 없고 확정 일정만 읽을 수 있습니다."
              : "변경 신청을 불러오지 못했습니다."}
          </FormNotice>
        )}
      </section>
    </div>
  );
}
