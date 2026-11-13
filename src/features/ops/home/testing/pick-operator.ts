import { fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect } from "vitest";

export function operatorOptionsHandler(items: { operatorId: number; name: string }[]) {
  return http.get("/api/ops/operators/options", () =>
    HttpResponse.json({ items: items.map((item) => ({ ...item, roles: ["SUPPORT"] })) }),
  );
}

export async function pickOperator(select: HTMLElement, operatorId: number) {
  await waitFor(() =>
    expect(
      Array.from((select as HTMLSelectElement).options).some(
        (option) => option.value === String(operatorId),
      ),
    ).toBe(true),
  );
  fireEvent.change(select, { target: { value: String(operatorId) } });
}
