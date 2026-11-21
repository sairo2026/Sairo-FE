import { expect, test } from "@playwright/test";
import { settle } from "./support/app";

const routes = [
  ["/customers/new", ["연락처", "보조 연락처"]],
  ["/customers/301/edit", ["연락처", "보조 연락처"]],
  ["/contracts/new", ["매도·임대인 1 연락처", "매수·임차인 1 연락처"]],
] as const;

for (const [route, labels] of routes) {
  test(`${route}: 붙여넣은 업무 연락처의 자릿수와 금지 문자를 보존한다`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(route);
    await settle(page);

    for (const label of labels) {
      const field = page.getByLabel(label, { exact: true });
      for (const input of ["1".repeat(15), "1".repeat(7) + "x"]) {
        await page.evaluate((value) => navigator.clipboard.writeText(value), input);
        await field.focus();
        await field.press("ControlOrMeta+a");
        await field.press("ControlOrMeta+v");
        await expect(field).toHaveValue(input);
      }
    }
  });
}
