type GateEnv = Readonly<Record<string, string | undefined>>;

export const COMING_SOON_PATH = "/coming-soon";

export function isComingSoonMode(env: GateEnv): boolean {
  if (env.COMING_SOON === "true") {
    return true;
  }
  if (env.COMING_SOON === "false") {
    return false;
  }
  return env.VERCEL_ENV === "production";
}
