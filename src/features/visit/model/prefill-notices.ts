type PrefillState = {
  propertyRequested: boolean;
  propertyLoading: boolean;
  propertyFailed: boolean;
  propertyInactive: boolean;
  propertyName?: string;
  customerRequested: boolean;
  customerLoading: boolean;
  customerFailed: boolean;
  customerInactive: boolean;
  customerName?: string;
};

/** 주소의 매물·고객 번호로 대상을 미리 고를 때 고른 결과나 고르지 못한 이유를 알리는 문구. */
export function prefillNoticeMessages(state: PrefillState): string[] {
  const messages: string[] = [];
  if (state.propertyRequested && !state.propertyLoading) {
    if (state.propertyName) {
      messages.push(`'${state.propertyName}' 매물을 후보로 미리 골랐습니다.`);
    } else if (state.propertyInactive) {
      messages.push(
        "선택한 매물이 활성 등록 상태가 아니어서 후보로 고르지 못했습니다. 활성 등록된 매물만 선택할 수 있습니다.",
      );
    } else if (state.propertyFailed) {
      messages.push("미리 고를 매물을 불러오지 못했습니다. 아래 목록에서 직접 골라 주세요.");
    }
  }
  if (state.customerRequested && !state.customerLoading) {
    if (state.customerName) {
      messages.push(`'${state.customerName}' 고객을 미리 골랐습니다.`);
    } else if (state.customerInactive) {
      messages.push(
        "선택한 고객이 보관되었거나 병합되어 고르지 못했습니다. 아래 목록에서 다른 고객을 골라 주세요.",
      );
    } else if (state.customerFailed) {
      messages.push("미리 고를 고객을 불러오지 못했습니다. 아래 목록에서 직접 골라 주세요.");
    }
  }
  return messages;
}
