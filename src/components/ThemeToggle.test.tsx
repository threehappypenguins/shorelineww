/**
 * @file ThemeToggle component tests.
 *
 * Verifies that the ThemeToggle component renders the theme button after mount,
 * opens the dropdown with Light/Dark/System options, calls setTheme when an
 * option is selected, and closes on outside click.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";
import ThemeToggle from "./ThemeToggle";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("ThemeToggle", () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      systemTheme: "light",
      themes: ["light", "dark", "system"],
    });
  });

  it("renders theme button after mount", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });
  });

  it("theme button has correct accessibility attributes when mounted", async () => {
    render(<ThemeToggle />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: "Change theme" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("opens listbox with Light, Dark, System when button is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Change theme" }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "System" })).toBeInTheDocument();
  });

  it("sets aria-expanded when dropdown is open", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: "Change theme" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("calls setTheme and closes dropdown when option is selected", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Change theme" }));
    await user.click(screen.getByRole("option", { name: "Light" }));

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls setTheme with dark when Dark is selected", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Change theme" }));
    await user.click(screen.getByRole("option", { name: "Dark" }));

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme with system when System is selected", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Change theme" }));
    await user.click(screen.getByRole("option", { name: "System" }));

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("closes dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ThemeToggle />
        <button type="button">Outside</button>
      </div>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Change theme" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Change theme" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
