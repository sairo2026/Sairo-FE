export type GuideColumn = {
  header: string;
  required: boolean;
  description: string;
  example: string;
};

export type GuideTarget = "CUSTOMER" | "PROPERTY";

export const IMPORT_GUIDE_COLUMNS: Record<GuideTarget, readonly GuideColumn[]> = {
  CUSTOMER: [
    {
      header: "고객번호",
      required: true,
      description:
        "고객마다 다른 번호입니다. 같은 번호가 다시 오면 중복으로 보고 새로 만들지 않습니다. 엑셀에 번호 열이 없으면 맨 앞에 1, 2, 3 순서의 열을 추가해 주세요.",
      example: "C-001",
    },
    {
      header: "고객명",
      required: true,
      description: "고객 이름 또는 법인명입니다.",
      example: "김가나",
    },
    {
      header: "연락처",
      required: false,
      description: "숫자만 써도 되고 하이픈이 있어도 됩니다. 휴대전화와 일반 전화를 받습니다.",
      example: "010-1234-5678",
    },
    {
      header: "이메일",
      required: false,
      description: "name@example.com 형식입니다.",
      example: "kim@example.com",
    },
    {
      header: "메모",
      required: false,
      description:
        "참고 내용입니다. 주민등록번호·카드번호 같은 민감 번호는 쓰지 마세요. 감지되면 그 줄은 이전되지 않습니다.",
      example: "전세 문의",
    },
  ],
  PROPERTY: [
    {
      header: "매물번호",
      required: true,
      description:
        "매물마다 다른 번호입니다. 같은 번호가 다시 오면 중복으로 보고 새로 만들지 않습니다. 엑셀에 번호 열이 없으면 맨 앞에 1, 2, 3 순서의 열을 추가해 주세요.",
      example: "P-001",
    },
    {
      header: "매물명",
      required: true,
      description: "건물 또는 매물 이름입니다.",
      example: "해든빌",
    },
    {
      header: "주소",
      required: false,
      description: "도로명 또는 지번 주소입니다.",
      example: "서울 강남구 테헤란로 1",
    },
    { header: "상세주소", required: false, description: "동·호수입니다.", example: "101호" },
    {
      header: "전용면적(㎡)",
      required: false,
      description: "숫자만 씁니다. 평으로 쓰려면 열 이름에 평을 넣거나 값 뒤에 평을 붙이세요.",
      example: "84.5",
    },
    {
      header: "입주 가능일",
      required: false,
      description: "2026-03-05 형식입니다. 2026.3.5나 20260305도 읽습니다.",
      example: "2026-03-05",
    },
    {
      header: "관리비(원)",
      required: false,
      description: "숫자만 씁니다. 만원 단위로 쓰려면 열 이름에 만원을 넣으세요.",
      example: "50000",
    },
    {
      header: "점유상태",
      required: false,
      description: "공실, 자가, 임차인, 미상 중 하나입니다. 그 밖의 값은 미상으로 처리합니다.",
      example: "공실",
    },
  ],
};

const SAMPLE_ROWS: Record<GuideTarget, readonly (readonly string[])[]> = {
  CUSTOMER: [
    ["C-001", "김가나", "010-1234-5678", "kim@example.com", "전세 문의"],
    ["C-002", "이다라", "010-9876-5432", "", "매매 상담"],
  ],
  PROPERTY: [
    ["P-001", "해든빌", "서울 강남구 테헤란로 1", "101호", "84.5", "2026-03-05", "50000", "공실"],
    [
      "P-002",
      "서울타워",
      "서울 중구 세종대로 2",
      "502호",
      "59.9",
      "2026-04-01",
      "120000",
      "임차인",
    ],
  ],
};

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** 엑셀에서 한글이 깨지지 않도록 앞에 BOM을 붙인 UTF-8 샘플 CSV 내용. */
export function sampleCsv(target: GuideTarget): string {
  const header = IMPORT_GUIDE_COLUMNS[target].map((column) => column.header);
  const lines = [header, ...SAMPLE_ROWS[target]].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function sampleCsvHref(target: GuideTarget): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv(target))}`;
}

export function sampleFileName(target: GuideTarget): string {
  return target === "CUSTOMER" ? "사이로_고객_이전_샘플.csv" : "사이로_매물_이전_샘플.csv";
}
