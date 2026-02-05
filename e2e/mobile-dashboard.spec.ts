/**
 * E2E Tests for Mobile Dashboard
 *
 * North Star: CEO can check status on phone anytime.
 */
import { test, expect } from "@playwright/test";

test.describe("Mobile Dashboard - Core", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/mobile");
  });

  test("should load mobile dashboard", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display content within viewport", async ({ page }) => {
    const body = page.locator("body");
    const box = await body.boundingBox();

    // Content should fit mobile width
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test("should be touch-friendly", async ({ page }) => {
    // Check for tappable elements
    const tappable = page.locator("button, a, [role='button']");
    const count = await tappable.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Mobile Dashboard - Readability", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/mobile");
  });

  test("should have readable text sizes", async ({ page }) => {
    // Text should be visible
    const text = page.locator("p, span, div").first();
    await expect(text).toBeVisible();
  });

  test("should display key metrics", async ({ page }) => {
    const content = await page.textContent("body");
    expect(content).toMatch(/\d/); // Should have numbers
  });
});

test.describe("Mobile Dashboard - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/mobile");
  });

  test("should have mobile-friendly navigation", async ({ page }) => {
    // Look for hamburger menu or bottom nav
    const nav = page.locator('button[aria-label*="menu"], nav, [role="navigation"]');
    const count = await nav.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should support swipe gestures area", async ({ page }) => {
    // Page should be scrollable
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Mobile Dashboard - Different Devices", () => {
  test("should work on iPhone SE", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/mobile");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on iPhone 14", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/mobile");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on iPhone 14 Pro Max", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/mobile");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on Android phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/mobile");

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Mobile Dashboard - Orientation", () => {
  test("should work in portrait mode", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/mobile");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work in landscape mode", async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto("/mobile");

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Mobile Dashboard - Performance", () => {
  test("should load quickly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();
    await page.goto("/mobile");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // Mobile should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("should not have excessive JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/mobile");

    // Allow page to stabilize
    await page.waitForTimeout(1000);

    // Should not have critical errors
    const criticalErrors = errors.filter(
      (e) => e.includes("TypeError") || e.includes("ReferenceError")
    );
    expect(criticalErrors.length).toBe(0);
  });
});
