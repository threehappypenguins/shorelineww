/**
 * @file Footer component tests.
 *
 * Verifies that the footer renders correctly: footer landmark, logo (via
 * next/image mock), Navigation section (Home, Projects, Contact), Contact
 * section (phone and email), and copyright. Footer uses useTheme from
 * next-themes for the logo src, so we mock that provider to avoid missing context.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import Footer from "@/components/Footer";

vi.mock("next-themes", async () => (await import("../../tests/mocks/next-themes")).default);
vi.mock("next/image", async () => ({ default: (await import("../../tests/mocks/next-image")).default }));

describe("Footer", () => {
	/** Ensures the footer landmark and logo (by alt) are present. */
	it("renders the footer", async () => {
		render(<Footer />);
		const footer = screen.getByTestId("footer");
		expect(footer).toBeInTheDocument();
		expect(screen.getByRole("contentinfo")).toBe(footer);
		// Wait for the image to appear after the useEffect sets mounted to true
		await waitFor(() => {
			expect(within(footer).getByRole("img", { name: "Shoreline Woodworks" })).toBeInTheDocument();
		});
	});

	/**
	 * Asserts the Navigation section exists with the three links: Home, Projects, Contact.
	 * Uses getByRole with name for accessibility-friendly queries.
	 */
	it("contains Navigation section with 3 links", () => {
		render(<Footer />);
		expect(screen.getByRole("heading", { name: "Navigation" })).toBeInTheDocument();
		const home = screen.getByRole("link", { name: "Home" });
		const projects = screen.getByRole("link", { name: "Projects" });
		const contact = screen.getByRole("link", { name: "Contact" });

		expect(home).toBeInTheDocument();
		expect(home).toHaveAttribute("href", "/");
		expect(projects).toBeInTheDocument();
		expect(projects).toHaveAttribute("href", "/projects");
		expect(contact).toBeInTheDocument();
		expect(contact).toHaveAttribute("href", "/contact");

		expect([home, projects, contact]).toHaveLength(3);
	});

	/**
	 * Asserts each Contact section (mobile and desktop) contains the heading, phone link, and email link.
	 * Uses data-testid to target the two contact blocks without relying on getAllByRole.
	 */
	it("contains Contact section with phone and email", () => {
		render(<Footer />);
		const contactMobile = screen.getByTestId("footer-contact-mobile");
		const contactDesktop = screen.getByTestId("footer-contact-desktop");

		[contactMobile, contactDesktop].forEach((section) => {
			expect(within(section).getByRole("heading", { name: "Contact" })).toBeInTheDocument();
			const phoneLink = within(section).getByRole("link", { name: /902-412-7358/ });
			const emailLink = within(section).getByRole("link", { name: /info@shorelinewoodworks\.ca/ });
			expect(phoneLink).toHaveAttribute("href", "tel:902-412-7358");
			expect(emailLink).toHaveAttribute("href", "mailto:info@shorelinewoodworks.ca");
		});
	});

	/**
	 * Asserts the copyright line contains the current year and business name.
	 */
	it("displays copyright with current year and business name", () => {
		const currentYear = new Date().getFullYear();
		render(<Footer />);
		const copyrightSection = screen.getByTestId("footer-copyright");
		const copyright = within(copyrightSection).getByText(
			new RegExp(`©\\s*${currentYear}\\s*Shoreline Woodworks\\.\\s*All rights reserved\\.`, "i"),
		);
		expect(copyright).toBeInTheDocument();
	});
});
