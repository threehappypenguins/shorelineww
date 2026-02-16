import { vi } from "vitest";

/**
 * Shared mock for next-themes. Provides useTheme() return value that satisfies
 * both ThemeToggle (theme, setTheme) and components using resolvedTheme (e.g. Footer).
 */
const nextThemesMock = {
	useTheme: () => ({
		theme: "light",
		setTheme: vi.fn(),
		resolvedTheme: "light",
	}),
};

export default nextThemesMock;
