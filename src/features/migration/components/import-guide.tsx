"use client";

import { Card } from "@/shared/components/ui/card";
import {
  IMPORT_GUIDE_COLUMNS,
  sampleCsvHref,
  sampleFileName,
  type GuideTarget,
} from "../model/import-guide";
import { IMPORT_COPY } from "../model/messages";

function isGuideTarget(value: string): value is GuideTarget {
  return value === "CUSTOMER" || value === "PROPERTY";
}

/** 이전 순서와 올릴 파일의 열 구성, 샘플 파일을 미리 알려 준다. */
export function ImportGuide({ targetType }: { targetType: string }) {
  const target = isGuideTarget(targetType) ? targetType : null;
  return (
    <Card title="이전 순서와 파일 준비">
      <div className="flex flex-col gap-5">
        <ol className="grid gap-2 text-caption text-ink sm:grid-cols-5">
          {IMPORT_COPY.steps.map((step, index) => (
            <li key={step} className="rounded-control border border-line bg-surface px-3 py-2">
              <span className="font-semibold text-primary">{index + 1}. </span>
              {step}
            </li>
          ))}
        </ol>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-caption text-ink-2">
          {IMPORT_COPY.fileTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        {target ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-caption font-semibold text-ink">
                {target === "CUSTOMER" ? "고객" : "매물"} 파일의 열 구성
              </p>
              <a
                href={sampleCsvHref(target)}
                download={sampleFileName(target)}
                className="text-caption font-semibold text-primary hover:underline"
              >
                샘플 파일 내려받기 (CSV)
              </a>
            </div>
            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full min-w-[36rem] border-collapse text-left text-caption">
                <caption className="sr-only">올릴 파일의 열 구성</caption>
                <thead className="bg-surface">
                  <tr>
                    {["열 이름", "필수", "설명", "예시"].map((column) => (
                      <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {IMPORT_GUIDE_COLUMNS[target].map((column) => (
                    <tr key={column.header} className="border-t border-line align-top">
                      <th scope="row" className="px-3 py-2 text-left font-semibold text-ink">
                        {column.header}
                      </th>
                      <td className="px-3 py-2 text-ink-2">{column.required ? "필수" : "선택"}</td>
                      <td className="px-3 py-2 text-ink-2">{column.description}</td>
                      <td className="px-3 py-2 text-ink-2">{column.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-caption text-ink-2">{IMPORT_COPY.guideColumnNote}</p>
          </div>
        ) : (
          <p className="text-caption text-ink-2">{IMPORT_COPY.guidePickTarget}</p>
        )}
      </div>
    </Card>
  );
}
