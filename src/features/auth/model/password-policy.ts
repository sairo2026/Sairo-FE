import { countCodePoints } from "@/shared/lib/format";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 12;

export type PasswordStrength = "weak" | "fair" | "strong";

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "password",
  "password1",
  "qwerty123",
  "qwertyuiop",
  "abcd1234",
  "asdf1234",
  "iloveyou",
]);

export function validatePasswordInput(value: string): string | null {
  const length = countCodePoints(value);
  if (length === 0 || value.trim() === "") return "비밀번호를 입력해 주세요.";
  if (length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`;
  if (length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다.`;
  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return "너무 흔한 비밀번호입니다. 다른 비밀번호를 입력해 주세요.";
  }
  return null;
}

export function passwordStrength(value: string): PasswordStrength {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(value),
  ).length;
  const length = countCodePoints(value);
  if (length < PASSWORD_MIN || classes <= 1) return "weak";
  if (classes >= 3 && length >= 10) return "strong";
  return "fair";
}

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: "약함",
  fair: "보통",
  strong: "강함",
};
