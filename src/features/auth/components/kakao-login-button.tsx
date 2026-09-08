export function KakaoLoginButton() {
  return (
    <a
      href="/api/auth/kakao/start"
      className="flex w-full items-center justify-center rounded-xl bg-[#FEE500] px-6 py-4 text-sm font-semibold text-neutral-900 transition hover:brightness-95"
    >
      카카오로 시작하기
    </a>
  );
}
