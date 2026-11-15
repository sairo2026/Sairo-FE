import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_ROBOTS } from "@/shared/lib/site-metadata";

export const metadata: Metadata = {
  title: { default: "사이로 운영", template: "%s" },
  robots: NOINDEX_ROBOTS,
};

export default function OpsLayout({ children }: { children: ReactNode }) {
  return children;
}
