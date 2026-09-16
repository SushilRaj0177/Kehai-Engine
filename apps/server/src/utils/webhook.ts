/**
 * Best-effort outbound webhook, currently used for live check-in pings to a
 * club's own Discord or Slack channel. Discord's incoming-webhook API reads
 * the "content" field and Slack's reads "text" — sending both in one JSON
 * body means either platform's webhook URL works without asking which one
 * a club uses. Never throws: a broken or unreachable webhook URL must not
 * fail the check-in it's reporting on.
 */
export async function sendWebhookMessage(url: string, message: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, text: message }),
    });
    if (!res.ok) {
      console.error(`[webhook] Delivery failed (${res.status}) for ${new URL(url).hostname}`);
    }
  } catch (err) {
    console.error("[webhook] Delivery threw:", err instanceof Error ? err.message : err);
  }
}
