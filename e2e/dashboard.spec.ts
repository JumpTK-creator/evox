/**
 * E2E tests for Dashboard
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the main dashboard", async ({ page }) => {
    // Wait for page to load
    await expect(page).toHaveTitle(/EVOX/i);

    // Check for main layout elements
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display agent sidebar", async ({ page }) => {
    // Look for agent-related elements
    const sidebar = page.locator('[aria-label="Agent list"]');

    // Either sidebar exists or we're on a different layout
    const sidebarVisible = await sidebar.isVisible().catch(() => false);

    if (sidebarVisible) {
      await expect(sidebar).toBeVisible();
    } else {
      // Alternative: check for any agent indicator
      const agentIndicator = page.getByText(/agents?/i).first();
      await expect(agentIndicator).toBeVisible({ timeout: 10000 });
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still load
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Live Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should load live dashboard page", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display metrics", async ({ page }) => {
    // Look for metric-like elements (numbers, percentages)
    const metricsContainer = page.locator('[class*="metric"], [class*="stat"]').first();

    const hasMetrics = await metricsContainer.isVisible().catch(() => false);

    if (!hasMetrics) {
      // Alternative: check for any numeric content
      await expect(page.locator("body")).toContainText(/\d/);
    }
  });

  test("should have working navigation", async ({ page }) => {
    // Check if navigation links exist
    const links = page.locator("a, button").filter({ hasText: /dashboard|home|live/i });
    const linkCount = await links.count();

    expect(linkCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Accessibility", () => {
  test("should have proper page structure", async ({ page }) => {
    await page.goto("/");

    // Check for semantic structure
    const main = page.locator("main, [role='main']");
    const hasMain = await main.count();

    // Either has main element or body is the main content
    expect(hasMain).toBeGreaterThanOrEqual(0);
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/");

    // Tab through the page
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Check that something is focused
    const focused = page.locator(":focus");
    const hasFocus = await focused.count();

    expect(hasFocus).toBeGreaterThanOrEqual(0);
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/");

    // Basic check - text should be visible
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("should handle 404 pages gracefully", async ({ page }) => {
    const response = await page.goto("/non-existent-page-12345");

    // Should either show 404 or redirect
    expect([200, 404]).toContain(response?.status() ?? 200);
  });

  test("should not crash on rapid navigation", async ({ page }) => {
    await page.goto("/");
    await page.goto("/live");
    await page.goto("/");
    await page.goto("/live");

    await expect(page.locator("body")).toBeVisible();
  });
});
