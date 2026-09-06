"use client";

import Link from "next/link";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ErrorBlock } from "@/components/ui/States";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-xl flex-col justify-center px-6 py-16">
        <KanjiMark glyph="鍵" className="absolute -right-6 top-0 text-[7rem] sm:-right-10 sm:text-[12rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">
          {t("auth.forgotPasswordKicker")}
        </span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">
          {t("auth.forgotPasswordTitle")}
        </h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">{t("auth.forgotPasswordSubtitle")}</p>

        <Card className="relative z-20 mt-12">
          <CardBody>
            {sent ? (
              <p className="text-base text-white/70">{t("auth.forgotPasswordSent")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <ErrorBlock message={error} />}
                <div>
                  <Label htmlFor="email">{t("auth.emailLabel")}</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {t("auth.forgotPasswordSubmit")}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <p className="relative z-20 mt-8 text-center text-base text-white/45">
          <Link href="/login" className="font-medium text-shu-400 hover:text-shu-300">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
