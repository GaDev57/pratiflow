import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock stripe lib
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

// Mock supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Import after mocks are registered
import { POST } from "../webhook/route";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Typed mock helpers
const mockHeaders = vi.mocked(headers);
const mockGetStripe = vi.mocked(getStripe);
const mockCreateClient = vi.mocked(createClient);

// Helper: build a minimal Request with a text body
function makeRequest(body = "{}") {
  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    body,
  });
}

// Helper: build a Supabase client mock that succeeds silently.
// Every method returns `this` (the same object) EXCEPT terminal methods
// (single, insert) which return resolved promises. This ensures arbitrary
// chains like from().select().eq().single() work correctly.
function makeSupabaseMock() {
  const chainable: Record<string, any> = {};

  // Terminal async methods
  chainable.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chainable.insert = vi.fn().mockResolvedValue({ error: null });

  // Chainable methods — most resolve directly when awaited AND return `this`
  // for further chaining. We use a Proxy-style trick: non-terminal methods
  // return a thenable that also has all chainable methods attached.
  const makeChainable = () => {
    const node: Record<string, any> = {};

    // Terminal methods
    node.single = vi.fn().mockResolvedValue({ data: null, error: null });
    node.insert = vi.fn().mockResolvedValue({ error: null });

    // Chainable methods (return a new node so each link in the chain works)
    const chain = () => makeChainable();
    node.from = vi.fn().mockImplementation(chain);
    node.select = vi.fn().mockImplementation(chain);
    node.update = vi.fn().mockImplementation(chain);
    node.eq = vi.fn().mockImplementation(() => {
      // eq is special: it can be terminal (awaited directly → { error: null })
      // OR chained further (.single()). Return an object that is both a
      // Promise and has the remaining chain methods.
      const result = makeChainable();
      // Make it thenable so `await supabase.from().update().eq()` resolves
      result.then = (resolve: any, reject: any) =>
        Promise.resolve({ error: null }).then(resolve, reject);
      result.catch = (reject: any) =>
        Promise.resolve({ error: null }).catch(reject);
      return result;
    });

    return node;
  };

  const root = makeChainable();
  // Top-level `from` is the entry point; route does: supabase.from(...)
  return root;
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default env vars
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
  });

  // ------------------------------------------------------------------
  // 1. Returns 503 when Stripe is not configured
  // ------------------------------------------------------------------
  describe("when Stripe is not configured", () => {
    it("returns 503 when getStripe() returns null", async () => {
      // Arrange — signature present but getStripe returns null
      mockHeaders.mockResolvedValue({
        get: (key: string) =>
          key === "stripe-signature" ? "sig_test" : null,
      } as any);
      mockGetStripe.mockReturnValue(null as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json).toMatchObject({ error: "Stripe not configured" });
    });

    it("returns 503 when stripe-signature header is missing", async () => {
      // Arrange — no signature header
      mockHeaders.mockResolvedValue({
        get: () => null,
      } as any);
      mockGetStripe.mockReturnValue({} as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json).toMatchObject({ error: "Stripe not configured" });
    });

    it("returns 503 when STRIPE_WEBHOOK_SECRET env var is missing", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      mockHeaders.mockResolvedValue({
        get: (key: string) =>
          key === "stripe-signature" ? "sig_test" : null,
      } as any);
      mockGetStripe.mockReturnValue({ webhooks: {} } as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json).toMatchObject({ error: "Stripe not configured" });
    });
  });

  // ------------------------------------------------------------------
  // 2. Returns 400 for invalid signatures
  // ------------------------------------------------------------------
  describe("when signature verification fails", () => {
    it("returns 400 when constructEvent throws", async () => {
      mockHeaders.mockResolvedValue({
        get: (key: string) =>
          key === "stripe-signature" ? "sig_bad" : null,
      } as any);

      const constructEvent = vi
        .fn()
        .mockImplementation(() => {
          throw new Error("No signatures found matching the expected signature");
        });
      mockGetStripe.mockReturnValue({
        webhooks: { constructEvent },
      } as any);

      const res = await POST(makeRequest("raw-body"));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({ error: "Invalid signature" });
    });
  });

  // ------------------------------------------------------------------
  // 3. Returns 200 for valid events
  // ------------------------------------------------------------------
  describe("when a valid event is received", () => {
    // Build a mock Stripe instance that returns a given event
    function mockStripeWith(event: object) {
      const constructEvent = vi.fn().mockReturnValue(event);
      return { webhooks: { constructEvent } };
    }

    beforeEach(() => {
      mockHeaders.mockResolvedValue({
        get: (key: string) =>
          key === "stripe-signature" ? "sig_valid" : null,
      } as any);
      mockCreateClient.mockReturnValue(makeSupabaseMock() as any);
    });

    it("returns 200 with { received: true } for checkout.session.completed (payment)", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "payment",
            metadata: { appointment_id: "appt_123" },
            payment_intent: "pi_abc",
            amount_total: 5000,
          },
        },
      };
      mockGetStripe.mockReturnValue(mockStripeWith(event) as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({ received: true });
    });

    it("returns 200 for checkout.session.completed (subscription)", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "subscription",
            metadata: { plan: "pro", user_id: "user_abc" },
            amount_total: 2900,
          },
        },
      };
      mockGetStripe.mockReturnValue(mockStripeWith(event) as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({ received: true });
    });

    it("returns 200 for customer.subscription.deleted", async () => {
      const event = {
        type: "customer.subscription.deleted",
        data: {
          object: { customer: "cus_test123" },
        },
      };
      mockGetStripe.mockReturnValue(mockStripeWith(event) as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({ received: true });
    });

    it("returns 200 for invoice.payment_failed", async () => {
      const event = {
        type: "invoice.payment_failed",
        data: {
          object: { customer: "cus_test456" },
        },
      };
      mockGetStripe.mockReturnValue(mockStripeWith(event) as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({ received: true });
    });

    it("returns 200 for charge.refunded", async () => {
      const event = {
        type: "charge.refunded",
        data: {
          object: { id: "ch_test789", amount_refunded: 5000 },
        },
      };
      mockGetStripe.mockReturnValue(mockStripeWith(event) as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({ received: true });
    });

    it("returns 200 for an unknown/unhandled event type", async () => {
      const event = {
        type: "payment_intent.created",
        data: { object: {} },
      };
      mockGetStripe.mockReturnValue(mockStripeWith(event) as any);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({ received: true });
    });
  });
});
