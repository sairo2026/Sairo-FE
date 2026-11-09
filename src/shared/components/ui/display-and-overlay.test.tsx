// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Badge, DDayTag, TradeTypeTag } from "./badge";
import { Card } from "./card";
import { DataTable } from "./data-table";
import type { DataTableColumn, PageSize, SortState } from "./data-table";
import { ConfirmDialog, Modal } from "./modal";
import { PageHeader } from "./page-header";
import { Tabs } from "./tabs";
import { ToastProvider, useToast } from "./toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Badge 계열", () => {
  it("배지는 글자와 색조를 함께 표시한다", () => {
    render(<Badge tone="green">계약 중</Badge>);
    const badge = screen.getByText("계약 중");
    expect(badge.getAttribute("data-tone")).toBe("green");
  });

  it("거래유형 태그를 표시한다", () => {
    render(<TradeTypeTag type="jeonse" />);
    expect(screen.getByText("전세")).toBeTruthy();
  });

  it("만기 일수는 D-숫자로 표시하고 당일은 0, 값이 없으면 없음이다", () => {
    const { rerender } = render(<DDayTag daysLeft={0} />);
    expect(screen.getByText("D-0")).toBeTruthy();
    rerender(<DDayTag daysLeft={110} />);
    expect(screen.getByText("D-110")).toBeTruthy();
    rerender(<DDayTag daysLeft={null} />);
    expect(screen.getByText("없음")).toBeTruthy();
  });
});

describe("Card와 PageHeader", () => {
  it("카드 제목과 페이지 제목을 제목 단계로 표시한다", () => {
    render(
      <>
        <PageHeader
          title="매물 관리"
          description="설명"
          actions={<button type="button">등록</button>}
        />
        <Card title="요약">내용</Card>
      </>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "매물 관리" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "요약" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "등록" })).toBeTruthy();
  });
});

describe("Tabs", () => {
  it("방향키로 탭을 이동하고 선택된 패널을 보여준다", async () => {
    function Harness() {
      const [key, setKey] = useState("a");
      return (
        <Tabs
          label="구분"
          activeKey={key}
          onActiveKeyChange={setKey}
          items={[
            { key: "a", label: "진행", panel: <p>진행 내용</p> },
            { key: "b", label: "완료", panel: <p>완료 내용</p> },
          ]}
        />
      );
    }
    render(<Harness />);
    const first = screen.getByRole("tab", { name: "진행" });
    expect(first.getAttribute("aria-selected")).toBe("true");
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "완료" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("완료 내용");
  });
});

type Row = { id: string; name: string };
const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "이름", render: (row) => row.name, isSortable: true },
];

function TableHarness({
  rows,
  total,
  errorMessage,
  onRetry,
}: {
  rows: Row[];
  total: number;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [sort, setSort] = useState<SortState | undefined>(undefined);
  return (
    <>
      <DataTable
        caption="목록"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sort={sort}
        onSortChange={setSort}
        errorMessage={errorMessage}
        onRetry={onRetry}
      />
      <output data-testid="state">{`${page}|${pageSize}|${sort?.key ?? ""}|${sort?.direction ?? ""}`}</output>
    </>
  );
}

describe("DataTable", () => {
  it("행과 총건수를 보여주고 정렬 상태를 aria-sort로 알린다", async () => {
    render(<TableHarness rows={[{ id: "1", name: "가" }]} total={60} />);
    expect(screen.getByText("가")).toBeTruthy();
    expect(screen.getByText("총 60건")).toBeTruthy();
    const header = screen.getByRole("columnheader", { name: /이름/ });
    expect(header.getAttribute("aria-sort")).toBe("none");
    await userEvent.click(screen.getByRole("button", { name: /이름/ }));
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    await userEvent.click(screen.getByRole("button", { name: /이름/ }));
    expect(header.getAttribute("aria-sort")).toBe("descending");
  });

  it("페이지 크기는 25/50/100만 고를 수 있고 이동 버튼 범위를 지킨다", async () => {
    render(<TableHarness rows={[{ id: "1", name: "가" }]} total={60} />);
    const sizeSelect = screen.getByLabelText("페이지당") as HTMLSelectElement;
    expect(Array.from(sizeSelect.options).map((option) => option.value)).toEqual([
      "25",
      "50",
      "100",
    ]);
    const prev = screen.getByRole("button", { name: "이전" }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByTestId("state").textContent).toBe("2|25||");
    await userEvent.selectOptions(sizeSelect, "100");
    expect(screen.getByTestId("state").textContent).toContain("|100|");
  });

  it("빈 화면 안내를 보여준다", () => {
    render(<TableHarness rows={[]} total={0} />);
    expect(screen.getByText("표시할 내용이 없습니다.")).toBeTruthy();
  });

  it("오류 상태에서는 alert와 다시 시도 버튼을 보여준다", async () => {
    const onRetry = vi.fn();
    render(
      <TableHarness rows={[]} total={0} errorMessage="불러오지 못했습니다." onRetry={onRetry} />,
    );
    expect(screen.getByRole("alert").textContent).toContain("불러오지 못했습니다.");
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("Modal", () => {
  function ModalHarness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          열기
        </button>
        <Modal isOpen={open} title="알림" onClose={() => setOpen(false)}>
          <button type="button">안쪽 버튼</button>
        </Modal>
      </>
    );
  }

  it("열면 포커스가 안으로 들어가고 ESC로 닫히며 포커스가 돌아온다", async () => {
    render(<ModalHarness />);
    const opener = screen.getByRole("button", { name: "열기" });
    await userEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "알림" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("Tab 이동이 대화상자 안에서 순환한다", async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole("button", { name: "열기" }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "안쪽 버튼" }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "안쪽 버튼" }));
  });

  it("확인 대화상자는 확인과 취소를 전달하고 처리 중 중복 확인을 막는다", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        isOpen
        title="삭제"
        message="삭제할까요?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(
      <ConfirmDialog
        isOpen
        isPending
        title="삭제"
        message="삭제할까요?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("Toast", () => {
  function ToastHarness() {
    const { showToast } = useToast();
    return (
      <button type="button" onClick={() => showToast("저장했습니다.", "success")}>
        저장
      </button>
    );
  }

  it("알림을 status로 보여주고 닫기와 자동 사라짐을 지원한다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("status").textContent).toContain("저장했습니다.");
    await userEvent.click(screen.getByRole("button", { name: "알림 닫기" }));
    expect(screen.queryByRole("status")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("status")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
