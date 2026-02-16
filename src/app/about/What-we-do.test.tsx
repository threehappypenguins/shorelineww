/**
 * @file WhatWeDo component tests.
 *
 * Verifies that the WhatWeDo component renders correctly and displays
 * all expected service cards with their headings and descriptions.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WhatWeDo from "./what-we-do";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("WhatWeDo", () => {
  const defaultProps = {
    initialHeading: null as string | null,
    initialCards: null as { title: string; description: string }[] | null,
    isAdmin: false,
  };

  it("renders the What We Do heading", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "What We Do" })).toBeInTheDocument();
  });

  it("displays the Custom Stairs & Railings service card", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Custom Stairs & Railings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Hand-crafted staircases and railings designed to complement any home aesthetic/,
      ),
    ).toBeInTheDocument();
  });

  it("displays the Millwork & Cabinetry service card", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Millwork & Cabinetry" })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Built-in cabinets, shelving, and architectural millwork tailored to your vision/,
      ),
    ).toBeInTheDocument();
  });

  it("displays the Flooring Installation service card", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Flooring Installation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Premium hardwood flooring selection and expert installation/),
    ).toBeInTheDocument();
  });

  it("displays the Home Renovations service card", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Home Renovations" })).toBeInTheDocument();
    expect(
      screen.getByText(/Full renovation projects with woodworking and custom details/),
    ).toBeInTheDocument();
  });

  it("displays the Restoration & Repair service card", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Restoration & Repair" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Expert restoration and repair of existing woodwork and furniture/),
    ).toBeInTheDocument();
  });

  it("displays the Design Consultation service card", () => {
    render(<WhatWeDo {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Design Consultation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Personalized consultations to bring your vision to life/),
    ).toBeInTheDocument();
  });
});
