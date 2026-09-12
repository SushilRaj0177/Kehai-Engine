import { env, emailEnabled } from "../config/env.js";

/**
 * Minimal Resend wrapper — no SDK dependency, just their plain HTTP API.
 * Mirrors the Groq integration's pattern: fully optional via an env var,
 * degrades to a console log (not a thrown error) when unconfigured so
 * local dev and preview environments without a key don't hard-fail on
 * password-reset requests, while production simply needs RESEND_API_KEY
 * set (Render dashboard, never committed) to actually send mail.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailEnabled) {
    // Without this, a misconfigured deployment (no RESEND_API_KEY) has no
    // way to recover a verification/reset link at all — the request
    // "succeeds" from the caller's point of view, and the only trace was a
    // subject line with no link in it. Logging the body means an admin can
    // still hand a user their link by hand while the real fix (setting the
    // key in Render) is pending.
    console.warn(`[mailer] RESEND_API_KEY not set — skipping send to ${to}: ${subject}\n${html}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[mailer] Resend request failed (${res.status}): ${body}`);
  }
}
