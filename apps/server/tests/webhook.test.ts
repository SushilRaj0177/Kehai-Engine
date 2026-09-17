import { afterEach, describe, expect, it, vi } from "vitest";
import { updateWebhookSchema } from "../src/validators/org.js";

// sendWebhookMessage resolves the hostname before delivering (SSRF guard),
// so tests need a stubbed resolver rather than real DNS — this sandbox has
// no raw DNS access, and even with it, tests shouldn't depend on a real
// host's current IP.
const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({
  default: { lookup: (...args: unknown[]) => lookupMock(...args) },
}));

const { sendWebhookMessage } = await import("../src/utils/webhook.js");

describe("sendWebhookMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    lookupMock.mockReset();
  });

  it("posts a JSON body with both 'content' and 'text' so it works for Discord or Slack", async () => {
    lookupMock.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendWebhookMessage("https://discord.com/api/webhooks/abc", "Someone checked in");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/abc",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Someone checked in", text: "Someone checked in" }),
      })
    );
  });

  it("never throws when the endpoint responds with an error status", async () => {
    lookupMock.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(sendWebhookMessage("https://example.com/hook", "hi")).resolves.toBeUndefined();
  });

  it("never throws when the network request itself fails", async () => {
    lookupMock.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(sendWebhookMessage("https://example.com/hook", "hi")).resolves.toBeUndefined();
  });

  it("refuses to deliver when the hostname resolves to a private address (SSRF guard)", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendWebhookMessage("https://internal.example.com/hook", "hi");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to deliver when the hostname resolves to a cloud metadata address", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendWebhookMessage("https://metadata.example.com/hook", "hi");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to deliver to a literal loopback IP without needing DNS", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendWebhookMessage("https://127.0.0.1/hook", "hi");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("refuses a non-https URL even though the schema would already reject it at save time", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendWebhookMessage("http://example.com/hook", "hi");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("updateWebhookSchema", () => {
  it("accepts a valid https URL", () => {
    const result = updateWebhookSchema.parse({ webhookUrl: "https://discord.com/api/webhooks/abc" });
    expect(result.webhookUrl).toBe("https://discord.com/api/webhooks/abc");
  });

  it("rejects a non-https URL", () => {
    expect(() => updateWebhookSchema.parse({ webhookUrl: "http://insecure.example.com/hook" })).toThrow();
  });

  it("rejects a value that isn't a URL at all", () => {
    expect(() => updateWebhookSchema.parse({ webhookUrl: "not a url" })).toThrow();
  });

  it("treats an empty string as clearing the webhook (null)", () => {
    const result = updateWebhookSchema.parse({ webhookUrl: "" });
    expect(result.webhookUrl).toBeNull();
  });
});
