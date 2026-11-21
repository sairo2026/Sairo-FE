function localOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.origin !== url.href.slice(0, -1)
  ) {
    throw new Error("Real API E2E requires a loopback HTTP origin");
  }
  return url.origin;
}

export const FRONT_ORIGIN = localOrigin(`http://localhost:${process.env.E2E_PORT ?? 3000}`);
export const API_ORIGIN = localOrigin(process.env.E2E_API_ORIGIN ?? "http://127.0.0.1:8080");

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
