/**
 * @file LogoutButton component tests.
 *
 * Verifies that the LogoutButton renders only when authenticated, and that
 * clicking it calls signOut with the correct options.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, signOut } from "next-auth/react";
import LogoutButton from "./LogoutButton";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signOut).mockResolvedValue({ url: "/admin/login" });
  });

  it("renders nothing when session is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "loading",
      data: null,
      update: vi.fn(),
    });

    const { container } = render(<LogoutButton />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });

  it("renders nothing when unauthenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "unauthenticated",
      data: null,
      update: vi.fn(),
    });

    const { container } = render(<LogoutButton />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });

  it("renders Logout button when authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      data: {
        user: { id: "1", email: "admin@example.com", isAdmin: true },
        expires: "2026-12-31T23:59:59.000Z",
      },
      update: vi.fn(),
    });

    render(<LogoutButton />);

    expect(
      screen.getByRole("button", { name: "Logout" }),
    ).toBeInTheDocument();
  });

  it("calls signOut with callbackUrl and redirect when Logout is clicked", async () => {
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      data: {
        user: { id: "1", email: "admin@example.com", isAdmin: true },
        expires: "2026-12-31T23:59:59.000Z",
      },
      update: vi.fn(),
    });

    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({
      callbackUrl: "/admin/login",
      redirect: true,
    });
  });
});
