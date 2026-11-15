import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ALLOWED_SIZES = new Set([25, 50, 100]);
const SRC_ROOT = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("목록 조회 size", () => {
  it("서버가 허용하는 25, 50, 100 외의 값을 코드에 쓰지 않는다", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC_ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bpage: 0, size: (\d+)/g)) {
        if (!ALLOWED_SIZES.has(Number(match[1]))) offenders.push(`${file}: size ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
