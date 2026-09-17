import dns from "node:dns/promises";
import net from "node:net";

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
    const guardError = await guardAgainstInternalTarget(url);
    if (guardError) {
      console.error(`[webhook] Refused to deliver: ${guardError}`);
      return;
    }
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

/**
 * An org admin controls this URL, but the server is the one making the
 * request — without this check, a malicious or compromised admin could
 * point it at an internal service or a cloud metadata endpoint and use
 * every check-in as a repeating probe of the deployment's private network.
 * Resolves the hostname and rejects loopback/private/link-local/metadata
 * targets. Not a defense against DNS rebinding between this check and the
 * fetch — acceptable for a best-effort notification feature gated behind
 * org-ADMIN trust, not a general-purpose proxy.
 */
async function guardAgainstInternalTarget(rawUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "invalid URL";
  }
  if (parsed.protocol !== "https:") return "must be https";

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return "loopback hostname";

  let addresses: string[];
  if (net.isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = (await dns.lookup(hostname, { all: true })).map((a) => a.address);
    } catch {
      return "DNS resolution failed";
    }
  }

  for (const address of addresses) {
    if (isPrivateOrSpecialAddress(address)) return `resolves to a private/internal address (${address})`;
  }
  return null;
}

function isPrivateOrSpecialAddress(address: string): boolean {
  const kind = net.isIP(address);
  if (kind === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 0) return true; // "this network"
    return false;
  }
  if (kind === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("::ffff:")) return isPrivateOrSpecialAddress(lower.replace("::ffff:", "")); // IPv4-mapped
    return false;
  }
  return true; // not a valid IP at all — treat as suspicious and reject
}
