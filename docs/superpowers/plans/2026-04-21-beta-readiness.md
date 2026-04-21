# PratiFlow Beta Readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare PratiFlow for public beta by adding test infrastructure, unit tests on critical business logic, E2E tests on core flows, resilience improvements (webhook retry, error alerting), and build verification.

**Architecture:** Vitest for unit tests (slots engine, env, booking-themes). Playwright for E2E tests (auth flow, booking flow, dashboard navigation). Fix fragile patterns in webhook/notification code. Verify full build passes clean.

**Tech Stack:** Vitest, @testing-library/react, Playwright, Next.js 16, TypeScript strict

---

## File Structure

### New files
```
vitest.config.ts                              — Vitest configuration
src/lib/__tests__/slots.test.ts               — Unit tests for slot computation engine
src/lib/__tests__/booking-themes.test.ts      — Unit tests for theme helpers
src/lib/__tests__/env.test.ts                 — Unit tests for env helpers
src/lib/__tests__/notifications.test.ts       — Unit tests for notification functions
src/app/api/stripe/__tests__/webhook.test.ts  — Unit tests for Stripe webhook handler logic
playwright.config.ts                          — Playwright configuration
e2e/auth.spec.ts                              — E2E: signup, login, logout flows
e2e/booking.spec.ts                           — E2E: public booking page, slot selection
e2e/dashboard.spec.ts                         — E2E: dashboard navigation, role-based views
```

### Modified files
```
package.json                                  — Add vitest, playwright, test scripts
src/app/api/stripe/webhook/route.ts           — Add error handling for failed DB operations
src/lib/notifications.ts                      — Add return type consistency
```

---

### Task 1: Install test infrastructure (Vitest + Playwright)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install Vitest and related packages**

```bash
cd /c/DEVCLAUDE/PratiFlow && npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 2: Install Playwright**

```bash
cd /c/DEVCLAUDE/PratiFlow && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 5: Add test scripts to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:all": "vitest run && playwright test"
```

- [ ] **Step 6: Verify vitest runs (no tests yet, should exit clean)**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx vitest run`
Expected: "No test files found" or similar clean exit

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts playwright.config.ts package.json package-lock.json
git commit -m "chore: add vitest + playwright test infrastructure"
```

---

### Task 2: Unit tests — Slot computation engine

**Files:**
- Create: `src/lib/__tests__/slots.test.ts`
- Reference: `src/lib/slots.ts`

- [ ] **Step 1: Write slot engine tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  getAvailableSlots,
  getAvailableDates,
  AvailabilityRule,
  AvailabilityException,
  ExistingAppointment,
} from "@/lib/slots";

describe("getAvailableSlots", () => {
  const baseRules: AvailabilityRule[] = [
    { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true },
    { day_of_week: 1, start_time: "14:00", end_time: "17:00", is_active: true },
  ];

  it("generates 30min slots from a single morning rule", () => {
    const rules: AvailabilityRule[] = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true },
    ];
    // 2026-04-27 is a Monday (day_of_week=1)
    const slots = getAvailableSlots("2026-04-27", 30, rules, [], [], "Europe/Paris");
    expect(slots.length).toBe(6); // 09:00,09:30,10:00,10:30,11:00,11:30
    expect(slots[0].start).toBe("2026-04-27T09:00:00");
    expect(slots[0].end).toBe("2026-04-27T09:30:00");
    expect(slots[5].start).toBe("2026-04-27T11:30:00");
    expect(slots[5].end).toBe("2026-04-27T12:00:00");
  });

  it("generates slots from multiple rules (morning + afternoon)", () => {
    const slots = getAvailableSlots("2026-04-27", 60, baseRules, [], [], "Europe/Paris");
    // Morning: 09:00,10:00,11:00 = 3 slots. Afternoon: 14:00,15:00,16:00 = 3 slots
    expect(slots.length).toBe(6);
    expect(slots[2].end).toBe("2026-04-27T12:00:00");
    expect(slots[3].start).toBe("2026-04-27T14:00:00");
  });

  it("returns empty for a day with no active rules", () => {
    const slots = getAvailableSlots("2026-04-29", 30, baseRules, [], [], "Europe/Paris");
    // 2026-04-29 is Wednesday (day_of_week=3), rules are for Monday only
    expect(slots).toEqual([]);
  });

  it("returns empty for inactive rules", () => {
    const rules: AvailabilityRule[] = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: false },
    ];
    const slots = getAvailableSlots("2026-04-27", 30, rules, [], [], "Europe/Paris");
    expect(slots).toEqual([]);
  });

  it("blocks entire day when full-day exception exists", () => {
    const exceptions: AvailabilityException[] = [
      { date: "2026-04-27", start_time: null, end_time: null },
    ];
    const slots = getAvailableSlots("2026-04-27", 30, baseRules, exceptions, [], "Europe/Paris");
    expect(slots).toEqual([]);
  });

  it("blocks specific time range from exceptions", () => {
    const exceptions: AvailabilityException[] = [
      { date: "2026-04-27", start_time: "10:00", end_time: "11:00" },
    ];
    const rules: AvailabilityRule[] = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true },
    ];
    const slots = getAvailableSlots("2026-04-27", 30, rules, exceptions, [], "Europe/Paris");
    // 09:00,09:30 OK, 10:00,10:30 blocked, 11:00,11:30 OK = 4 slots
    expect(slots.length).toBe(4);
    expect(slots.map((s) => s.start)).toEqual([
      "2026-04-27T09:00:00",
      "2026-04-27T09:30:00",
      "2026-04-27T11:00:00",
      "2026-04-27T11:30:00",
    ]);
  });

  it("excludes slots occupied by existing appointments", () => {
    const appointments: ExistingAppointment[] = [
      { start_at: "2026-04-27T09:00:00", end_at: "2026-04-27T10:00:00", status: "confirmed" },
    ];
    const rules: AvailabilityRule[] = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true },
    ];
    const slots = getAvailableSlots("2026-04-27", 60, rules, [], appointments, "Europe/Paris");
    // 09:00 occupied, 10:00 and 11:00 free
    expect(slots.length).toBe(2);
    expect(slots[0].start).toBe("2026-04-27T10:00:00");
  });

  it("ignores cancelled appointments", () => {
    const appointments: ExistingAppointment[] = [
      { start_at: "2026-04-27T09:00:00", end_at: "2026-04-27T10:00:00", status: "cancelled" },
    ];
    const rules: AvailabilityRule[] = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true },
    ];
    const slots = getAvailableSlots("2026-04-27", 60, rules, [], appointments, "Europe/Paris");
    expect(slots.length).toBe(3); // all 3 available
  });

  it("applies buffer between slots", () => {
    const rules: AvailabilityRule[] = [
      { day_of_week: 1, start_time: "09:00", end_time: "12:00", is_active: true },
    ];
    const slots = getAvailableSlots("2026-04-27", 30, rules, [], [], "Europe/Paris", 15);
    // step = 30+15=45min. 09:00, 09:45, 10:30, 11:15 = 4 slots
    expect(slots.length).toBe(4);
    expect(slots[1].start).toBe("2026-04-27T09:45:00");
  });
});

describe("getAvailableDates", () => {
  const rules: AvailabilityRule[] = [
    { day_of_week: 1, start_time: "09:00", end_time: "17:00", is_active: true }, // Monday
    { day_of_week: 3, start_time: "09:00", end_time: "17:00", is_active: true }, // Wednesday
  ];

  it("returns only dates matching active rules", () => {
    // April 2026: Mondays are 6,13,20,27; Wednesdays are 1,8,15,22,29
    // Today is 2026-04-21, so past dates excluded
    const dates = getAvailableDates(2026, 3, rules, []); // month is 0-indexed, 3=April
    // From today: Mon 27, Wed 22,29
    expect(dates).toContain("2026-04-27");
    expect(dates).toContain("2026-04-22");
    expect(dates).toContain("2026-04-29");
    expect(dates).not.toContain("2026-04-20"); // past Monday
  });

  it("excludes full-day blocked dates", () => {
    const exceptions: AvailabilityException[] = [
      { date: "2026-04-27", start_time: null, end_time: null },
    ];
    const dates = getAvailableDates(2026, 3, rules, exceptions);
    expect(dates).not.toContain("2026-04-27");
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx vitest run src/lib/__tests__/slots.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/slots.test.ts
git commit -m "test: add unit tests for slot computation engine"
```

---

### Task 3: Unit tests — Booking themes & env helpers

**Files:**
- Create: `src/lib/__tests__/booking-themes.test.ts`
- Create: `src/lib/__tests__/env.test.ts`

- [ ] **Step 1: Write booking themes tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  getTheme,
  resolveTheme,
  generateGradient,
  getLogoShapeClass,
  getFontClasses,
  BOOKING_THEMES,
  FONT_PAIRS,
} from "@/lib/booking-themes";

describe("getTheme", () => {
  it("returns theme by id", () => {
    const theme = getTheme("ocean");
    expect(theme.name).toBe("Océan");
    expect(theme.primary).toBe("#1e3a5f");
  });

  it("returns default theme for unknown id", () => {
    const theme = getTheme("nonexistent");
    expect(theme.id).toBe("default");
  });
});

describe("resolveTheme", () => {
  it("uses custom primary color when valid hex provided", () => {
    const result = resolveTheme(null, "#ff5500");
    expect(result.primary).toBe("#ff5500");
    expect(result.gradient).toContain("#ff5500");
  });

  it("falls back to theme when custom color is invalid", () => {
    const result = resolveTheme("ocean", "not-a-color");
    expect(result.primary).toBe("#1e3a5f");
  });

  it("falls back to default when both are null", () => {
    const result = resolveTheme(null, null);
    expect(result.primary).toBe(BOOKING_THEMES[0].primary);
  });
});

describe("generateGradient", () => {
  it("produces a valid CSS gradient string", () => {
    const gradient = generateGradient("#000000");
    expect(gradient).toContain("linear-gradient");
    expect(gradient).toContain("#000000");
  });

  it("clamps RGB values at 255", () => {
    const gradient = generateGradient("#ffffff");
    expect(gradient).toContain("rgb(255, 255, 255)");
  });
});

describe("getLogoShapeClass", () => {
  it("returns round classes by default", () => {
    expect(getLogoShapeClass(null).container).toBe("rounded-full");
  });

  it("returns square classes", () => {
    expect(getLogoShapeClass("square").container).toBe("rounded-xl");
    expect(getLogoShapeClass("square").size).toBe("h-28 w-28");
  });

  it("returns rectangle classes with wider size", () => {
    expect(getLogoShapeClass("rectangle").size).toBe("h-20 w-36");
  });
});

describe("getFontClasses", () => {
  it("returns default font pair for null", () => {
    const fonts = getFontClasses(null);
    expect(fonts.heading).toBe(FONT_PAIRS[0].heading);
  });

  it("returns correct font pair by id", () => {
    const fonts = getFontClasses("classic");
    expect(fonts.heading).toBe("font-serif");
    expect(fonts.body).toBe("font-sans");
  });
});
```

- [ ] **Step 2: Write env helper tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getAppUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_SITE_URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pratiflow.com");
    // Dynamic import to pick up env changes
    const { getAppUrl } = await import("@/lib/env");
    expect(getAppUrl()).toBe("https://pratiflow.com");
  });

  it("falls back to localhost when no URL configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    const { getAppUrl } = await import("@/lib/env");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx vitest run src/lib/__tests__/`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/booking-themes.test.ts src/lib/__tests__/env.test.ts
git commit -m "test: add unit tests for booking themes and env helpers"
```

---

### Task 4: Unit tests — Stripe webhook handler logic

**Files:**
- Create: `src/app/api/stripe/__tests__/webhook.test.ts`
- Reference: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Write webhook logic tests (mocking Supabase + Stripe)**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase service client
const mockFrom = vi.fn();
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      mockFrom(table);
      return {
        update: mockUpdate,
        insert: mockInsert,
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      };
    },
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (_body: string, _sig: string, _secret: string) => ({
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "payment",
            metadata: { appointment_id: "apt-123" },
            payment_intent: "pi_test_123",
            amount_total: 5000,
          },
        },
      }),
    },
  }),
}));

describe("Stripe webhook — checkout.session.completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { practitioner_id: "prac-1", practitioners: { profile_id: "prof-1" } },
      error: null,
    });
  });

  it("updates appointment status to confirmed on payment", async () => {
    // Import the route handler
    const { POST } = await import("@/app/api/stripe/webhook/route");

    const request = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      body: "test-body",
      headers: { "stripe-signature": "test-sig" },
    });

    // Set env vars
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify appointment was updated
    expect(mockFrom).toHaveBeenCalledWith("appointments");
    expect(mockUpdate).toHaveBeenCalledWith({
      stripe_payment_intent_id: "pi_test_123",
      status: "confirmed",
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx vitest run src/app/api/stripe/__tests__/`
Expected: PASS (may need adjustments for Next.js headers mock)

- [ ] **Step 3: Fix any import issues and re-run**

If `headers()` from next/headers fails, add mock:
```typescript
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Map([["stripe-signature", "test-sig"]])),
}));
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stripe/__tests__/webhook.test.ts
git commit -m "test: add unit tests for Stripe webhook handler"
```

---

### Task 5: Webhook resilience — Error handling for DB operations

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts:41-84`

- [ ] **Step 1: Add error logging for failed DB operations in webhook**

In `src/app/api/stripe/webhook/route.ts`, wrap the `checkout.session.completed` case DB operations with error checks:

Replace the checkout.session.completed case body (lines 42-83) with:

```typescript
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "payment" && session.metadata?.appointment_id) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            stripe_payment_intent_id: session.payment_intent as string,
            status: "confirmed",
          })
          .eq("id", session.metadata.appointment_id);

        if (updateError) {
          console.error("[STRIPE/WEBHOOK] Failed to confirm appointment:", updateError.message);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }

        const { data: appointment } = await supabase
          .from("appointments")
          .select("practitioner_id, practitioners!inner(profile_id)")
          .eq("id", session.metadata.appointment_id)
          .single();

        if (appointment) {
          const practitioner = appointment.practitioners as unknown as {
            profile_id: string;
          };
          const { error: notifError } = await supabase.from("notifications").insert({
            user_id: practitioner.profile_id,
            type: "payment_received",
            title: "Paiement reçu",
            body: `Un paiement de ${(session.amount_total ?? 0) / 100}\u20AC a été reçu pour un rendez-vous.`,
            related_id: session.metadata.appointment_id,
          });

          if (notifError) {
            console.error("[STRIPE/WEBHOOK] Failed to create notification:", notifError.message);
          }
        }
      }

      if (session.mode === "subscription" && session.metadata?.plan) {
        const { error: subError } = await supabase
          .from("practitioners")
          .update({
            subscription_plan: session.metadata.plan,
          })
          .eq("profile_id", session.metadata.user_id);

        if (subError) {
          console.error("[STRIPE/WEBHOOK] Failed to update subscription:", subError.message);
          return NextResponse.json({ error: "Subscription update failed" }, { status: 500 });
        }
      }
      break;
    }
```

- [ ] **Step 2: Add error handling for subscription.deleted and invoice.payment_failed**

Replace the `customer.subscription.deleted` case (lines 88-97):

```typescript
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { error } = await supabase
        .from("practitioners")
        .update({ subscription_plan: "free" })
        .eq("stripe_account_id", customerId);

      if (error) {
        console.error("[STRIPE/WEBHOOK] Failed to downgrade subscription:", error.message);
        return NextResponse.json({ error: "Downgrade failed" }, { status: 500 });
      }
      break;
    }
```

- [ ] **Step 3: Verify build passes**

Run: `cd /c/DEVCLAUDE/PratiFlow && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "fix: add error handling for DB operations in Stripe webhook"
```

---

### Task 6: E2E test — Public booking page

**Files:**
- Create: `e2e/booking.spec.ts`

- [ ] **Step 1: Write E2E test for booking page**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Public booking page", () => {
  test("displays practitioner info and booking calendar", async ({ page }) => {
    // Navigate to a booking page (needs a real slug from DB or a test seed)
    await page.goto("/book/test-practitioner");

    // If practitioner exists, page should render
    // If not, check for 404 or redirect behavior
    const pageContent = await page.textContent("body");

    if (pageContent?.includes("introuvable") || pageContent?.includes("404")) {
      // No test practitioner seeded — skip gracefully
      test.skip(true, "No test practitioner in DB");
      return;
    }

    // Verify booking page structure
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("booking page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/book/test-practitioner");

    const pageContent = await page.textContent("body");
    if (pageContent?.includes("introuvable")) {
      test.skip(true, "No test practitioner in DB");
      return;
    }

    // Page should not have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });
});
```

- [ ] **Step 2: Write E2E test for auth pages**

Create `e2e/auth.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Connexion")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("text=Créer un compte")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=incorrect")).toBeVisible({ timeout: 10000 });
  });

  test("login page links to signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.locator('a[href*="register"]');
    await expect(signupLink).toBeVisible();
  });

  test("signup page links to login", async ({ page }) => {
    await page.goto("/register");
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
  });
});
```

- [ ] **Step 3: Write E2E test for dashboard (protected route)**

Create `e2e/dashboard.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("Dashboard (protected routes)", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login or show login page
    await page.waitForURL(/\/(login|auth)/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("privacy page is publicly accessible", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("text=Politique de confidentialité")).toBeVisible();
  });

  test("home page renders", async ({ page }) => {
    await page.goto("/");
    // The root page should load without errors
    expect(await page.title()).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run E2E tests (requires dev server)**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx playwright test --reporter=list`
Expected: Auth page tests PASS, booking/dashboard tests may skip if no DB seeded

- [ ] **Step 5: Commit**

```bash
git add e2e/
git commit -m "test: add E2E tests for auth, booking, and dashboard flows"
```

---

### Task 7: Full build verification

**Files:**
- Reference: all source files

- [ ] **Step 1: Run TypeScript type check**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Run ESLint**

Run: `cd /c/DEVCLAUDE/PratiFlow && npm run lint`
Expected: No errors (warnings OK)

- [ ] **Step 3: Run full build**

Run: `cd /c/DEVCLAUDE/PratiFlow && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run all unit tests**

Run: `cd /c/DEVCLAUDE/PratiFlow && npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Fix any issues found in steps 1-4**

Address type errors, lint errors, build failures, and test failures.

- [ ] **Step 6: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build and test issues for beta readiness"
```

---

## Execution Summary

| Task | What | Tests |
|------|------|-------|
| 1 | Test infrastructure (Vitest + Playwright) | Setup only |
| 2 | Unit tests: slot engine (8 tests) | Core business logic |
| 3 | Unit tests: themes + env (10 tests) | Configuration layer |
| 4 | Unit tests: Stripe webhook (1+ tests) | Payment flow |
| 5 | Webhook resilience | Error handling |
| 6 | E2E tests: auth, booking, dashboard (8 tests) | User flows |
| 7 | Full build verification | Integration |

Total: ~27 tests covering the most critical paths for beta launch.
