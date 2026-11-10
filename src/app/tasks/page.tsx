import type { Metadata } from "next";
import { OfficeAccessShell } from "@/features/auth/components/office-access-gate";
import { TaskListScreen } from "@/features/home/components/task-list-screen";

export const metadata: Metadata = { title: "업무 | 사이로" };

export default function Page() {
  return (
    <OfficeAccessShell activeKey="home">
      <TaskListScreen />
    </OfficeAccessShell>
  );
}
