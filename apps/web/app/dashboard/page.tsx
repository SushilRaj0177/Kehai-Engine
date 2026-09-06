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
import { useAuth } from "@/lib/auth-context";
import { useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: orgs, isLoading, mutate } = useMyOrganizations();
  const [showCreate, setShowCreate] = useState(false);

  if (authLoading) return <LoadingBlock label="Checking session…" />;

  if (!user) {
    return (
      <div className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24 text-center">
          <p className="text-white/60">Sign in to access your organizer console.</p>
          <Link href="/login">
            <Button className="mt-4">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="組織" className="absolute -right-4 top-0 text-[10rem]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">Organizer console</span>
            <h1 className="mt-3 font-display text-4xl font-black text-white md:text-5xl">Your organizations</h1>
            <p className="mt-3 max-w-xl text-lg text-white/50">
              Every event, attendee, and check-in lives under an organization.
            </p>
          </div>
          <div className="flex items-center gap-5">
            {!!orgs?.length && (
              <div className="hidden text-right sm:block">
                <div className="font-display text-3xl font-bold text-white">{orgs.length}</div>
                <div className="text-xs uppercase tracking-wider text-white/40">
                  {orgs.length === 1 ? "organization" : "organizations"}
                </div>
              </div>
            )}
            <Button size="lg" onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? "Cancel" : "New organization"}
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
              title="No organizations yet"
              description="Create one to start publishing events, generating check-in QR codes, and tracking live attendance."
              action={<Button onClick={() => setShowCreate(true)}>Create your first organization</Button>}
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
    </div>
  );
}

function CreateOrgForm({ onCreated }: { onCreated: () => void }) {
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
      setError(err instanceof ApiError ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="relative mt-6">
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SRM NSCC" />
          </div>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </form>
        {error && <ErrorBlock message={error} className="mt-3" />}
      </CardBody>
    </Card>
  );
}
