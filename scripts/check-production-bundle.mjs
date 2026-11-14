import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const MOCK_MARKERS = ["mock-trace-0001", "sairo-mock-office-role", "[MSW]"];

async function collectScripts(dir, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectScripts(full, found);
    else if (entry.name.endsWith(".js")) found.push(full);
  }
  return found;
}

export async function inspectClientBundle(staticDir) {
  const scripts = await collectScripts(staticDir);
  const hits = [];
  for (const file of scripts) {
    const text = await readFile(file, "utf8");
    const markers = MOCK_MARKERS.filter((marker) => text.includes(marker));
    if (markers.length > 0) hits.push({ file: path.relative(staticDir, file), markers });
  }
  return { scriptCount: scripts.length, hits };
}

export function judgeBundle(result, expectMock) {
  if (result.scriptCount === 0) {
    return { ok: false, message: "브라우저 번들 파일이 없습니다. 먼저 빌드해 주세요." };
  }
  if (expectMock) {
    return result.hits.length > 0
      ? {
          ok: true,
          message: `모의 API 빌드에서 표지를 ${result.hits.length}개 파일에서 찾았습니다.`,
        }
      : {
          ok: false,
          message: "모의 API 빌드인데 표지를 찾지 못했습니다. 점검 표지를 확인해 주세요.",
        };
  }
  if (result.hits.length > 0) {
    const lines = result.hits.map((hit) => `- ${hit.file}: ${hit.markers.join(", ")}`);
    return {
      ok: false,
      message: `운영 번들에 모의 API 코드가 들어 있습니다.\n${lines.join("\n")}`,
    };
  }
  return {
    ok: true,
    message: `브라우저 번들 ${result.scriptCount}개 파일에 모의 API 코드가 없습니다.`,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      dir: { type: "string", default: ".next/static" },
      "expect-mock": { type: "boolean", default: false },
    },
  });
  const verdict = judgeBundle(await inspectClientBundle(values.dir), values["expect-mock"]);
  if (verdict.ok) console.log(verdict.message);
  else console.error(verdict.message);
  process.exitCode = verdict.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
