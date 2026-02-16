/**
 * @file AdminLogin component tests.
 *
 * Verifies that the AdminLogin component renders correctly and displays
 * the expected content: heading, description, and GoogleSignInButton.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLogin from "./page";

// Mock GoogleSignInButton since we already have separate tests for it
vi.mock("@/components/GoogleSignInButton", () => ({
  default: () => <button>Sign in with Google</button>,
}));

describe("AdminLogin", () => {
  it("renders the Admin Login heading", () => {
    render(<AdminLogin />);
    expect(
      screen.getByRole("heading", { name: "Admin Login" }),
    ).toBeInTheDocument();
  });

  it("displays the description text", () => {
    render(<AdminLogin />);
    expect(
      screen.getByText("Sign in to manage Shoreline Woodworks"),
    ).toBeInTheDocument();
  });

  it("renders the GoogleSignInButton component", () => {
    render(<AdminLogin />);
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });
});
