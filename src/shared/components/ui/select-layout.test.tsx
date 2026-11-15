// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";
import { RadioGroup, SelectField } from "./select-field";

afterEach(cleanup);

describe("선택 상자와 칸 버튼 규격", () => {
  it("선택 상자는 높이 42에 1px 회색 테두리와 작은 모서리를 쓴다", () => {
    render(
      <SelectField
        label="역할"
        value=""
        options={[{ value: "a", label: "가" }]}
        onValueChange={() => {}}
      />,
    );
    const select = screen.getByLabelText("역할");
    expect(select.className).toContain("h-[42px]");
    expect(select.className).toContain("rounded-small");
    expect(select.className).toContain("border-[#9ca3af]");
  });

  it("inline 배치는 라벨을 선택 상자 왼쪽에 두고 같은 선택 동작을 쓴다", async () => {
    const onValueChange = vi.fn();
    render(
      <SelectField
        layout="inline"
        label="담당자"
        value=""
        options={[
          { value: "", label: "전체" },
          { value: "2", label: "이중개" },
        ]}
        onValueChange={onValueChange}
      />,
    );
    const label = screen.getByText("담당자");
    expect(label.parentElement?.className).toContain("flex-row");
    await userEvent.selectOptions(screen.getByLabelText("담당자"), "2");
    expect(onValueChange).toHaveBeenCalledWith("2");
  });

  it("칸 버튼 라디오는 선택된 칸에 브랜드 테두리를 주고 라디오로 동작한다", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        variant="segmented"
        legend="고객 구분"
        name="kind"
        value="individual"
        options={[
          { value: "individual", label: "개인" },
          { value: "corporation", label: "법인" },
        ]}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radio", { name: "개인" }).closest("label")?.className).toContain(
      "border-primary",
    );
    expect(screen.getByRole("radio", { name: "법인" }).closest("label")?.className).toContain(
      "h-[58px]",
    );
    await userEvent.click(screen.getByRole("radio", { name: "법인" }));
    expect(onValueChange).toHaveBeenCalledWith("corporation");
  });
});

describe("표 규격", () => {
  it("머리글은 높이 60의 굵은 글자이고 표에 바깥 테두리가 없다", () => {
    const { container } = render(
      <DataTable
        caption="목록"
        columns={[{ key: "name", header: "이름", render: (row: { id: string }) => row.id }]}
        rows={[{ id: "a" }]}
        getRowId={(row) => row.id}
        totalCount={1}
        page={1}
        pageSize={25}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    const header = screen.getByRole("columnheader", { name: "이름" });
    expect(header.className).toContain("h-[60px]");
    expect(header.className).toContain("font-bold");
    expect(container.querySelector("table")?.parentElement?.className).not.toContain("border ");
  });
});
