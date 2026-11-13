import { createHmac } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(encoded: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of encoded.replace(/[\s=]/g, "").toUpperCase()) {
    value = (value << 5) | ALPHABET.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, offsetSteps = 0, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / 30) + offsetSteps;
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = Array.from(createHmac("sha1", decodeBase32(secret)).update(message).digest());
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const byte = (index: number) => digest[offset + index] ?? 0;
  const binary = ((byte(0) & 0x7f) << 24) | (byte(1) << 16) | (byte(2) << 8) | byte(3);
  return String(binary % 1_000_000).padStart(6, "0");
}
