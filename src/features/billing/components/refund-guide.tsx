import { TextLink } from "@/shared/components/feedback/page-parts";
import { Card } from "@/shared/components/ui/card";
import { COPY } from "../model/messages";
import { REFUND_GUIDE_COPY } from "../model/legal-copy";

export function RefundGuide() {
  return (
    <Card title={REFUND_GUIDE_COPY.title} tone="flat">
      <p className="text-caption text-ink-2">{COPY.refundTop}</p>
      <div className="mt-4 overflow-x-auto rounded-control border border-line">
        <table className="w-full min-w-[28rem] border-collapse text-left text-caption">
          <caption className="sr-only">{REFUND_GUIDE_COPY.title}</caption>
          <thead className="bg-surface">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold text-ink">
                사유
              </th>
              <th scope="col" className="px-3 py-2 font-semibold text-ink">
                환불 금액
              </th>
            </tr>
          </thead>
          <tbody>
            {REFUND_GUIDE_COPY.rows.map(([reason, amount]) => (
              <tr key={reason} className="border-t border-line align-top">
                <td className="px-3 py-2 text-ink-2">{reason}</td>
                <td className="px-3 py-2 text-ink-2">{amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-caption font-semibold text-ink">환불하지 않는 경우</p>
      <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5 text-caption text-ink-2">
        {REFUND_GUIDE_COPY.noRefund.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      <div className="mt-3">
        <TextLink href="/legal/refund-policy">환불정책 전문 보기</TextLink>
      </div>
    </Card>
  );
}
