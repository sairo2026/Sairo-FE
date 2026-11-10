import type { Metadata } from "next";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata: Metadata = { title: "운영 콘솔 | 사이로" };

export default function OpsHomePage() {
  return <PageHeader title="운영 홈" description="운영자 로그인이 확인되었습니다." />;
}
