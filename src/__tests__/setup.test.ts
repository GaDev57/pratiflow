import { describe, it, expect } from "vitest";

// Infrastructure smoke test — verifies Vitest is configured correctly
describe("test infrastructure", () => {
  it("vitest is configured and running", () => {
    expect(true).toBe(true);
  });
});
