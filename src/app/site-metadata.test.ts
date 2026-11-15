import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "font-variable", className: "font-class" }),
}));
vi.mock("./providers", () => ({ Providers: () => null }));

const PUBLIC_PAGES = [
  { path: "pricing", title: "요금 안내" },
  { path: "login", title: "로그인" },
  { path: "signup", title: "회원가입" },
  { path: "legal", title: "약관과 정책" },
  { path: "legal/terms", title: "이용약관" },
  { path: "legal/privacy", title: "개인정보처리방침" },
  { path: "legal/refund-policy", title: "환불정책" },
  { path: "legal/subscription-terms", title: "구독·결제 약관" },
  { path: "legal/processing-outsourcing", title: "개인정보 처리위탁 안내" },
  { path: "legal/marketing", title: "이메일 공지·혜택 안내 수신 동의" },
] as const;

const EXAGGERATION = /최초|유일|완벽|최고|1위|100%|무조건|보장/;

const PAGE_LOADERS: Record<string, () => Promise<{ metadata: Metadata }>> = {
  pricing: () => import("./pricing/page"),
  login: () => import("./login/page"),
  signup: () => import("./signup/page"),
  legal: () => import("./legal/page"),
  "legal/terms": () => import("./legal/terms/page"),
  "legal/privacy": () => import("./legal/privacy/page"),
  "legal/refund-policy": () => import("./legal/refund-policy/page"),
  "legal/subscription-terms": () => import("./legal/subscription-terms/page"),
  "legal/processing-outsourcing": () => import("./legal/processing-outsourcing/page"),
  "legal/marketing": () => import("./legal/marketing/page"),
};

async function loadPageMetadata(path: string): Promise<Metadata> {
  const load = PAGE_LOADERS[path];
  if (!load) throw new Error(`unknown page ${path}`);
  return (await load()).metadata;
}

describe("사이트 기본 메타데이터", () => {
  it("기본 제목과 설명, 제목 템플릿, 공유 미리보기를 새 문구로 설정한다", async () => {
    const { metadata } = await import("./layout");
    expect(metadata.title).toEqual({
      default: "사이로 | 공인중개사 방문 조율·업무 관리",
      template: "%s | 사이로",
    });
    expect(metadata.description).toBe(
      "매물·고객·방문 조율·계약·월말결산을 한 곳에서. 방문 일정은 승인자가 비교해 고르고, 시스템이 겹침을 다시 확인해 확정합니다.",
    );
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      siteName: "사이로(SAIRO)",
      locale: "ko_KR",
      title: "사이로 | 공인중개사 방문 조율·업무 관리",
      description: metadata.description,
      images: [{ url: "/brand/sairo-og.png" }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "사이로 | 공인중개사 방문 조율·업무 관리",
      description: metadata.description,
    });
    expect(
      `${metadata.title && JSON.stringify(metadata.title)} ${metadata.description}`,
    ).not.toMatch(EXAGGERATION);
  });

  it("개별 페이지에서 따로 허용하지 않으면 검색 노출을 막는다", async () => {
    const { metadata } = await import("./layout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    const { metadata: opsMetadata } = await import("./ops/layout");
    expect(opsMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("랜딩 페이지는 기본 제목을 그대로 쓰고 사이트 주소를 대표 주소로 둔다", async () => {
    const { metadata } = await import("./page");
    expect(metadata.title).toEqual({ absolute: "사이로 | 공인중개사 방문 조율·업무 관리" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "https://app.sairo.agency",
      siteName: "사이로(SAIRO)",
      locale: "ko_KR",
    });
  });

  it.each(PUBLIC_PAGES)(
    "$path 페이지는 템플릿에 맞는 제목과 설명을 가지고 검색에 노출된다",
    async ({ path, title }) => {
      const metadata = await loadPageMetadata(path);
      expect(metadata.title).toBe(title);
      expect(`${title} | 사이로`).toMatch(/^[^|]+ \| 사이로$/);
      expect(typeof metadata.description).toBe("string");
      expect(metadata.description).not.toMatch(EXAGGERATION);
      expect(metadata.robots).toEqual({ index: true, follow: true });
    },
  );

  it.each(PUBLIC_PAGES.filter(({ path }) => path.startsWith("legal/")))(
    "$path 설명은 중립적인 안내 문장이다",
    async ({ path }) => {
      const metadata = await loadPageMetadata(path);
      expect(metadata.description).toMatch(/^사이로의 .+ 안내입니다\.$/);
    },
  );
});
