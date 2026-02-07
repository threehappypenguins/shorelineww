/**
 * @file Home and navigation tests for the app root and page content.
 *
 * The second test simulates clicking a nav link and checking that the correct
 * page content appears. Because there is no real Next.js router in jsdom, we
 * mock next/link to call window.__navigateTo(href) on click, and use a small
 * TestApp that keeps route state and renders the matching page.
 */

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "@/app/page";
import ProjectsPage from "@/app/projects/page";
import Navbar from "@/components/Navbar";

/**
 * Bridge used by the next/link mock: when a link is clicked, it calls this
 * with the href so TestApp can update its route state and re-render.
 */
declare global {
    interface Window {
        __navigateTo?: (href: string) => void;
    }
}

/**
 * Replaces Next.js Link with an anchor that prevents default and invokes
 * window.__navigateTo(href) on click, so tests can "navigate" without a router.
 */
vi.mock("next/link", () => ({
    default: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children: React.ReactNode;
        [key: string]: unknown;
    }) => (
        <a
            href={href}
            {...props}
            onClick={(e) => {
                e.preventDefault();
                window.__navigateTo?.(href);
            }}
        >
            {children}
        </a>
    ),
}));

/**
 * Mock next-themes so Navbar and ThemeToggle render without a provider.
 */
vi.mock("next-themes", () => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

/**
 * Minimal app wrapper that stands in for the router: holds current path in state,
 * registers window.__navigateTo so mocked Link clicks update path, and renders
 * Navbar plus the page component for the current path (e.g. Page or ProjectsPage).
 */
function TestApp() {
    const [path, setPath] = React.useState("/");
    React.useEffect(() => {
        window.__navigateTo = setPath;
        return () => {
            delete window.__navigateTo;
        };
    }, []);
    return (
        <>
            <Navbar />
            <main>
                {path === "/" && <Page />}
                {path === "/projects" && <ProjectsPage />}
            </main>
        </>
    );
}

describe("Page", () => {
    /** Renders the home page in isolation and checks for the main heading. */
    it("should render the page", () => {
        render(<Page />);
        expect(screen.getByText("Shoreline Woodworks")).toBeInTheDocument();
    });

    /**
     * Renders TestApp (Navbar + route-driven content), clicks the Projects link,
     * then asserts the h1 shows "Projects". Depends on the next/link mock and
     * TestApp to simulate client-side navigation.
     */
    it("navigates to Projects page when clicking the Projects link in the navbar", async () => {
        render(<TestApp />);
        const projectsLink = screen.getByRole("link", { name: "Projects" });
        await userEvent.click(projectsLink);
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent("Projects");
    });

    // TODO: Add tests for the About and Contact pages.
});