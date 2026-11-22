import { expect, test } from "@playwright/test";
import { settle } from "./support/app";

const routes = [
  ["/customers/new", ["연락처", "보조 연락처"]],
  ["/customers/301/edit", ["연락처", "보조 연락처"]],
  ["/contracts/new", ["매도·임대인 1 연락처", "매수·임차인 1 연락처"]],
] as const;

for (const [route, labels] of routes) {
  test(`${route}: 붙여넣은 업무 연락처의 자릿수와 금지 문자를 보존한다`, async ({
    browserName,
    context,
    page,
  }) => {
    // Chromium headless requires explicit clipboard access. The other engines
    // reject these Playwright permissions and use the trusted click below.
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }
    await page.goto(route);
    await settle(page);

    for (const label of labels) {
      const field = page.getByLabel(label, { exact: true });
      for (const input of ["1".repeat(15), "1".repeat(7) + "x"]) {
        await field.evaluate((element, value) => {
          element.removeAttribute("data-e2e-clipboard");
          element.addEventListener(
            "click",
            async () => {
              try {
                await navigator.clipboard.writeText(value);
                element.setAttribute("data-e2e-clipboard", "written");
              } catch (error) {
                element.setAttribute("data-e2e-clipboard", String(error));
              }
            },
            { once: true },
          );
        }, input);
        // Firefox and WebKit require user activation for a clipboard write.
        await field.click();
        await expect(field).toHaveAttribute("data-e2e-clipboard", "written");
        await field.press("ControlOrMeta+a");
        await field.press("ControlOrMeta+v");
        await expect(field).toHaveValue(input);
      }
    }
  });
}
