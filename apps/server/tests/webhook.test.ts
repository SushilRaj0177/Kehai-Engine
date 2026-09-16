import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWebhookMessage } from "../src/utils/webhook.js";
import { updateWebhookSchema } from "../src/validators/org.js";

describe("sendWebhookMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a JSON body with both 'content' and 'text' so it works for Discord or Slack", async () => {
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(sendWebhookMessage("https://example.com/hook", "hi")).resolves.toBeUndefined();
  });

  it("never throws when the network request itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    await expect(sendWebhookMessage("https://example.com/hook", "hi")).resolves.toBeUndefined();
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
