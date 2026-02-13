/**
 * Tests for the `GET /api/projects/[id]` route handler.
 *
 * These tests verify that a single project is returned by id, and that 404/500
 * responses are correct. We mock authentication and Prisma so that the tests
 * focus on how the handler uses the route id and shapes the response.
 *
 * Scenarios covered:
 * - Success: handler returns the project when it exists (for every fixture id).
 * - Not found: handler returns 404 when Prisma returns null.
 * - Server error: handler returns 500 when the DB throws or when the route
 *   params Promise rejects (e.g. framework/routing failure).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { prisma } from "@/lib/db";
import { mockProjects } from "../../__tests__/fixtures";

// Mock auth to avoid pulling in next-auth/next during tests; the GET [id]
// handler is public, so auth is irrelevant for these scenarios.
vi.mock("@/lib/auth", () => ({
    auth: vi.fn(),
}));

// Mock the Prisma client so we can control the single project returned
// (or null for 404) for each test.
vi.mock("@/lib/db", () => ({
    prisma: {
        project: {
            findUnique: vi.fn(),
        },
    },
}));

describe("GET /api/projects/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Ensures the handler returns 200 and the correct project body for every
     * known id. Looping over all mockProjects guards against the handler
     * e.g. always returning the first project instead of the one matching the id.
     */
    it("should return the correct project for each existing id", async () => {
        for (const project of mockProjects) {
            (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(project);

            const req = new Request(`http://localhost/api/projects/${project.id}`);
            const res = await GET(req, {
                params: Promise.resolve({ id: project.id }),
            });

            expect(prisma.project.findUnique).toHaveBeenCalledWith({
                where: { id: project.id },
            });
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual(project);
        }
    });

    /**
     * When no project exists for the requested id, the handler must return 404
     * with a consistent error body so clients can distinguish "not found" from
     * server errors.
     */
    it("should return 404 when the project does not exist", async () => {
        (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const req = new Request("http://localhost/api/projects/nonexistent");
        const res = await GET(req, {
            params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: "nonexistent" },
        });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toEqual({ error: "Project not found" });
    });

    /**
     * If Prisma throws (e.g. connection lost, constraint error), the handler
     * catches and returns 500 with a generic message so we don't leak internal
     * details to the client.
     */
    it("should return 500 when the database query fails", async () => {
        (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Database connection failed"),
        );

        const req = new Request("http://localhost/api/projects/1");
        const res = await GET(req, {
            params: Promise.resolve({ id: "1" }),
        });

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to fetch project" });
    });

    /**
     * Next.js passes route params as a Promise; if that Promise rejects (e.g.
     * dynamic segment resolution fails), the handler should still return 500
     * and must not call the database with invalid or missing id.
     */
    it("should return 500 when the params promise rejects", async () => {
        const req = new Request("http://localhost/api/projects/1");
        const res = await GET(req, {
            params: Promise.reject(new Error("Route params unavailable")),
        });

        expect(prisma.project.findUnique).not.toHaveBeenCalled();
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to fetch project" });
    });
});
