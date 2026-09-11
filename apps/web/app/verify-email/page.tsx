"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";

export default function VerifyEmailPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refreshProfile } = useAuth();

  const [status, setStatus] = useState<"pending" | "success" | "error">(token ? "pending" : "error");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      skipAuth: true,
    })
      .then(async () => {
        setStatus("success");
        await refreshProfile();
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err instanceof ApiError ? err.message : t("verifyEmail.genericError"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-lg px-6 py-24">
        {status === "pending" && <LoadingBlock label={t("verifyEmail.verifying")} />}
        {status === "success" && (
          <EmptyState
            title={t("verifyEmail.successTitle")}
            description={t("verifyEmail.successDescription")}
            action={
              <Link href="/dashboard">
                <Button>{t("verifyEmail.goToDashboard")}</Button>
              </Link>
            }
          />
        )}
        {status === "error" && (
          <EmptyState title={t("verifyEmail.errorTitle")} description={errorMessage ?? t("verifyEmail.noTokenDescription")} />
        )}
      </div>
    </ClickRippleLayer>
  );
}
