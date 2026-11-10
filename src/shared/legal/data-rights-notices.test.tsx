// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PRIVACY_RIGHTS_COPY, processingOutsourcingDisclosure } from "./data-rights-copy";
import {
  DataExportNotice,
  DataMigrationSupportNotice,
  DataMigrationUploadNotice,
  PrivacyRightsNotice,
  SupportInquiryNotice,
} from "./data-rights-notices";

afterEach(cleanup);

describe("데이터 이전과 내보내기 안내", () => {
  it("업로드 안내는 책임과 보관과 실행 횟수를 알린다", () => {
    render(<DataMigrationUploadNotice />);
    expect(screen.getByText(/개인정보를 올리고 처리하는 책임은 사무소에 있습니다/)).not.toBeNull();
    expect(
      screen.getByText(/원본 파일은 이전이 끝나면 정해진 기간 안에 삭제됩니다/),
    ).not.toBeNull();
    expect(screen.getByText(/직접 실행은 매월 5회까지 할 수 있습니다/)).not.toBeNull();
  });

  it("유료 이전 지원 안내는 취소 조건과 열람 범위를 알린다", () => {
    render(<DataMigrationSupportNotice />);
    expect(screen.getByText(/결제 후에는 대표가 취소할 수 없습니다/)).not.toBeNull();
    expect(screen.getByText(/처리 목적 외로 이용하지 않습니다/)).not.toBeNull();
  });

  it("내보내기 안내는 만료 시간과 탈퇴한 구성원 표시를 알린다", () => {
    render(<DataExportNotice />);
    expect(
      screen.getByText(/생성된 파일은 24시간 뒤, 내려받기 주소는 10분 뒤 만료됩니다/),
    ).not.toBeNull();
    expect(screen.getByText(/탈퇴한 구성원 번호/)).not.toBeNull();
  });
});

describe("개인정보 권리 요청과 지원 문의 안내", () => {
  it("대표에게만 사무소 고객 요청 전달 안내를 더 보여준다", () => {
    const { unmount } = render(<PrivacyRightsNotice />);
    expect(screen.getByText(/접수일부터 10일 안에 처리 결과를 알려 드리며/)).not.toBeNull();
    expect(screen.queryByText(/고객지원 문의로 전달해 주세요/)).toBeNull();
    unmount();
    render(<PrivacyRightsNotice isOwner />);
    expect(screen.getByText(/고객지원 문의로 전달해 주세요/)).not.toBeNull();
  });

  it("지원 문의 안내는 첨부 가림 안내를 보여준다", () => {
    render(<SupportInquiryNotice />);
    expect(screen.getByText(/주민등록번호, 전체 계좌번호, 카드번호가 보이지 않게/)).not.toBeNull();
  });

  it("처리 안내 문구는 값을 채워 만든다", () => {
    expect(PRIVACY_RIGHTS_COPY.identity("신분증 확인")).toBe(
      "본인 확인을 위해 신분증 확인을 추가로 확인해 주세요. 보완하는 동안에도 처리 기한은 멈추지 않습니다.",
    );
    expect(PRIVACY_RIGHTS_COPY.withdrawnMemberDisplay(2, "소속공인중개사")).toBe(
      "탈퇴한 구성원 2(소속공인중개사)",
    );
    expect(processingOutsourcingDisclosure("사이로(SAIRO)", "위탁업무 목록")).toContain(
      "개인정보 처리 업무를 사이로(SAIRO)에 위탁합니다",
    );
  });
});
