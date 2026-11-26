import { normalizeLinkToken } from "@/shared/lib/link-token";
import { parseSubmittedSlots, rangesToBlocks } from "./customer-times";
import { kstParts } from "./time";

/** Accept a token or a link from this app, without ever putting it in a query string. */
export function previousCustomerToken(value: string, origin: string): string | null {
  const raw = value.trim();
  const direct = normalizeLinkToken(raw);
  if (direct) return direct;
  try {
    const url = new URL(raw);
    if (url.origin !== origin || url.search || url.hash) return null;
    const match = /^\/visit-responses\/([^/]+)\/?$/.exec(url.pathname);
    return match ? normalizeLinkToken(match[1]) : null;
  } catch {
    return null;
  }
}

/** The picker cannot represent five-minute edges; omit them instead of widening availability. */
export function safeReusableBlocks(raw: unknown) {
  return rangesToBlocks(
    parseSubmittedSlots(raw).flatMap((slot) => {
      const start = kstParts(slot.startsAt);
      const end = kstParts(slot.endsAt);
      if (
        start.date !== end.date ||
        (!start.time.endsWith(":00") && !start.time.endsWith(":30")) ||
        (!end.time.endsWith(":00") && !end.time.endsWith(":30"))
      ) {
        return [];
      }
      return [{ date: start.date, start: start.time, end: end.time }];
    }),
  );
}
