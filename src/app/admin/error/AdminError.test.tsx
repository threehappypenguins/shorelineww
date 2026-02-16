/**
 * @file AdminError component tests.
 *
 * Verifies that the AdminError component renders correctly and displays
 * the appropriate error message based on the searchParams.error value.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import AdminError from "./page";

// Mock next/link to avoid Next.js routing issues in tests
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("AdminError", () => {
  it("renders the Authentication Error heading", async () => {
    const searchParams = Promise.resolve({ error: undefined });
    render(await AdminError({ searchParams }));
    expect(
      screen.getByRole("heading", { name: "Authentication Error" }),
    ).toBeInTheDocument();
  });

  it("displays AccessDenied message when error is AccessDenied", async () => {
    const searchParams = Promise.resolve({ error: "AccessDenied" });
    render(await AdminError({ searchParams }));
    expect(
      screen.getByText(
        /You don't have permission to access the admin panel. Please contact the administrator/,
      ),
    ).toBeInTheDocument();
  });

  it("displays generic error message when error is not AccessDenied", async () => {
    const searchParams = Promise.resolve({ error: "SomeOtherError" });
    render(await AdminError({ searchParams }));
    expect(
      screen.getByText(/An error occurred during sign in. Please try again/),
    ).toBeInTheDocument();
  });

  it("displays generic error message when error is undefined", async () => {
    const searchParams = Promise.resolve({ error: undefined });
    render(await AdminError({ searchParams }));
    expect(
      screen.getByText(/An error occurred during sign in. Please try again/),
    ).toBeInTheDocument();
  });

  it("renders Back to Login link with correct href", async () => {
    const searchParams = Promise.resolve({ error: undefined });
    render(await AdminError({ searchParams }));
    const loginLink = screen.getByRole("link", { name: "Back to Login" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/admin/login");
  });
});
