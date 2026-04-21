import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getAppUrl", () => {
  it("returns NEXT_PUBLIC_SITE_URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pratiflow.fr");
    // Stub SUPABASE_SERVICE_ROLE_KEY so the env module does not throw on import
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");

    const { getAppUrl } = await import("../env");
    expect(getAppUrl()).toBe("https://pratiflow.fr");
  });

  it("falls back to localhost when NEXT_PUBLIC_SITE_URL is empty and NEXT_PUBLIC_VERCEL_URL is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");

    const { getAppUrl } = await import("../env");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("uses NEXT_PUBLIC_VERCEL_URL as https fallback when SITE_URL is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "my-app.vercel.app");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");

    const { getAppUrl } = await import("../env");
    expect(getAppUrl()).toBe("https://my-app.vercel.app");
  });
});
