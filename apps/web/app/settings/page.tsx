"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError, clearTokens } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useLocale();
  const { user, loading } = useAuth();

  if (loading) return <LoadingBlock label={t("states.checkingSession")} />;

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

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-2xl px-6 py-20">
        <KanjiMark glyph="設定" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">
          {t("settings.kicker")}
        </span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("settings.title")}</h1>

        <div className="relative z-20 mt-12 space-y-6">
          <ProfileSection />
          <NotificationsSection />
          {user.provider !== "GOOGLE" && <ChangePasswordSection />}
        </div>
      </div>
    </ClickRippleLayer>
  );
}

function ProfileSection() {
  const { t } = useLocale();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.profileError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("settings.profileHeading")}</CardHeader>
      <CardBody className="space-y-4">
        <div>
          <Label htmlFor="settings-name">{t("auth.fullNameLabel")}</Label>
          <Input id="settings-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t("settings.emailLabel")}</Label>
          <p className="px-4 py-3.5 text-base text-white/40">{user?.email}</p>
        </div>
        {error && <ErrorBlock message={error} />}
        <div className="flex items-center gap-3">
          <Button size="sm" loading={saving} onClick={save} disabled={!name.trim()}>
            {t("settings.saveChanges")}
          </Button>
          {saved && <span className="text-sm text-kehai-400">✓ {t("settings.saved")}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function NotificationsSection() {
  const { t } = useLocale();
  const { user, refreshProfile } = useAuth();
  const [enabled, setEnabled] = useState(user?.emailNotificationsEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify({ emailNotificationsEnabled: next }) });
      await refreshProfile();
    } catch (err) {
      setEnabled(!next);
      setError(err instanceof ApiError ? err.message : t("settings.profileError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("settings.notificationsHeading")}</CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/85">{t("settings.emailNotificationsLabel")}</p>
            <p className="mt-1 text-xs text-white/40">{t("settings.emailNotificationsHint")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={toggle}
            disabled={saving}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
              enabled ? "border-kehai-500/50 bg-kehai-500/30" : "border-white/15 bg-white/5"
            }`}
          >
            <span
              className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-transform ${
                enabled ? "translate-x-6 bg-kehai-400" : "translate-x-1 bg-white/40"
              }`}
            />
          </button>
        </div>
        {error && <ErrorBlock message={error} />}
      </CardBody>
    </Card>
  );
}

function ChangePasswordSection() {
  const { t } = useLocale();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  async function save() {
    if (newPassword !== confirmPassword) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      // Changing the password revokes every session server-side, this
      // one included — there's nothing left to stay signed into.
      clearTokens();
      router.push("/login?next=/settings");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.passwordError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("settings.passwordHeading")}</CardHeader>
      <CardBody className="space-y-4">
        <div>
          <Label htmlFor="settings-current-password">{t("settings.currentPasswordLabel")}</Label>
          <Input
            id="settings-current-password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="settings-new-password">{t("settings.newPasswordLabel")}</Label>
          <Input
            id="settings-new-password"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="settings-confirm-password">{t("auth.confirmPasswordLabel")}</Label>
          <Input
            id="settings-confirm-password"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {mismatch && <p className="mt-2 text-xs text-shu-400">{t("auth.passwordMismatch")}</p>}
        </div>
        {error && <ErrorBlock message={error} />}
        <Button
          size="sm"
          loading={saving}
          onClick={save}
          disabled={!currentPassword || newPassword.length < 8 || mismatch || confirmPassword.length === 0}
        >
          {t("settings.changePassword")}
        </Button>
      </CardBody>
    </Card>
  );
}
