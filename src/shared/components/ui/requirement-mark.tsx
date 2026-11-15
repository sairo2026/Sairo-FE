/** 동의·확인 항목의 필수·선택 표시. 필수는 별표(장식)와 "(필수)", 선택은 "(선택)"으로 통일한다. */
export function RequirementMark({ requirement }: { requirement: "required" | "optional" }) {
  if (requirement === "optional") {
    return <span className="font-normal text-ink-3">(선택)</span>;
  }
  return (
    <span className="font-medium text-primary">
      <span aria-hidden="true" className="mr-0.5 text-required">
        *
      </span>
      (필수)
    </span>
  );
}
