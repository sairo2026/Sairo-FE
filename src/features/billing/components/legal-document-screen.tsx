import { PageHeader } from "@/shared/components/ui/page-header";
import { PRIVACY_ARTICLES, REFUND_ARTICLES, TERMS_ARTICLES } from "../model/legal-documents";
import type { LegalArticle } from "../model/legal-documents";

export type LegalKind = "terms" | "refund" | "privacy";

const DOCUMENTS: Record<
  LegalKind,
  { title: string; description: string; articles: readonly LegalArticle[] }
> = {
  terms: {
    title: "이용약관",
    description: "사이로 서비스를 사무소가 이용하는 조건입니다.",
    articles: TERMS_ARTICLES,
  },
  refund: {
    title: "환불정책",
    description: "해지, 환불, 결제 실패와 요금 변경의 기준입니다.",
    articles: REFUND_ARTICLES,
  },
  privacy: {
    title: "개인정보처리방침",
    description: "사이로가 처리하는 개인정보의 항목과 목적입니다.",
    articles: PRIVACY_ARTICLES,
  },
};

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

export function legalKindFromPolicy(kind: string): LegalKind | null {
  if (kind === "TERMS") return "terms";
  if (kind === "REFUND") return "refund";
  if (kind === "PRIVACY") return "privacy";
  return null;
}

export function LegalDocumentScreen({ kind }: { kind: LegalKind }) {
  const document = DOCUMENTS[kind];
  return (
    <article>
      <PageHeader title={document.title} description={document.description} />
      <div className="mt-8 flex flex-col gap-8">
        {document.articles.map((article) => (
          <section key={article.no} aria-labelledby={`legal-${article.no}`}>
            <h2 id={`legal-${article.no}`} className="mb-3 text-h2 font-semibold text-ink">
              {article.no} ({article.title})
            </h2>
            {article.paragraphs.length === 1 ? (
              <p className="text-body leading-7 text-ink">{article.paragraphs[0]}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {article.paragraphs.map((paragraph, index) => (
                  <li key={paragraph} className="text-body leading-7 text-ink">
                    {CIRCLED[index] ?? `${index + 1}.`} {paragraph}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
