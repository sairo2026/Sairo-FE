export function ApproverPrivacyNotice({ retentionDays }: { retentionDays?: number }) {
  return (
    <section
      aria-label="개인정보 수집 안내"
      className="flex flex-col gap-2 rounded-card-flat border border-line bg-white px-5 py-4 text-caption text-ink-2"
    >
      <h2 className="text-body font-semibold text-ink">개인정보 수집 안내</h2>
      <p>수집 목적: 출입 가능 시간 조건 등록과 방문 신청의 비교·선택·확정</p>
      <p>수집 항목: 방문 가능 시간 조건, 선택 메모, 접속 기록</p>
      <p>
        보유 안내:{" "}
        {retentionDays === undefined
          ? "방문 조율 기록 보유기한까지 보관합니다."
          : `방문 조율 기록 보유기한에 따라 보관하며 보관 안내 기준은 ${retentionDays}일입니다.`}
      </p>
      <p>
        열람, 정정, 삭제, 처리정지는 방문을 조율하는 사무소의 문의처로 요청할 수 있습니다. 이 링크는
        다른 사람에게 공유하지 마세요.
      </p>
    </section>
  );
}
