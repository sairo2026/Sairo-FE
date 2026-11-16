import type { Page } from "@playwright/test";

export type Probe = {
  consoleErrors: string[];
  failedApis: string[];
  pageErrors: string[];
  detach: () => void;
};

export function attachProbe(page: Page): Probe {
  let active = true;
  const probe: Probe = {
    consoleErrors: [],
    failedApis: [],
    pageErrors: [],
    detach: () => {
      active = false;
    },
  };
  page.on("console", (message) => {
    if (!active || message.type() !== "error") return;
    const text = message.text();
    // 응답 상태는 failedApis가 따로 잡는다.
    if (text.startsWith("Failed to load resource")) return;
    probe.consoleErrors.push(text.slice(0, 300));
  });
  page.on("pageerror", (error) => {
    if (active) probe.pageErrors.push(String(error).slice(0, 300));
  });
  page.on("response", (response) => {
    if (!active) return;
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/")) return;
    if (response.status() >= 400) {
      probe.failedApis.push(
        `${response.status()} ${response.request().method()} ${url.pathname}${url.search}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    if (!active) return;
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) {
      probe.failedApis.push(`FAILED ${request.method()} ${url.pathname}`);
    }
  });
  return probe;
}

/** 모의 자료에 없는 번호(1)나 비어 있는 상태를 뜻하는 404·401은 정상 응답으로 본다. */
const EXPECTED_EMPTY =
  /^(404|401) GET .*(\/1(\/|\?|$)|archive-grants\/current|owner-transfer|start-customer-agreement)/;

export function unexpectedFailures(probe: Probe): string[] {
  return probe.failedApis.filter((line) => !EXPECTED_EMPTY.test(line));
}

export type PageFacts = {
  overflow: number;
  headings: string[];
  forbidden: boolean;
  menu: string[];
  actions: string[];
  disabledActions: string[];
  banner: string | null;
  url: string;
};

export const MUTATING = /등록|저장|삭제|보관|추가|생성|신청|제출|발송|확정|취소|이전|내보내기/;

export async function collectFacts(page: Page): Promise<PageFacts> {
  return page.evaluate((mutatingSource) => {
    const mutating = new RegExp(mutatingSource);
    const root = document.documentElement;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const textOf = (el: Element) => (el.textContent ?? "").trim().replace(/\s+/g, " ");
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, [role='heading']"))
      .filter(visible)
      .map(textOf);
    const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
    const menu = nav ? Array.from(nav.querySelectorAll("a")).map(textOf) : [];
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main button, main a[href], [role='main'] button, [role='main'] a[href]",
      ),
    ).filter(visible);
    const named = controls
      .map((el) => ({
        text: el.getAttribute("aria-label") ?? textOf(el),
        disabled:
          (el as HTMLButtonElement).disabled === true ||
          el.getAttribute("aria-disabled") === "true",
      }))
      .filter((item) => mutating.test(item.text));
    const status = Array.from(document.querySelectorAll("[role='status']"))
      .map(textOf)
      .find((text) => text.includes("읽기만"));
    return {
      overflow: root.scrollWidth - root.clientWidth,
      headings,
      forbidden: headings.some((text) => text.includes("접근 권한이 없습니다")),
      menu,
      actions: named.filter((item) => !item.disabled).map((item) => item.text),
      disabledActions: named.filter((item) => item.disabled).map((item) => item.text),
      banner: status ?? null,
      url: location.pathname,
    };
  }, MUTATING.source);
}
