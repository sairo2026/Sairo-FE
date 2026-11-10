import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { format, resolveConfig } from "prettier";
import { AREAS, ENUM_HINTS, selectAreaDtos } from "./contracts/areas.mjs";
import { applyEnumHints, emitModule } from "./contracts/emit.mjs";
import { parseSpec } from "./contracts/spec-parser.mjs";

const { values } = parseArgs({
  options: {
    spec: { type: "string" },
    area: { type: "string", multiple: true },
    out: { type: "string", default: "src/lib/api/contracts" },
  },
});

if (!values.spec || !values.area || values.area.length === 0) {
  console.error(
    `사용법: node scripts/generate-contracts.mjs --spec <API 명세서 markdown 경로> --area <영역> [--area <영역>] [--out <출력 폴더>]\n사용 가능한 영역: ${Object.keys(AREAS).join(", ")}`,
  );
  process.exit(1);
}

const markdown = await readFile(values.spec, "utf8");
const dtos = parseSpec(markdown);
await mkdir(values.out, { recursive: true });

for (const areaName of values.area) {
  const selected = selectAreaDtos(dtos, areaName).map((dto) => applyEnumHints(dto, ENUM_HINTS));
  const issues = [];
  const source = emitModule(selected, issues);
  const target = path.join(values.out, `${areaName}.schema.ts`);
  const options = (await resolveConfig(target)) ?? {};
  const formatted = await format(source, { ...options, parser: "typescript", endOfLine: "lf" });
  await writeFile(target, formatted, "utf8");
  const withoutFields = selected.filter((dto) => dto.fields.length === 0).map((dto) => dto.name);
  console.log(
    `${areaName}: DTO ${selected.length}개 생성, 필드 표가 없는 DTO ${withoutFields.length}개`,
  );
  if (withoutFields.length > 0) console.log(`  필드 표 없음: ${withoutFields.join(", ")}`);
  for (const issue of issues) console.log(`  경고: ${issue}`);
}
