import { apiFetch } from "@/shared/api/client";

export async function checkSession() {
  await apiFetch<unknown>("/api/home");
}
