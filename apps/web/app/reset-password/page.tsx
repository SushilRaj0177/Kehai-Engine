"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ErrorBlock, EmptyState } from "@/components/ui/States";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

export default function ResetPasswordPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        skipAuth: true,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24">
          <EmptyState
            title={t("auth.resetPasswordInvalidTitle")}
            description={t("auth.resetPasswordInvalidDescription")}
            action={
              <Link href="/forgot-password">
                <Button>{t("auth.forgotPasswordSubmit")}</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-xl flex-col justify-center px-6 py-16">
        <KanjiMark glyph="鍵" className="absolute -right-6 top-0 text-[7rem] sm:-right-10 sm:text-[12rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">
          {t("auth.resetPasswordKicker")}
        </span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">
          {t("auth.resetPasswordTitle")}
        </h1>

        <Card className="relative z-20 mt-12">
          <CardBody>
            {done ? (
              <div className="space-y-6">
                <p className="text-base text-white/70">{t("auth.resetPasswordDone")}</p>
                <Link href="/login">
                  <Button size="lg" className="w-full">
                    {t("auth.backToSignIn")}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <ErrorBlock message={error} />}
                <div>
                  <Label htmlFor="password">{t("auth.newPasswordLabel")}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">{t("auth.confirmPasswordLabel")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {t("auth.resetPasswordSubmit")}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
