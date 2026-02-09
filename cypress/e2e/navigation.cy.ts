/**
 * @file E2E navigation tests (navbar links and page content).
 *
 * These specs run against a real browser and the running Next.js app. Start the
 * app first (e.g. `pnpm dev`). baseUrl is set in cypress.config.ts
 * (default http://localhost:3000). Each test visits "/" then either asserts
 * the home content or clicks a nav link and asserts the URL and h1 for that page.
 */

/**
 * Suite for navbar-driven navigation: home load plus links to Projects, About,
 * and Contact. beforeEach visits "/" so every test starts from the home page.
 */
describe("Navigation (header)", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  /** Asserts the home page renders with the expected main heading. */
  it("shows home heading on initial load", () => {
    cy.get("h1").should("contain", "Shoreline Woodworks");
  });

  /** Clicks the Projects link in the nav, then checks pathname and h1. */
  it("navigates to Projects when clicking the Projects link and shows Projects heading", () => {
    cy.get("nav").find("a").contains("Projects").click();

    cy.location("pathname").should("eq", "/projects");
    cy.get("h1").should("have.text", "Projects");
  });

  /** Clicks the About link in the nav, then checks pathname and h1. */
  it("navigates to About when clicking the About link and shows About heading", () => {
    cy.get("nav").find("a").contains("About").click();

    cy.location("pathname").should("eq", "/about");
    cy.get("h1").should("have.text", "About");
  });

  /** Clicks the Contact link in the nav, then checks pathname and h1. */
  it("navigates to Contact when clicking the Contact link and shows Contact heading", () => {
    cy.get("nav").find("a").contains("Contact").click();

    cy.location("pathname").should("eq", "/contact");
    cy.get("h1").should("have.text", "Contact");
  });
});
