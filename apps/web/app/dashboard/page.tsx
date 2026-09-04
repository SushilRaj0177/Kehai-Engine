"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
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
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <p className="text-white/60">Sign in to access your organizer console.</p>
          <Link href="/login">
            <Button className="mt-4">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <KanjiMark glyph="組織" className="absolute -right-4 top-0 text-[9rem]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Your organizations</h1>
            <p className="mt-1 text-sm text-white/45">Every event, attendee, and check-in lives under an organization.</p>
          </div>
          <Button onClick={() => setShowCreate((s) => !s)}>{showCreate ? "Cancel" : "New organization"}</Button>
        </div>

        {showCreate && (
          <CreateOrgForm
            onCreated={() => {
              setShowCreate(false);
              void mutate();
            }}
          />
        )}

        <div className="relative mt-8">
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
            <div className="grid gap-4 sm:grid-cols-2">
              {orgs.map((org) => (
                <Link key={org.id} href={`/orgs/${org.slug}`}>
                  <Card className="h-full transition-colors hover:border-shu-500/30">
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-semibold text-white">{org.name}</h3>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          {org.role}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/35">/{org.slug}</p>
                    </CardBody>
                  </Card>
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
