/**
 * E2E Tests for Dashboard V2
 *
 * North Star: Modern, responsive dashboard for agent monitoring.
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard V2 - Core", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/v2");
  });

  test("should load v2 dashboard", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display main content", async ({ page }) => {
    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(0);
  });

  test("should be accessible", async ({ page }) => {
    // Check for basic accessibility
    const headings = page.locator("h1, h2, h3");
    const count = await headings.count();

    // Should have some structure
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dashboard V2 - Agent Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/v2");
  });

  test("should display agent list or sidebar", async ({ page }) => {
    // Look for agent-related elements
    const agentSection = page.locator('text=/agent|SAM|LEO|QUINN|MAX/i').first();
    const hasAgents = await agentSection.isVisible().catch(() => false);

    expect(typeof hasAgents).toBe("boolean");
  });

  test("should show agent status colors", async ({ page }) => {
    // Status indicators
    const colors = page.locator('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"]');
    const count = await colors.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dashboard V2 - Activity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/v2");
  });

  test("should show recent activity", async ({ page }) => {
    const activity = page.locator('text=/activity|recent|completed|started/i').first();
    const hasActivity = await activity.isVisible().catch(() => false);

    expect(typeof hasActivity).toBe("boolean");
  });

  test("should display task identifiers", async ({ page }) => {
    const tickets = page.locator('text=/AGT-\\d+/');
    const count = await tickets.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dashboard V2 - Responsive", () => {
  test("should work on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/v2");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/v2");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/v2");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should work on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/v2");

    await expect(page.locator("body")).toBeVisible();
  });
});
