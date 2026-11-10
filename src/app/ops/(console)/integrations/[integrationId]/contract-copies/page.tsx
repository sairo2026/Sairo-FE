import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractCopiesScreen } from "@/features/ops/integrations/contract-copies-screen";

export const metadata: Metadata = { title: "공급자 계약서 사본 | 사이로 운영" };

export default async function Page({ params }: { params: Promise<{ integrationId: string }> }) {
  const { integrationId: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ContractCopiesScreen integrationId={id} />;
}
