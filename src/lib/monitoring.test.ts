import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsUrl, sanitizeMonitoringEvent } from "./monitoring";

describe("monitoring privacy", () => {
  it("retains only user.id, removing email, name, IP and arbitrary user data", () => {
    const result = sanitizeMonitoringEvent({
      user: { id: "user-123", email: "private@example.com", username: "Private Name", ip_address: "127.0.0.1", name: "Private Name", phone: "555123" },
    });
    expect(result.user).toEqual({ id: "user-123" });
  });

  it("removes payloads, breadcrumbs and messages that may include personal information", () => {
    const result = sanitizeMonitoringEvent({
      request: { url: "https://example.com?email=private@example.com", data: { password: "secret" } },
      extra: { name: "Private Name" },
      tags: { email: "private@example.com" },
      breadcrumbs: [{ message: "Private Name logged in" }],
      message: "private@example.com failed to sign in",
    });
    expect(result.request).toBeUndefined();
    expect(result.extra).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.breadcrumbs).toBeUndefined();
    expect(result.message).toBeUndefined();
    expect(result.user).toBeUndefined();
  });

  it("keeps technical error locations without error text or stack variables", () => {
    const result = sanitizeMonitoringEvent({ exception: { values: [{
      type: "TypeError", value: "Private Name: private@example.com",
      stacktrace: { frames: [{ filename: "https://example.com/assets/app.js?token=secret#private", lineno: 42, vars: { email: "private@example.com" } }] },
    }] } });
    expect(result.exception?.values?.[0]?.value).toBe("[redacted]");
    expect(result.exception?.values?.[0]?.stacktrace?.frames?.[0]).toMatchObject({ filename: "https://example.com/assets/app.js", lineno: 42 });
    expect(result.exception?.values?.[0]?.stacktrace?.frames?.[0]?.vars).toBeUndefined();
  });

  it("removes query parameters and fragments from Vercel measurements", () => {
    expect(sanitizeAnalyticsUrl({ url: "https://example.com/auth/confirm?email=private@example.com#access_token=secret" }).url).toBe("https://example.com/auth/confirm");
  });
});