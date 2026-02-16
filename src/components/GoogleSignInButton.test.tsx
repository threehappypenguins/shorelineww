/**
 * @file GoogleSignInButton component tests.
 *
 * Verifies that the GoogleSignInButton component renders correctly, handles
 * theme detection, and calls signIn with the correct parameters when clicked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import GoogleSignInButton from "./GoogleSignInButton";

// Mock next-auth/react - create mock function inside factory to avoid hoisting issues
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock next-themes - create mock function inside factory to avoid hoisting issues
vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default theme mock (light theme)
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      systemTheme: "light",
      setTheme: vi.fn(),
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });
  });

  it("renders the Sign in with Google button", () => {
    render(<GoogleSignInButton />);
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
  });

  it("renders the Google logo SVG", () => {
    render(<GoogleSignInButton />);
    const svg = screen.getByRole("button").querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("calls signIn with correct parameters when clicked", async () => {
    const user = userEvent.setup();
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Sign in with Google" });

    await user.click(button);

    expect(vi.mocked(signIn)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
      authorizationParams: { theme: "light" },
    });
  });

  it("passes 'light' theme when theme is light", async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      systemTheme: "light",
      setTheme: vi.fn(),
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });
    const user = userEvent.setup();
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Sign in with Google" });

    await user.click(button);

    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
      authorizationParams: { theme: "light" },
    });
  });

  it("passes 'dark' theme when theme is dark", async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      systemTheme: "dark",
      setTheme: vi.fn(),
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
    });
    const user = userEvent.setup();
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Sign in with Google" });

    await user.click(button);

    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
      authorizationParams: { theme: "dark" },
    });
  });

  it("passes 'light' theme when theme is system and systemTheme is light", async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "system",
      systemTheme: "light",
      setTheme: vi.fn(),
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });
    const user = userEvent.setup();
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Sign in with Google" });

    await user.click(button);

    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
      authorizationParams: { theme: "light" },
    });
  });

  it("passes 'dark' theme when theme is system and systemTheme is dark", async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "system",
      systemTheme: "dark",
      setTheme: vi.fn(),
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
    });
    const user = userEvent.setup();
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Sign in with Google" });

    await user.click(button);

    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
      authorizationParams: { theme: "dark" },
    });
  });

  it("defaults to 'light' theme when activeTheme is not dark", async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      systemTheme: undefined,
      setTheme: vi.fn(),
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });
    const user = userEvent.setup();
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Sign in with Google" });

    await user.click(button);

    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
      callbackUrl: "/admin",
      redirect: true,
      authorizationParams: { theme: "light" },
    });
  });
});
