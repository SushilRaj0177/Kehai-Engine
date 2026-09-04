"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
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
      <div className="relative mx-auto flex max-w-md flex-col justify-center px-6 py-24">
        <KanjiMark glyph="入" className="absolute -right-8 -top-4 text-[9rem]" />
        <h1 className="relative font-display text-2xl font-bold text-white">Sign in</h1>
        <p className="relative mt-1 text-sm text-white/45">Access your organizer console or attendee account.</p>

        <Card className="relative mt-8">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBlock message={error} />}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Sign in
              </Button>
              <p className="pt-2 text-center text-xs text-white/40">
                Demo organizer: <code className="text-white/60">organizer@kehai.dev</code> /{" "}
                <code className="text-white/60">Password123!</code>
              </p>
            </form>
          </CardBody>
        </Card>

        <p className="relative mt-6 text-center text-sm text-white/40">
          No account?{" "}
          <Link href="/register" className="text-shu-400 hover:text-shu-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
