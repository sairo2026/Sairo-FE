import { expect, test } from "@playwright/test";
import { settle, useMockOfficeRole } from "./support/app";
import { listAppRoutes } from "./support/routes";

type LayoutReport = {
  horizontalOverflow: number;
  outside: string[];
  smallTargets: string[];
};

const TARGET_SELECTOR =
  'button, input:not([type="hidden"]), select, textarea, a[href], [role="button"], [role="switch"], [role="checkbox"], [role="tab"]';

function inspectLayout(): LayoutReport {
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  const describe = (element: Element): string => {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
    const classes = Array.from(element.classList).slice(0, 4).join(".");
    return `${tag}${id}${classes ? `.${classes}` : ""}${text ? ` "${text}"` : ""}`;
  };
  const isClippedByAncestor = (element: Element): boolean => {
    let node = element.parentElement;
    while (node && node !== document.body) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return true;
      node = node.parentElement;
    }
    return false;
  };

  const outside: string[] = [];
  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
    if (isClippedByAncestor(element)) continue;
    outside.push(`${describe(element)} [${Math.round(rect.left)}..${Math.round(rect.right)}]`);
  }

  const targets = Array.from(document.body.querySelectorAll<HTMLElement>(TARGET_SELECTOR))
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ element, rect }) => {
      if (rect.width <= 1 || rect.height <= 1) return false;
      const style = getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none";
    });
  const intersects = (
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number },
  ) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const smallTargets: string[] = [];
  for (const { element, rect } of targets) {
    if (rect.width >= 24 && rect.height >= 24) continue;
    if (element.tagName === "A" && element.closest("p, li, td, dd, span")) continue;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const spacing = {
      left: centerX - 12,
      right: centerX + 12,
      top: centerY - 12,
      bottom: centerY + 12,
    };
    const crowded = targets.some(
      (other) => other.element !== element && intersects(spacing, other.rect),
    );
    if (crowded) {
      smallTargets.push(
        `${describe(element)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      );
    }
  }

  return {
    horizontalOverflow: root.scrollWidth - root.clientWidth,
    outside: outside.slice(0, 8),
    smallTargets: smallTargets.slice(0, 8),
  };
}

for (const route of listAppRoutes()) {
  test(`${route.path} fits the viewport without small targets`, async ({ page }) => {
    await useMockOfficeRole(page, route.area === "office" ? "OWNER" : null);
    await page.goto(route.path);
    await settle(page);
    const report = await page.evaluate(inspectLayout);
    expect(report.horizontalOverflow, "document scrollWidth exceeds viewport").toBeLessThanOrEqual(
      1,
    );
    expect(report.outside, "elements extend past the viewport").toEqual([]);
    expect(report.smallTargets, "pointer targets under 24px without spacing").toEqual([]);
  });
}
