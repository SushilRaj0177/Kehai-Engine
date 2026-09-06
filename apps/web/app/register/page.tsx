"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ErrorBlock } from "@/components/ui/States";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useLocale();
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/dashboard");
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
        <KanjiMark glyph="始" className="absolute -right-6 top-0 text-[7rem] sm:-right-10 sm:text-[12rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("auth.registerKicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("auth.registerTitle")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">
          {t("auth.registerSubtitle")}
        </p>

        <Card className="relative z-20 mt-12">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorBlock message={error} />}
              <div>
                <Label htmlFor="name">{t("auth.fullNameLabel")}</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">{t("auth.emailLabel")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-2 text-sm text-white/35">{t("auth.passwordHint")}</p>
              </div>
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {t("auth.createAccountButton")}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="relative z-20 mt-8 text-center text-base text-white/45">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-shu-400 hover:text-shu-300">
            {t("auth.signInButton")}
          </Link>
        </p>
      </div>
    </div>
  );
}
