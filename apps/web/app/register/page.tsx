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

export default function RegisterPage() {
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
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto flex max-w-md flex-col justify-center px-6 py-24">
        <KanjiMark glyph="始" className="absolute -right-8 -top-4 text-[9rem]" />
        <h1 className="relative font-display text-2xl font-bold text-white">Create your account</h1>
        <p className="relative mt-1 text-sm text-white/45">Start an organization or register for events as an attendee.</p>

        <Card className="relative mt-8">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBlock message={error} />}
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-white/35">At least 8 characters.</p>
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Create account
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="relative mt-6 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/login" className="text-shu-400 hover:text-shu-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
