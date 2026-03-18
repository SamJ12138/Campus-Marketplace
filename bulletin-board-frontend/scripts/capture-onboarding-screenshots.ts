/**
 * Capture onboarding screenshots using Playwright.
 *
 * Prerequisites:
 *   - Local dev server running (`npm run dev`)
 *   - Seed data loaded (sample listings, messages)
 *
 * Usage:
 *   npx tsx scripts/capture-onboarding-screenshots.ts
 *
 * Or via npm script:
 *   npm run screenshots:onboarding
 */

import { chromium } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.resolve(__dirname, "../public/images/onboarding");

// Update these with valid test-user credentials from your seed data
const TEST_EMAIL = process.env.TEST_EMAIL || "test@gettysburg.edu";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123!";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });

  const page = await context.newPage();

  // ── Authenticate ──────────────────────────────────────────────
  console.log("Logging in as test user...");
  try {
    const loginRes = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    if (!loginRes.ok()) {
      throw new Error(`Login failed: ${loginRes.status()}`);
    }

    const { access_token } = await loginRes.json();

    // Set the token so the Next.js app picks it up
    await context.addCookies([
      {
        name: "cb_access_token",
        value: access_token,
        domain: new URL(BASE_URL).hostname,
        path: "/",
      },
    ]);

    // Also store in localStorage for the Zustand auth store
    await page.goto(BASE_URL);
    await page.evaluate((token: string) => {
      localStorage.setItem("cb_access_token", token);
    }, access_token);
  } catch (err) {
    console.error("Auth failed — taking screenshots without auth.", err);
  }

  // ── Slide 1: Feed page ────────────────────────────────────────
  console.log("Capturing slide 1: Feed...");
  await page.goto(`${BASE_URL}/feed`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000); // let images load
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "slide-1-feed.png"),
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });

  // ── Slide 2: Feed with QuickView ─────────────────────────────
  console.log("Capturing slide 2: QuickView...");
  // Try clicking the first listing card to open QuickView
  const firstCard = page.locator('[data-testid="listing-card"]').first();
  if (await firstCard.isVisible()) {
    await firstCard.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "slide-2-discover.png"),
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });

  // Close any open modal
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // ── Slide 3: Create listing page ──────────────────────────────
  console.log("Capturing slide 3: Create listing...");
  await page.goto(`${BASE_URL}/listings/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "slide-3-create.png"),
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });

  // ── Slide 4: Messages page ────────────────────────────────────
  console.log("Capturing slide 4: Messages...");
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  // Try to click the first conversation thread if available
  const firstThread = page.locator('[data-testid="conversation-item"]').first();
  if (await firstThread.isVisible()) {
    await firstThread.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "slide-4-messages.png"),
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });

  await browser.close();
  console.log(`Screenshots saved to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
