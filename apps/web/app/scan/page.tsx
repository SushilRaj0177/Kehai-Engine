"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { QrScanner } from "@/components/QrScanner";
import { Icon, PwaScreen } from "@/components/pwa/shared";
import { useIsStandalone } from "@/lib/useStandalone";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";

// PWA-only: the dock's centre button. Scans any Kehai check-in QR (event or
// classroom session) and hands off to that check-in flow, so the installed
// app has one "scan" entry point instead of needing the phone camera app.
export default function ScanPage() {
  const { t } = useLocale();
  const router = useRouter();
  const isStandalone = useIsStandalone();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fallback for a phone whose camera can't focus on a screen, or a code
  // someone shared as a screenshot. Geofencing still has to pass on the
  // next step, so a forwarded image alone can't check anyone in remotely.
  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) onDecoded(code.data);
      else setError(t("pwa.uploadNoCode"));
    } catch {
      setError(t("pwa.uploadNoCode"));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  useEffect(() => {
    if (isStandalone === false) router.replace("/events");
  }, [isStandalone, router]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/scan");
  }, [loading, user, router]);

  function onDecoded(data: string) {
    try {
      const url = new URL(data, window.location.origin);
      if (/^\/(classrooms\/[^/]+\/checkin|attend\/[^/]+)\/?$/.test(url.pathname) && url.searchParams.get("t")) {
        router.push(`${url.pathname}${url.search}`);
        return;
      }
    } catch {
      // fall through
    }
    haptic("error");
    setError(t("pwa.scanInvalid"));
    setAttempt((a) => a + 1);
  }

  if (isStandalone === false) return null;

  return (
    <PwaScreen withDock={false} tight>
      <div className="pwa-topbar">
        <button type="button" className="pwa-back" aria-label={t("pwa.back")} onClick={() => router.push("/home")}>
          {Icon.back}
        </button>
        <div>
          <h1>{t("pwa.scanTitle")}</h1>
          <div className="pwa-sub">{t("pwa.scanHint")}</div>
        </div>
      </div>
      <div className="pwa-panel pwa-scan-panel">
        <div className="pwa-scan-wrap">
          {user && <QrScanner key={attempt} onDecoded={onDecoded} />}
          <div className="pwa-scan-overlay" aria-hidden>
            <i className="pwa-corner pwa-tl" />
            <i className="pwa-corner pwa-tr" />
            <i className="pwa-corner pwa-bl" />
            <i className="pwa-corner pwa-br" />
            <span className="pwa-beam" />
          </div>
        </div>
        <div className="pwa-scan-status">
          <span className="pwa-pulse-dot" />
          {t("pwa.scanSearching")}
        </div>
      </div>
      {error && <p className="pwa-error">{error}</p>}
      <button type="button" className="pwa-btn-x pwa-v-secondary pwa-s-md" onClick={() => fileRef.current?.click()} disabled={reading}>
        {reading ? t("pwa.uploadReading") : t("pwa.uploadScreenshot")}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="pwa-steps">
        {[t("pwa.stepScan"), t("pwa.stepLocate"), t("pwa.stepDone")].map((label, i) => (
          <div key={label} className={`pwa-step ${i === 0 ? "pwa-on" : ""}`}>
            <b>{String(i + 1).padStart(2, "0")}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </PwaScreen>
  );
}
