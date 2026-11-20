import { ErrorScreen } from "@/shared/components/feedback/error-screen";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorScreen kind="not-found" />
    </main>
  );
}
