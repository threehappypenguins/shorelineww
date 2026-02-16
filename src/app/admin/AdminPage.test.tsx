/**
 * @file AdminPage component tests.
 *
 * Verifies that the AdminPage component handles authentication states correctly,
 * renders the dashboard when authenticated, and manages tab switching properly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPage from "./page";

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    // Throw to simulate Next.js redirect behavior
    throw new Error(`Redirected to ${path}`);
  },
}));

// Mock child components
vi.mock("./components/SettingsTab", () => ({
  default: () => <div data-testid="settings-tab">Settings Tab Content</div>,
}));

vi.mock("./components/SiteContentTab", () => ({
  default: () => <div data-testid="site-content-tab">Site Content Tab Content</div>,
}));

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated state
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { email: "admin@example.com" } },
    });
  });

  describe("Authentication states", () => {
    it("renders loading state when session is loading", () => {
      mockUseSession.mockReturnValue({
        status: "loading",
        data: null,
      });

      render(<AdminPage />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      // Check for spinner element (div with animate-spin class)
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("redirects to login when unauthenticated", () => {
      mockUseSession.mockReturnValue({
        status: "unauthenticated",
        data: null,
      });

      // Suppress console.error for redirect error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        render(<AdminPage />);
      } catch {
        // Expected: redirect throws an error
      }

      expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
      consoleSpy.mockRestore();
    });

    it("renders dashboard when authenticated", () => {
      render(<AdminPage />);

      expect(
        screen.getByRole("heading", { name: "Admin Dashboard" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Manage your website content and settings"),
      ).toBeInTheDocument();
    });
  });

  describe("Tab navigation", () => {
    it("renders Settings tab by default", () => {
      render(<AdminPage />);

      expect(screen.getByTestId("settings-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("site-content-tab")).not.toBeInTheDocument();
    });

    it("renders both tab buttons in desktop view", () => {
      render(<AdminPage />);

      expect(
        screen.getByRole("button", { name: /⚙️\s*Settings/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /📝\s*Site Content/ }),
      ).toBeInTheDocument();
    });

    it("renders tab select dropdown in mobile view", () => {
      render(<AdminPage />);

      const select = screen.getByRole("combobox", { name: "Select a tab" });
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue("settings");
    });

    it("switches to Site Content tab when clicking desktop button", async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      const siteContentButton = screen.getByRole("button", {
        name: /📝\s*Site Content/,
      });
      await user.click(siteContentButton);

      expect(screen.getByTestId("site-content-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("settings-tab")).not.toBeInTheDocument();
    });

    it("switches to Settings tab when clicking desktop button", async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      // First switch to Site Content
      const siteContentButton = screen.getByRole("button", {
        name: /📝\s*Site Content/,
      });
      await user.click(siteContentButton);

      // Then switch back to Settings
      const settingsButton = screen.getByRole("button", { name: /⚙️\s*Settings/ });
      await user.click(settingsButton);

      expect(screen.getByTestId("settings-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("site-content-tab")).not.toBeInTheDocument();
    });

    it("switches tabs when using mobile dropdown", async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      const select = screen.getByRole("combobox", { name: "Select a tab" });
      await user.selectOptions(select, "site-content");

      expect(screen.getByTestId("site-content-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("settings-tab")).not.toBeInTheDocument();
    });

    it("sets aria-current='page' on active tab button", async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      const settingsButton = screen.getByRole("button", {
        name: /⚙️\s*Settings/,
      });
      const siteContentButton = screen.getByRole("button", {
        name: /📝\s*Site Content/,
      });

      // Settings should be active initially
      expect(settingsButton).toHaveAttribute("aria-current", "page");
      expect(siteContentButton).not.toHaveAttribute("aria-current");

      // Switch to Site Content
      await user.click(siteContentButton);

      // Site Content should be active now
      expect(siteContentButton).toHaveAttribute("aria-current", "page");
      expect(settingsButton).not.toHaveAttribute("aria-current");
    });
  });

  describe("Tab content rendering", () => {
    it("renders only the active tab content", async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      // Initially Settings should be visible
      expect(screen.getByTestId("settings-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("site-content-tab")).not.toBeInTheDocument();

      // Switch to Site Content
      const siteContentButton = screen.getByRole("button", {
        name: /📝\s*Site Content/,
      });
      await user.click(siteContentButton);

      // Now Site Content should be visible and Settings hidden
      expect(screen.getByTestId("site-content-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("settings-tab")).not.toBeInTheDocument();
    });
  });
});
