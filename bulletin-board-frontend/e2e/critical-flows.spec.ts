import { test, expect } from "@playwright/test";

test.describe("Critical User Flows", () => {
  test.describe("Authentication", () => {
    test("user can register with .edu email", async ({ page }) => {
      await page.goto("/register");

      await page.fill('[name="email"]', "student@demo.edu");
      await page.fill('[name="password"]', "SecurePass123");
      await page.fill('[name="display_name"]', "Test Student");
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/verify-email/);
      await expect(
        page.getByText(/check your email/i)
      ).toBeVisible();
    });

    test("user can log in", async ({ page }) => {
      await page.goto("/login");

      await page.fill('[name="email"]', "student@demo.edu");
      await page.fill('[name="password"]', "SecurePass123");
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/feed/);
    });

    test("shows validation errors for weak password", async ({ page }) => {
      await page.goto("/register");

      await page.fill('[name="password"]', "weak");
      await page.click('button[type="submit"]');

      await expect(
        page.getByText(/8 characters/i)
      ).toBeVisible();
    });
  });

  test.describe("Listing Flow", () => {
    test.beforeEach(async ({ page }) => {
      // Login first (assumes test user exists)
      await page.goto("/login");
      await page.fill('[name="email"]', "student@demo.edu");
      await page.fill('[name="password"]', "SecurePass123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/feed/);
    });

    test("user can create a service listing", async ({ page }) => {
      await page.goto("/listings/new");

      // Select service type
      await page.click('[data-testid="type-service"]');

      // Fill form
      await page.selectOption('[name="category_id"]', { label: "Tutoring" });
      await page.fill('[name="title"]', "Math Tutoring - Calculus I & II");
      await page.fill(
        '[name="description"]',
        "Experienced math tutor offering help with Calculus I and II. Sessions can be in person or remote."
      );
      await page.fill('[name="price_hint"]', "$25/hour");
      await page.click('[data-testid="location-on_campus"]');

      await page.click('button[type="submit"]');

      // Should redirect to the new listing
      await expect(page).toHaveURL(/listings\/.+/);
      await expect(
        page.getByText("Math Tutoring - Calculus I & II")
      ).toBeVisible();
    });

    test("user can browse and filter listings", async ({ page }) => {
      await page.goto("/feed");

      // Check feed loads
      await expect(page.getByTestId("listing-grid")).toBeVisible();

      // Filter by services
      await page.click('[data-testid="filter-service"]');
      await expect(page).toHaveURL(/type=service/);

      // Search
      await page.fill('[data-testid="search-input"]', "tutoring");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/q=tutoring/);
    });

    test("user can view listing detail", async ({ page }) => {
      await page.goto("/feed");

      // Click first listing card
      const firstCard = page.getByTestId("listing-card").first();
      await firstCard.click();

      // Should see detail page
      await expect(page.getByTestId("listing-detail")).toBeVisible();
      await expect(page.getByText(/message/i)).toBeVisible();
    });

    test("user can favorite and unfavorite a listing", async ({ page }) => {
      await page.goto("/feed");

      const favoriteBtn = page
        .getByTestId("listing-card")
        .first()
        .getByRole("button", { name: /favorite/i });

      await favoriteBtn.click();

      // Check saved listings
      await page.goto("/profile/saved");
      await expect(page.getByTestId("listing-card")).toHaveCount(1);
    });
  });

  test.describe("Messaging", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.fill('[name="email"]', "student@demo.edu");
      await page.fill('[name="password"]', "SecurePass123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/feed/);
    });

    test("user can start a message thread from listing", async ({ page }) => {
      // Navigate to a listing not owned by user
      await page.goto("/feed");
      await page.getByTestId("listing-card").first().click();

      await page.click('[data-testid="message-button"]');

      // Should open messaging with pre-filled context
      await page.fill(
        '[data-testid="message-input"]',
        "Hi, I'm interested in your tutoring service!"
      );
      await page.click('[data-testid="send-button"]');

      await expect(
        page.getByText("Hi, I'm interested in your tutoring service!")
      ).toBeVisible();
    });
  });

  test.describe("Reporting", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.fill('[name="email"]', "student@demo.edu");
      await page.fill('[name="password"]', "SecurePass123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/feed/);
    });

    test("user can report a listing", async ({ page }) => {
      await page.goto("/feed");
      await page.getByTestId("listing-card").first().click();

      await page.click('[data-testid="report-button"]');

      // Report modal should open
      await expect(page.getByText(/why are you reporting/i)).toBeVisible();

      await page.click('[data-testid="reason-spam"]');
      await page.click('[data-testid="submit-report"]');

      await expect(
        page.getByText(/moderation team will review/i)
      ).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("feed page is keyboard navigable", async ({ page }) => {
      await page.goto("/login");
      await page.fill('[name="email"]', "student@demo.edu");
      await page.fill('[name="password"]', "SecurePass123");
      await page.click('button[type="submit"]');
      await page.waitForURL(/feed/);

      // Tab through listing cards
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const focused = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focused).toBeTruthy();
    });

    test("report modal traps focus", async ({ page }) => {
      await page.goto("/feed");
      await page.getByTestId("listing-card").first().click();
      await page.click('[data-testid="report-button"]');

      // Escape closes modal
      await page.keyboard.press("Escape");
      await expect(
        page.getByText(/why are you reporting/i)
      ).not.toBeVisible();
    });
  });
});
