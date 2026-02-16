/**
 * @file E2E test for Admin page redirect (unauthenticated).
 *
 * Verifies that unauthenticated users are redirected from /admin to /admin/login,
 * and that the login page renders correctly with the Google Sign In button.
 * These specs run against a real browser and the running Next.js app. Start the
 * app first (e.g. `pnpm dev`). baseUrl is set in cypress.config.ts
 * (default http://localhost:3000).
 */

describe("Admin page redirect (unauthenticated)", () => {
  beforeEach(() => {
    // Clear cookies to ensure we're not authenticated
    cy.clearCookies();
  });

  it("redirects unauthenticated users from /admin to /admin/login", () => {
    // Start on the home page
    cy.visit("/");

    // Navigate to the admin page
    cy.visit("/admin");

    // Assert we were redirected to the login page
    cy.location("pathname").should("eq", "/admin/login");
  });

  it("renders the Admin Login page with Google Sign In button after redirect", () => {
    // Start on the home page
    cy.visit("/");

    // Navigate to the admin page
    cy.visit("/admin");

    // Assert we are at the login page
    cy.location("pathname").should("eq", "/admin/login");

    // Assert the Admin Login heading is rendered
    cy.get("h1").contains("Admin Login").should("be.visible");

    // Assert the description text is rendered
    cy.contains("Sign in to manage Shoreline Woodworks").should("be.visible");

    // Assert the Google Sign In button is rendered
    cy.get("button").contains("Sign in with Google").should("be.visible");
  });
});
