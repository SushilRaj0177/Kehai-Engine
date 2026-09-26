"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ErrorBlock } from "@/components/ui/States";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useAuth } from "@/lib/auth-context";
import { ApiError, safeInternalPath } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { SURFACE } from "@/components/ui/Hud";
import { useIsStandalone } from "@/lib/useStandalone";

export default function LoginPage() {
  const { t } = useLocale();
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isStandalone = useIsStandalone();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push(safeInternalPath(searchParams.get("next")) ?? "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorBlock message={error} />}
      <div>
        <Label htmlFor="email">{t("auth.emailLabel")}</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
          <Link href="/forgot-password" className="text-sm font-medium text-kehai-400 hover:text-kehai-300">
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t("auth.signInButton")}
      </Button>
    </form>
  );

  if (isStandalone) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto flex min-h-[calc(100vh-220px)] max-w-md flex-col justify-center px-5 py-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">{t("auth.loginKicker")}</p>
          <h1 className="mt-1.5 font-display text-[26px] font-black leading-tight text-white">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-[14px] text-white/45">{t("auth.loginSubtitle")}</p>

          <div className={`${SURFACE} mt-8 p-5`}>{formBody}</div>

          <p className="mt-6 text-center text-[14px] text-white/45">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-semibold text-shu-400">
              {t("auth.createOne")}
            </Link>
          </p>
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-xl flex-col justify-center px-6 py-16">
        {/* Responsive size (was a flat 12rem) — unconditionally that large,
            the glyph was wide enough to sit behind the card on a narrow
            phone the same way the hero's did before its z-20 fix; z-20
            here keeps the card above it regardless, so this is defensive
            on top of the smaller mobile size, not a fix for an observed
            overlap. */}
        <KanjiMark glyph="入" className="absolute -right-6 top-0 text-[7rem] sm:-right-10 sm:text-[12rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("auth.loginKicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("auth.loginTitle")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">{t("auth.loginSubtitle")}</p>

        <Card className="relative z-20 mt-12">
          <CardBody>{formBody}</CardBody>
        </Card>

        <p className="relative z-20 mt-8 text-center text-base text-white/45">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-medium text-shu-400 hover:text-shu-300">
            {t("auth.createOne")}
          </Link>
        </p>
      </div>
    </ClickRippleLayer>
  );
}
