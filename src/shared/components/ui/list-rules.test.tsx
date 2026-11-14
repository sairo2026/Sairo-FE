// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";
import type { DataTableColumn } from "./data-table";
import { Pagination, pageItems } from "./pagination";

afterEach(cleanup);

type Row = { id: string; name: string; amount: number };

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "이름", render: (row) => row.name, truncate: true },
  { key: "amount", header: "금액", render: (row) => `${row.amount}원`, align: "right" },
];

function renderTable(
  props: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
  rows: Row[] = [{ id: "1", name: "아주아주 긴 매물 이름입니다", amount: 1000 }],
) {
  return render(
    <DataTable
      caption="목록"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      totalCount={rows.length}
      page={1}
      pageSize={25}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      {...props}
    />,
  );
}

describe("쪽 번호", () => {
  it("현재 쪽 주변과 처음·끝 쪽만 보이고 나머지는 줄임표로 접는다", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageItems(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageItems(10, 10)).toEqual([1, null, 9, 10]);
    expect(pageItems(1, 1)).toEqual([1]);
  });

  it("현재 쪽을 aria-current로 알리고 번호와 이전·다음으로 이동한다", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination label="목록 페이지 이동" page={2} pageCount={5} onPageChange={onPageChange} />,
    );
    const nav = screen.getByRole("navigation", { name: "목록 페이지 이동" });
    expect(within(nav).getByRole("button", { name: "2쪽" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      within(nav).getByRole("button", { name: "3쪽" }).getAttribute("aria-current"),
    ).toBeNull();
    await userEvent.click(within(nav).getByRole("button", { name: "5쪽" }));
    expect(onPageChange).toHaveBeenLastCalledWith(5);
    await userEvent.click(within(nav).getByRole("button", { name: "이전" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(within(nav).getByRole("button", { name: "다음" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it("첫 쪽에서는 이전이, 마지막 쪽에서는 다음이 비활성이다", () => {
    const { rerender } = render(
      <Pagination label="n" page={1} pageCount={3} onPageChange={() => {}} />,
    );
    expect((screen.getByRole("button", { name: "이전" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<Pagination label="n" page={3} pageCount={3} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: "다음" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("표 규칙", () => {
  it("머리글은 고정되고 표는 가로와 세로로 스크롤된다", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: "이름" }).className).toContain("sticky");
    expect(screen.getByRole("columnheader", { name: "이름" }).className).toContain("top-0");
  });

  it("긴 글은 말줄임으로 줄이고 전체 글은 title로 보여준다", () => {
    renderTable();
    const text = screen.getByText("아주아주 긴 매물 이름입니다");
    expect(text.className).toContain("truncate-text");
    expect(text.getAttribute("title")).toBe("아주아주 긴 매물 이름입니다");
  });

  it("숫자 열은 머리글과 셀 모두 오른쪽 정렬이다", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: "금액" }).className).toContain("text-right");
    expect(screen.getByText("1000원").closest("td")?.className).toContain("tabular-nums");
  });

  it("진입 주소가 있는 행은 호버 배경과 화살표를 갖고 행 전체가 링크 영역이다", () => {
    renderTable({ getRowHref: (row) => `/items/${row.id}` });
    const row = screen.getByText("아주아주 긴 매물 이름입니다").closest("tr");
    expect(row?.className).toContain("hover:bg-primary-soft");
    expect(row?.className).toContain("active:bg-primary-line");
    expect(row?.querySelector('a[href="/items/1"]')).not.toBeNull();
    expect(row?.textContent).toContain("›");
  });

  it("진입 주소가 없으면 호버 효과와 화살표를 두지 않는다", () => {
    renderTable();
    const row = screen.getByText("아주아주 긴 매물 이름입니다").closest("tr");
    expect(row?.className).not.toContain("hover:bg-primary-soft");
    expect(row?.textContent).not.toContain("›");
  });

  it("불러오는 중에는 상태를 알리고 오류와 빈 목록은 각자의 안내를 보여준다", () => {
    const { rerender } = renderTable({ isLoading: true });
    expect(screen.getByRole("status").textContent).toBe("불러오는 중입니다.");
    rerender(
      <DataTable
        caption="목록"
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        totalCount={0}
        page={1}
        pageSize={25}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        emptyMessage="고객이 없습니다."
      />,
    );
    expect(screen.getByText("고객이 없습니다.")).not.toBeNull();
    expect(screen.getByText("총 0건")).not.toBeNull();
  });
});
