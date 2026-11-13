import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectClientBundle, judgeBundle } from "./check-production-bundle.mjs";

const created = [];

async function bundleDir(files) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bundle-check-"));
  created.push(dir);
  for (const [name, text] of Object.entries(files)) {
    const full = path.join(dir, name);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, text, "utf8");
  }
  return dir;
}

afterEach(async () => {
  for (const dir of created.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe("운영 번들의 모의 API 포함 점검", () => {
  it("모의 API 표지가 없으면 통과한다", async () => {
    const dir = await bundleDir({
      "chunks/a.js": "console.info('app')",
      "chunks/b.css": "mock-trace-0001",
    });
    const result = await inspectClientBundle(dir);
    expect(result).toEqual({ scriptCount: 1, hits: [] });
    expect(judgeBundle(result, false).ok).toBe(true);
  });

  it("하위 폴더의 스크립트에서 표지를 찾으면 파일과 표지를 알리며 실패한다", async () => {
    const dir = await bundleDir({
      "chunks/a.js": "ok",
      "chunks/app/lazy.js": 'const t="mock-trace-0001";const k="sairo-mock-office-role"',
    });
    const result = await inspectClientBundle(dir);
    expect(result.hits).toEqual([
      {
        file: path.join("chunks", "app", "lazy.js"),
        markers: ["mock-trace-0001", "sairo-mock-office-role"],
      },
    ]);
    const verdict = judgeBundle(result, false);
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("lazy.js");
  });

  it("번들 파일이 하나도 없으면 통과로 보지 않는다", async () => {
    const dir = await bundleDir({});
    expect(judgeBundle(await inspectClientBundle(dir), false).ok).toBe(false);
    expect(judgeBundle(await inspectClientBundle(path.join(dir, "missing")), true).ok).toBe(false);
  });

  it("모의 API 빌드에서는 표지가 있어야 통과한다", async () => {
    const withMock = await bundleDir({ "chunks/m.js": "warn('[MSW] ...')" });
    const withoutMock = await bundleDir({ "chunks/a.js": "ok" });
    expect(judgeBundle(await inspectClientBundle(withMock), true).ok).toBe(true);
    expect(judgeBundle(await inspectClientBundle(withoutMock), true).ok).toBe(false);
  });
});
