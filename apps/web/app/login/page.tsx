"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ErrorBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("organizer@kehai.dev");
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
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-xl flex-col justify-center px-6 py-16">
        <KanjiMark glyph="入" className="absolute -right-10 top-0 text-[12rem]" />

        <span className="relative text-xs font-semibold uppercase tracking-widest text-shu-400">Welcome back</span>
        <h1 className="relative mt-3 font-display text-4xl font-black text-white md:text-5xl">Sign in</h1>
        <p className="relative mt-3 text-lg text-white/50">Access your organizer console or attendee account.</p>

        <form onSubmit={handleSubmit} className="relative mt-12 space-y-6">
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
          <p className="pt-2 text-center text-sm text-white/40">
            Demo organizer: <code className="text-white/60">organizer@kehai.dev</code> /{" "}
            <code className="text-white/60">Password123!</code>
          </p>
        </form>

        <p className="relative mt-8 text-center text-base text-white/45">
          No account?{" "}
          <Link href="/register" className="font-medium text-shu-400 hover:text-shu-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
