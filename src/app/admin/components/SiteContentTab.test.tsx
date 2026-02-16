/**
 * @file SiteContentTab component tests.
 *
 * Verifies that the SiteContentTab component renders correctly and displays
 * the expected content: icon, heading, description, and "Coming soon" message.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteContentTab from "./SiteContentTab";

describe("SiteContentTab", () => {
  it("renders the Site Content Editor heading", () => {
    render(<SiteContentTab />);
    expect(
      screen.getByRole("heading", { name: "Site Content Editor" }),
    ).toBeInTheDocument();
  });

  it("displays the description text", () => {
    render(<SiteContentTab />);
    expect(
      screen.getByText(
        /Edit landing page text, hero section, and feature image/,
      ),
    ).toBeInTheDocument();
  });

  it("displays the Coming soon message", () => {
    render(<SiteContentTab />);
    expect(screen.getByText("Coming soon...")).toBeInTheDocument();
  });

  it("displays the emoji icon", () => {
    render(<SiteContentTab />);
    expect(screen.getByText("📝")).toBeInTheDocument();
  });
});
