import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock next/font/local
vi.mock('next/font/local', () => ({
	default: () => ({
		className: 'mocked-font-class',
		style: { fontFamily: 'mocked-font' },
	}),
}))

// Cleanup after each test
afterEach(() => {
	cleanup();
});