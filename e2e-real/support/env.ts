export const API_ORIGIN = process.env.E2E_API_ORIGIN ?? "http://127.0.0.1:8080";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
