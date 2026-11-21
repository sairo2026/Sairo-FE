import type { Page } from "@playwright/test";

export type ContrastFailure = {
  text: string;
  color: string;
  background: string;
  ratio: number;
  required: number;
  size: number;
};

/**
 * 화면에 보이는 글자의 대비를 실제 계산된 색으로 측정한다.
 * 비활성 컨트롤과 그 안의 글자, 그림·그라데이션 위의 글자는 제외한다.
 */
export async function measureTextContrast(page: Page): Promise<ContrastFailure[]> {
  return page.evaluate(() => {
    type Rgba = { r: number; g: number; b: number; a: number };
    const parse = (value: string): Rgba | null => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r = 0, g = 0, b = 0, a = 1] = (m[1] ?? "")
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);
      return { r, g, b, a };
    };
    const blend = (top: Rgba, bottom: Rgba): Rgba => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });
    const lum = (c: Rgba) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a: Rgba, b: Rgba) => {
      const la = lum(a);
      const lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const hex = (c: Rgba) =>
      "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

    const failures: ContrastFailure[] = [];
    const seen = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el) continue;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.visibility === "hidden" || style.display === "none" || rect.width === 0) continue;
      if (rect.height === 0 || Number(style.opacity) === 0) continue;
      if (el.closest("[disabled], [aria-disabled='true'], [aria-hidden='true'], [hidden]"))
        continue;

      let background: Rgba = { r: 255, g: 255, b: 255, a: 1 };
      const layers: Rgba[] = [];
      let unknown = false;
      let opacity = 1;
      for (let cur: Element | null = el; cur; cur = cur.parentElement) {
        const s = getComputedStyle(cur);
        opacity *= Number(s.opacity);
        if (s.backgroundImage !== "none") {
          unknown = true;
          break;
        }
        const bg = parse(s.backgroundColor);
        if (bg && bg.a > 0) {
          layers.push(bg);
          if (bg.a === 1) break;
        }
      }
      if (unknown) continue;
      for (const layer of layers.reverse()) background = blend(layer, background);

      const fg = parse(style.color);
      if (!fg) continue;
      const fgOpaque = blend({ ...fg, a: fg.a * opacity }, background);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const required = large ? 3 : 4.5;
      const value = ratio(fgOpaque, background);
      if (value + 0.005 >= required) continue;
      const key = `${hex(fgOpaque)}|${hex(background)}|${size}|${text.slice(0, 24)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      failures.push({
        text: text.slice(0, 40),
        color: hex(fgOpaque),
        background: hex(background),
        ratio: Math.round(value * 100) / 100,
        required,
        size,
      });
    }
    return failures;
  });
}
