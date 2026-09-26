"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useAuth } from "@/lib/auth-context";
import { useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { SURFACE } from "@/components/ui/Hud";
import { useIsStandalone } from "@/lib/useStandalone";

export default function DashboardPage() {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { data: orgs, isLoading, mutate } = useMyOrganizations();
  const [showCreate, setShowCreate] = useState(false);
  const isStandalone = useIsStandalone();

  if (authLoading) return <LoadingBlock label={t("states.checkingSession")} />;

  if (!user) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24 text-center">
          <p className="text-white/60">{t("dashboard.signInPrompt")}</p>
          <Link href="/login">
            <Button className="mt-4">{t("common.signIn")}</Button>
          </Link>
        </div>
      </ClickRippleLayer>
    );
  }

  if (isStandalone) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-2xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
          <div className="flex items-start justify-between gap-3 px-1">
            <h1 className="font-display text-2xl font-black text-white">{t("dashboard.title")}</h1>
            <Button size="sm" variant={showCreate ? "secondary" : "primary"} onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? t("common.cancel") : t("dashboard.newOrganization")}
            </Button>
          </div>

          {showCreate && (
            <div className={`${SURFACE} mt-4 p-4`}>
              <CreateOrgForm
                compact
                onCreated={() => {
                  setShowCreate(false);
                  void mutate();
                }}
              />
            </div>
          )}

          <div className="mt-6">
            {isLoading ? (
              <LoadingBlock />
            ) : !orgs?.length ? (
              <EmptyState
                glyph="組"
                title={t("dashboard.emptyTitle")}
                description={t("dashboard.emptyDescription")}
                action={<Button size="sm" onClick={() => setShowCreate(true)}>{t("dashboard.emptyAction")}</Button>}
              />
            ) : (
              <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
                {orgs.map((org) => (
                  <Link key={org.id} href={`/orgs/${org.slug}`} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] font-display text-base font-black text-white/90">
                      {org.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-white/85">{org.name}</p>
                      <p className="mt-0.5 truncate text-[12px] text-white/35">/{org.slug}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">{org.role}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="組織" className="absolute -right-4 top-0 text-[6rem] sm:text-[10rem]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">{t("dashboard.kicker")}</span>
            <h1 className="mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("dashboard.title")}</h1>
            <p className="mt-3 max-w-xl text-lg text-white/50">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-5">
            {!!orgs?.length && (
              <div className="hidden text-right sm:block">
                <div className="font-display text-3xl font-bold text-white">{orgs.length}</div>
                <div className="text-xs uppercase tracking-wider text-white/40">
                  {t("dashboard.orgUnit")}
                </div>
              </div>
            )}
            <Button size="lg" onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? t("common.cancel") : t("dashboard.newOrganization")}
            </Button>
          </div>
        </div>

        {showCreate && (
          <CreateOrgForm
            onCreated={() => {
              setShowCreate(false);
              void mutate();
            }}
          />
        )}

        <div className="relative mt-14">
          {isLoading ? (
            <LoadingBlock />
          ) : !orgs?.length ? (
            <EmptyState
              glyph="組"
              title={t("dashboard.emptyTitle")}
              description={t("dashboard.emptyDescription")}
              action={<Button onClick={() => setShowCreate(true)}>{t("dashboard.emptyAction")}</Button>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {orgs.map((org) => (
                <Link key={org.id} href={`/orgs/${org.slug}`}>
                  <TiltCard className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
                        <div className="flex items-center gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-gradient-to-br from-shu-500/20 to-kehai-500/10 font-display text-xl font-black text-white/90">
                            {org.name.trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="truncate font-display text-lg font-bold text-white">{org.name}</h3>
                              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                                {org.role}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm text-white/35">/{org.slug}</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </TiltCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClickRippleLayer>
  );
}

function CreateOrgForm({ onCreated, compact = false }: { onCreated: () => void; compact?: boolean }) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const org = await apiFetch<{ slug: string }>("/api/orgs", { method: "POST", body: JSON.stringify({ name }) });
      onCreated();
      router.push(`/orgs/${org.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dashboard.createOrgError"));
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="org-name">{t("dashboard.orgNameLabel")}</Label>
          <Input id="org-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dashboard.orgNamePlaceholder")} />
        </div>
        <Button type="submit" loading={loading}>
          {t("common.create")}
        </Button>
      </form>
      {error && <ErrorBlock message={error} className="mt-3" />}
    </>
  );

  if (compact) return form;

  return (
    <Card className="relative mt-6">
      <CardBody>{form}</CardBody>
    </Card>
  );
}
