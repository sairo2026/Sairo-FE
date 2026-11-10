"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextAreaField } from "@/shared/components/ui/textarea-field";
import { TextField } from "@/shared/components/ui/text-field";
import { DateTimePair, FormMessage } from "../system-common/system-fields";
import { describeSystemError } from "../system-common/system-form";
import { useUpdateIncident } from "./incidents-api";
import {
  INCIDENT_STAGES,
  INCIDENT_STATUS,
  isStageSelectable,
  toIncidentUpdateBody,
  updateInputOf,
  validateIncidentUpdate,
} from "./incidents-model";
import type {
  Incident,
  IncidentStage,
  IncidentUpdateErrors,
  IncidentUpdateInput,
} from "./incidents-model";

function StageTrack({ current }: { current: IncidentStage }) {
  const currentIndex = INCIDENT_STAGES.indexOf(current);
  return (
    <ol aria-label="장애 단계" className="flex flex-wrap items-center gap-2 text-caption">
      {INCIDENT_STAGES.map((stage, index) => (
        <li
          key={stage}
          aria-current={stage === current ? "step" : undefined}
          className={
            index <= currentIndex ? "font-semibold text-primary" : "font-medium text-ink-3"
          }
        >
          {index > 0 ? <span aria-hidden="true"> → </span> : null}
          {INCIDENT_STATUS[stage]?.label ?? stage}
        </li>
      ))}
    </ol>
  );
}

export function IncidentUpdateDialog({
  incident,
  onClose,
  onSaved,
}: {
  incident: Incident;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [input, setInput] = useState<IncidentUpdateInput>(() => updateInputOf(incident));
  const [errors, setErrors] = useState<IncidentUpdateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const update = useUpdateIncident();
  const set = (patch: Partial<IncidentUpdateInput>) =>
    setInput((current) => ({ ...current, ...patch }));

  async function save() {
    const found = validateIncidentUpdate(input, incident.status);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    try {
      await update.mutateAsync({
        incidentId: incident.incidentId,
        body: toIncidentUpdateBody(input),
      });
      onSaved(`장애 ${incident.incidentId}를 갱신했습니다.`);
    } catch (caught) {
      setServerError(describeSystemError(caught, "장애를 갱신하지 못했습니다."));
    }
  }

  return (
    <Modal
      isOpen
      size="wide"
      title={`장애 ${incident.incidentId} 갱신`}
      onClose={onClose}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            닫기
          </Button>
          <Button variant="submit" isLoading={update.isPending} onClick={() => void save()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body font-semibold text-ink">{incident.title}</p>
        <StageTrack current={incident.status} />
        <p className="text-caption text-ink-2">
          장애 단계는 감지, 확인, 대응, 복구, 종료 순서로 한 단계씩만 바꿀 수 있고 되돌릴 수
          없습니다. 종료 시각은 종료로 바꾸는 시점의 서버 시각으로 기록됩니다.
        </p>
        <SelectField
          label="장애 단계"
          value={input.status}
          options={INCIDENT_STAGES.map((stage) => ({
            value: stage,
            label: INCIDENT_STATUS[stage]?.label ?? stage,
            isDisabled: !isStageSelectable(incident.status, stage),
          }))}
          onValueChange={(status) => set({ status: status as IncidentStage })}
          error={errors.status}
        />
        <DateTimePair
          label="복구 확인 시각"
          date={input.recoveredDate}
          time={input.recoveredTime}
          onDateChange={(recoveredDate) => set({ recoveredDate })}
          onTimeChange={(recoveredTime) => set({ recoveredTime })}
          error={errors.recoveredDate}
        />
        <TextField
          label="담당 운영자 번호"
          kind="number"
          value={input.assignedOperatorId}
          onValueChange={(assignedOperatorId) => set({ assignedOperatorId })}
          error={errors.assignedOperatorId}
          hint="선택 입력입니다. 활성 운영자의 번호만 지정할 수 있습니다."
        />
        <TextAreaField
          label="장애 원인"
          rows={2}
          value={input.rootCause}
          onValueChange={(rootCause) => set({ rootCause })}
        />
        <TextAreaField
          label="대응·복구 조치"
          rows={2}
          value={input.responseActions}
          onValueChange={(responseActions) => set({ responseActions })}
        />
        <TextAreaField
          label="고객 안내"
          rows={2}
          value={input.customerNotice}
          onValueChange={(customerNotice) => set({ customerNotice })}
        />
        <TextAreaField
          label="재발 방지 업무"
          rows={2}
          value={input.preventionTasks}
          onValueChange={(preventionTasks) => set({ preventionTasks })}
        />
        <TextAreaField
          label="요약"
          rows={2}
          value={input.summary}
          onValueChange={(summary) => set({ summary })}
        />
        {serverError ? <FormMessage tone="error">{serverError}</FormMessage> : null}
      </div>
    </Modal>
  );
}
