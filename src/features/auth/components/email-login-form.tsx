"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";
import { login } from "../api/account.api";
import { authContextQueryKey } from "../hooks/use-auth-context";
import { formatClock, useCountdown } from "../hooks/use-countdown";
import { describeAuthError } from "@/shared/lib/api-messages";
import { landingPathFor, safeNextPath } from "../model/landing";
import { AuthFrame } from "@/shared/components/feedback/form-frame";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("이메일 주소를 올바르게 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});
type LoginForm = z.infer<typeof loginSchema>;

export function EmailLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const lock = useCountdown();
  const [formError, setFormError] = useState<string>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      const result = await login({ email: values.email.trim(), password: values.password });
      await queryClient.invalidateQueries({ queryKey: authContextQueryKey });
      router.replace(safeNextPath(next) ?? landingPathFor(result));
    } catch (error) {
      if (error instanceof ApiError && error.code === "LOGIN_LOCKED") {
        lock.start(error.retryAfterSeconds ?? 900);
        setFormError(undefined);
        return;
      }
      setFormError(
        describeAuthError(error, "로그인하지 못했습니다. 잠시 뒤에 다시 시도해 주세요."),
      );
    }
  });

  const isLocked = lock.remaining > 0;

  return (
    <AuthFrame
      title="이메일로 로그인"
      width="sm"
      variant="login"
      tagline="공인중개사의 업무를 돕는 사이로입니다."
    >
      <form noValidate onSubmit={submit} className="flex flex-col">
        <div className="flex flex-col gap-7">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                label="이메일"
                value={field.value}
                onValueChange={field.onChange}
                inputMode="email"
                autoComplete="username"
                placeholder="email@email.com"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                label="비밀번호"
                kind="password"
                value={field.value}
                onValueChange={field.onChange}
                autoComplete="current-password"
                error={errors.password?.message}
              />
            )}
          />
        </div>
        {isLocked ? (
          <p role="alert" className="mt-3 text-center text-caption text-primary">
            로그인에 5회 실패해 잠시 막았습니다.{" "}
            <span role="timer">{formatClock(lock.remaining)}</span> 뒤에 다시 시도해 주세요.
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="mt-3 text-center text-caption text-primary">
            {formError}
          </p>
        ) : null}
        <div className="mt-8 flex justify-center gap-8 text-caption underline">
          <Link href="/password/forgot" className="text-ink-2 hover:text-primary">
            비밀번호 찾기
          </Link>
          <Link href="/signup" className="font-semibold text-primary hover:text-primary-hover">
            회원가입
          </Link>
        </div>
        <div className="mt-11 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-control bg-primary-soft px-10 font-medium text-ink-2 hover:bg-primary-line"
          >
            뒤로
          </Link>
          <Button type="submit" isLoading={isSubmitting} disabled={isLocked}>
            로그인
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
}
