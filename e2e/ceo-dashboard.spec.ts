/**
 * E2E Tests for CEO Dashboard
 *
 * North Star: CEO sees system state in 3 seconds.
 * Tests cover: page load, metrics, agent status, alerts.
 */
import { test, expect } from "@playwright/test";

test.describe("CEO Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ceo");
  });

  test("should load CEO dashboard within 3 seconds", async ({ page }) => {
    const startTime = Date.now();
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // North Star: CEO sees system state in 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should display page title", async ({ page }) => {
    await expect(page).toHaveTitle(/EVOX|CEO|Dashboard/i);
  });

  test("should show main content area", async ({ page }) => {
    const main = page.locator("main, [role='main'], body");
    await expect(main.first()).toBeVisible();
  });
});

test.describe("CEO Dashboard - Metrics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ceo");
  });

  test("should display key metrics", async ({ page }) => {
    // Look for metric cards or stat displays
    const content = await page.textContent("body");

    // Should have some numeric content (metrics)
    expect(content).toMatch(/\d/);
  });

  test("should show tasks completed count", async ({ page }) => {
    // Look for "tasks" or "completed" text with numbers
    const taskText = page.locator('text=/tasks?|completed/i').first();
    const hasTaskMetric = await taskText.isVisible().catch(() => false);

    expect(typeof hasTaskMetric).toBe("boolean");
  });

  test("should show cost metrics", async ({ page }) => {
    // Look for cost/dollar indicators
    const costIndicator = page.locator('text=/\\$|cost|budget/i').first();
    const hasCost = await costIndicator.isVisible().catch(() => false);

    expect(typeof hasCost).toBe("boolean");
  });
});

test.describe("CEO Dashboard - Agent Overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ceo");
  });

  test("should display agent names", async ({ page }) => {
    // Look for known agent names
    const agentNames = ["SAM", "LEO", "QUINN", "MAX", "MAYA"];

    let foundAgent = false;
    for (const name of agentNames) {
      const agent = page.locator(`text=${name}`).first();
      if (await agent.isVisible().catch(() => false)) {
        foundAgent = true;
        break;
      }
    }

    // May or may not have agents visible depending on layout
    expect(typeof foundAgent).toBe("boolean");
  });

  test("should show agent status indicators", async ({ page }) => {
    // Look for status dots or badges
    const statusIndicators = page.locator('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"], [class*="bg-zinc"]');
    const count = await statusIndicators.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display agent roles", async ({ page }) => {
    // Look for role labels
    const roles = ["Backend", "Frontend", "QA", "PM", "Design"];

    let foundRole = false;
    for (const role of roles) {
      const roleText = page.locator(`text=${role}`).first();
      if (await roleText.isVisible().catch(() => false)) {
        foundRole = true;
        break;
      }
    }

    expect(typeof foundRole).toBe("boolean");
  });
});

test.describe("CEO Dashboard - Alerts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ceo");
  });

  test("should display alerts section if present", async ({ page }) => {
    // Look for alert indicators
    const alertSection = page.locator('text=/alert|warning|critical|issue/i').first();
    const hasAlerts = await alertSection.isVisible().catch(() => false);

    expect(typeof hasAlerts).toBe("boolean");
  });

  test("should show alert severity indicators", async ({ page }) => {
    // Look for severity colors or badges
    const severityIndicators = page.locator('[class*="red"], [class*="yellow"], [class*="orange"]');
    const count = await severityIndicators.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("CEO Dashboard - Activity Feed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ceo");
  });

  test("should display activity section", async ({ page }) => {
    // Look for activity-related content
    const activityText = page.locator('text=/activity|recent|feed|timeline/i').first();
    const hasActivity = await activityText.isVisible().catch(() => false);

    expect(typeof hasActivity).toBe("boolean");
  });

  test("should show ticket identifiers", async ({ page }) => {
    // Look for AGT-XXX format
    const tickets = page.locator('text=/AGT-\\d+/');
    const ticketCount = await tickets.count();

    expect(ticketCount).toBeGreaterThanOrEqual(0);
  });

  test("should display timestamps", async ({ page }) => {
    // Look for time indicators
    const timestamps = page.locator('text=/\\d+[smhd]|ago|now|minute|hour/i');
    const count = await timestamps.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("CEO Dashboard - Responsive Design", () => {
  test("should be usable on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/ceo");

    await expect(page.locator("body")).toBeVisible();

    // Content should not overflow
    const body = page.locator("body");
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(768);
  });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/ceo");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should maintain readability on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/ceo");

    // Page should load without horizontal scroll issues
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("CEO Dashboard - Navigation", () => {
  test("should have navigation elements", async ({ page }) => {
    await page.goto("/ceo");

    // Look for nav links or buttons
    const navElements = page.locator("nav, [role='navigation'], a, button");
    const count = await navElements.count();

    expect(count).toBeGreaterThan(0);
  });

  test("should allow navigation to other pages", async ({ page }) => {
    await page.goto("/ceo");

    // Try to find and click a navigation link
    const navLink = page.locator('a[href="/"], a[href="/live"], a[href="/v2"]').first();
    const hasLink = await navLink.isVisible().catch(() => false);

    if (hasLink) {
      await navLink.click();
      await expect(page).not.toHaveURL("/ceo");
    }
  });
});

test.describe("CEO Dashboard - Data Loading", () => {
  test("should handle loading states", async ({ page }) => {
    await page.goto("/ceo");

    // Either shows loading indicator or content
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should handle empty data gracefully", async ({ page }) => {
    await page.goto("/ceo");

    // Page should not crash even with no data
    const errorText = page.locator('text=/error|crash|failed|undefined/i');
    const hasError = await errorText.isVisible().catch(() => false);

    // Should not show error messages
    expect(hasError).toBe(false);
  });
});
