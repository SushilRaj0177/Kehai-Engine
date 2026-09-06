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

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
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

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">Welcome back</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">Sign in</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">Access your organizer console or attendee account.</p>

        <Card className="relative z-20 mt-12">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorBlock message={error} />}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Sign in
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="relative z-20 mt-8 text-center text-base text-white/45">
          No account?{" "}
          <Link href="/register" className="font-medium text-shu-400 hover:text-shu-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
