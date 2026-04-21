import { describe, it, expect } from "vitest";
import {
  BOOKING_THEMES,
  FONT_PAIRS,
  getTheme,
  resolveTheme,
  generateGradient,
  getLogoShapeClass,
  getFontClasses,
} from "../booking-themes";

describe("getTheme", () => {
  it("returns the theme matching the given id", () => {
    const theme = getTheme("ocean");
    expect(theme.id).toBe("ocean");
    expect(theme.name).toBe("Océan");
  });

  it("returns the default theme for an unknown id", () => {
    const theme = getTheme("nonexistent");
    expect(theme).toBe(BOOKING_THEMES[0]);
    expect(theme.id).toBe("default");
  });

  it("returns the default theme for empty string", () => {
    const theme = getTheme("");
    expect(theme.id).toBe("default");
  });
});

describe("resolveTheme", () => {
  it("uses custom hex color when valid", () => {
    const result = resolveTheme("ocean", "#ff0000");
    expect(result.primary).toBe("#ff0000");
    expect(result.gradient).toContain("linear-gradient");
    expect(result.gradient).toContain("#ff0000");
  });

  it("falls back to theme when customPrimary is invalid hex", () => {
    const result = resolveTheme("ocean", "notahex");
    expect(result).toEqual(getTheme("ocean"));
  });

  it("falls back to theme when customPrimary is short hex (invalid)", () => {
    const result = resolveTheme("ocean", "#fff");
    expect(result).toEqual(getTheme("ocean"));
  });

  it("falls back to default theme when both themeId and customPrimary are null", () => {
    const result = resolveTheme(null, null);
    expect(result).toEqual(getTheme("default"));
  });

  it("falls back to theme when customPrimary is null", () => {
    const result = resolveTheme("sunset", null);
    expect(result).toEqual(getTheme("sunset"));
  });

  it("falls back to theme when customPrimary is empty string", () => {
    const result = resolveTheme("mint", "");
    expect(result).toEqual(getTheme("mint"));
  });
});

describe("generateGradient", () => {
  it("produces a valid CSS linear-gradient string", () => {
    const gradient = generateGradient("#667260");
    expect(gradient).toMatch(/^linear-gradient\(135deg,/);
    expect(gradient).toContain("#667260 0%");
    expect(gradient).toContain("50%");
    expect(gradient).toContain("100%");
  });

  it("clamps RGB channels at 255 when close to white", () => {
    // #f0f0f0 = rgb(240, 240, 240) — adding 80 would exceed 255
    const gradient = generateGradient("#f0f0f0");
    // The end color should be clamped to rgb(255, 255, 255)
    expect(gradient).toContain("rgb(255, 255, 255)");
  });

  it("clamps mid color at 255 when adding 40 exceeds max", () => {
    // #e0e0e0 = rgb(224, 224, 224) — adding 40 = 264, should clamp
    const gradient = generateGradient("#e0e0e0");
    expect(gradient).toContain("rgb(255, 255, 255)");
  });

  it("includes the original hex as start color", () => {
    const hex = "#1e3a5f";
    const gradient = generateGradient(hex);
    expect(gradient).toContain(`${hex} 0%`);
  });
});

describe("getLogoShapeClass", () => {
  it("returns rounded-full (round) for null", () => {
    const result = getLogoShapeClass(null);
    expect(result.container).toBe("rounded-full");
    expect(result.size).toBe("h-28 w-28");
  });

  it("returns rounded-full (round) for unknown shape", () => {
    const result = getLogoShapeClass("unknown");
    expect(result.container).toBe("rounded-full");
  });

  it("returns correct classes for square", () => {
    const result = getLogoShapeClass("square");
    expect(result.container).toBe("rounded-xl");
    expect(result.size).toBe("h-28 w-28");
  });

  it("returns correct classes for rectangle", () => {
    const result = getLogoShapeClass("rectangle");
    expect(result.container).toBe("rounded-xl");
    expect(result.size).toBe("h-20 w-36");
  });
});

describe("getFontClasses", () => {
  it("returns the default (modern) font pair for null", () => {
    const result = getFontClasses(null);
    expect(result.heading).toBe(FONT_PAIRS[0].heading);
    expect(result.body).toBe(FONT_PAIRS[0].body);
  });

  it("returns the default font pair for unknown id", () => {
    const result = getFontClasses("nonexistent");
    expect(result).toEqual({ heading: FONT_PAIRS[0].heading, body: FONT_PAIRS[0].body });
  });

  it("returns correct classes for classic pair", () => {
    const result = getFontClasses("classic");
    expect(result.heading).toBe("font-serif");
    expect(result.body).toBe("font-sans");
  });

  it("returns correct classes for elegant pair", () => {
    const result = getFontClasses("elegant");
    expect(result.heading).toBe("font-serif");
    expect(result.body).toBe("font-serif");
  });

  it("returns correct classes for minimal pair", () => {
    const result = getFontClasses("minimal");
    expect(result.heading).toBe("font-mono");
    expect(result.body).toBe("font-sans");
  });

  it("returns correct classes for modern pair", () => {
    const result = getFontClasses("modern");
    expect(result.heading).toBe("font-sans");
    expect(result.body).toBe("font-sans");
  });
});
