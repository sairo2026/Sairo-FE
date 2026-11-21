// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { TextField } from "./text-field";

afterEach(cleanup);

function Harness({ allowInternational }: { allowInternational?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <TextField
      label="연락처"
      kind="tel"
      value={value}
      onValueChange={setValue}
      allowInternational={allowInternational}
    />
  );
}

describe("전화번호 입력의 국가번호", () => {
  it("허용하면 +로 시작하는 번호를 그대로 둔다", () => {
    render(<Harness allowInternational />);
    const input = screen.getByLabelText("연락처") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "+82-10-1234-5678" } });

    expect(input.value).toBe("+82-10-1234-5678");
  });

  it("허용하지 않으면 기존처럼 숫자만 남기고 하이픈을 넣는다", () => {
    render(<Harness />);
    const input = screen.getByLabelText("연락처") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "01012345678" } });

    expect(input.value).toBe("010-1234-5678");
  });

  it("허용 속성이 입력창 요소에 새어 나가지 않는다", () => {
    render(<Harness allowInternational />);

    expect(screen.getByLabelText("연락처").hasAttribute("allowinternational")).toBe(false);
  });
});
