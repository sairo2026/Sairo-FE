import { expect, test } from "@playwright/test";
import { OPS_ROLES } from "../src/features/ops/model/roles";
import { useMockOpsRoles } from "./support/app";

for (const width of [320, 390]) {
  test(`운영 역할이 많아도 ${width}px 화면에서 상단 글자와 로그아웃이 겹치지 않는다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await useMockOpsRoles(page, OPS_ROLES);
    await page.goto("/ops/announcements");

    const header = page.getByRole("banner");
    const title = header.getByText("운영 콘솔", { exact: true });
    const roles = header.getByText(/보안관리자/);
    const logout = header.getByRole("button", { name: "로그아웃" });
    await expect(title).toBeVisible();
    await expect(roles).toBeVisible();
    await expect(logout).toBeVisible();

    const headerBounds = await header.boundingBox();
    const titleBounds = await title.boundingBox();
    const roleBounds = await roles.boundingBox();
    const logoutBounds = await logout.boundingBox();
    if (!headerBounds || !titleBounds || !roleBounds || !logoutBounds) {
      throw new Error("운영 콘솔 상단의 렌더링 영역을 확인할 수 없습니다.");
    }
    expect(roleBounds.y).toBeGreaterThanOrEqual(titleBounds.y + titleBounds.height);
    expect(roleBounds.y + roleBounds.height).toBeLessThanOrEqual(
      headerBounds.y + headerBounds.height,
    );
    expect(logoutBounds.x + logoutBounds.width).toBeLessThanOrEqual(width);
  });
}
