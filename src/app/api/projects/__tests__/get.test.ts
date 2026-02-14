/**
 * Tests for the `GET /api/projects` route handler.
 *
 * These tests verify filtering, ordering, and error behavior of the projects
 * listing endpoint. We mock authentication and Prisma so that the tests focus
 * purely on how the handler builds its Prisma query and shapes the response.
 *
 * Scenarios covered:
 * - No filters: handler uses empty where and returns full list in created-desc order.
 * - tag / featured: query string is parsed and passed into the Prisma where clause.
 * - Combined filters: both tag and featured can be used together.
 * - Empty results: handler returns 200 with an empty array when nothing matches.
 * - Invalid or missing params: featured=invalid is treated as false; empty tag
 *   is ignored so the handler does not filter by tag.
 * - Server error: when the DB throws, handler returns 500 with a generic message.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { prisma } from "@/lib/db";
import type { ProjectApiResponse } from "@/types/project";
import { mockProjects } from "./fixtures";

// Mock auth to avoid pulling in next-auth/next during tests; the GET handler
// is public, so auth is irrelevant for these scenarios.
vi.mock("@/lib/auth", () => ({
    auth: vi.fn(),
}));

// Mock the Prisma client so we can precisely control the projects returned
// for each combination of query-string filters.
vi.mock("@/lib/db", () => ({
    prisma: {
        project: {
            findMany: vi.fn(),
        },
    },
}));

const projectTagsInclude = {
    projectTags: { include: { tag: { select: { name: true } } } },
};

const defaultOrderBy = [
    { createdAt: "desc" as const },
    { displayOrder: "asc" as const },
];

function withProjectTags(projects: typeof mockProjects) {
    return projects.map((p) => ({
        ...p,
        projectTags: (p.tags ?? []).map((name) => ({ tag: { name } })),
    }));
}

describe("GET /api/projects", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * With no query string, the handler must pass an empty where clause and
     * order by createdAt desc so the response is the full list in the correct order.
     */
    it("should return a list of projects with no filters", async () => {
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(mockProjects));

        const req = new Request("http://localhost/api/projects");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(body).toEqual(mockProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
    });

    /**
     * The tag query param must be forwarded to Prisma so only projects
     * with that tag are returned; we assert both the where clause and the response.
     */
    it("should return a list of projects filtered by tag", async () => {
        const residentialProjects = mockProjects.filter(
            (project: ProjectApiResponse) => project.tags?.includes("Residential"),
        );
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(residentialProjects));

        const req = new Request("http://localhost/api/projects?tag=Residential");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: {
                projectTags: {
                    some: { tag: { name: { equals: "Residential", mode: "insensitive" } } },
                },
            },
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual(residentialProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
        expect(
            body.every((project: ProjectApiResponse & { tags?: string[] }) =>
                project.tags?.includes("Residential"),
            ),
        ).toBe(true);
    });

    /**
     * featured=true must be parsed as boolean true and passed to findMany so
     * only featured projects are returned.
     */
    it("should return a list containing only the featured project", async () => {
        const featuredProjects = mockProjects.filter(
            (project: ProjectApiResponse) => project.featured,
        );
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(featuredProjects));

        const req = new Request("http://localhost/api/projects?featured=true");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: { featured: true },
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual(featuredProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
        expect((body[0] as ProjectApiResponse).featured).toBe(true);
        expect(body.length).toBe(1);
    });

    /**
     * featured=false must be parsed as boolean false so non-featured projects
     * are returned (not an empty list or unfiltered list).
     */
    it("should return a list containing only the non-featured projects", async () => {
        const nonFeaturedProjects = mockProjects.filter(
            (project: ProjectApiResponse) => !project.featured,
        );
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(nonFeaturedProjects));

        const req = new Request("http://localhost/api/projects?featured=false");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: { featured: false },
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual(nonFeaturedProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
        expect(body.every((project: ProjectApiResponse) => !project.featured)).toBe(true);
        expect(body.length).toBe(mockProjects.length - 1);
    });

    /**
     * If Prisma throws (e.g. connection lost), the handler catches and returns
     * 500 with a generic message so we don't leak internal details to the client.
     */
    it("should return a 500 error if the database query fails", async () => {
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database query failed"));

        const req = new Request("http://localhost/api/projects");
        const res = await GET(req);

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "Failed to fetch projects" });
    });

    /**
     * Both tag and featured can appear in the query string; the handler
     * must include both in the where clause so results match all criteria.
     */
    it("should return projects filtered by both tag and featured", async () => {
        const featuredResidentialProjects = mockProjects.filter(
            (project: ProjectApiResponse) =>
                project.tags?.includes("Residential") && project.featured === true,
        );
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(featuredResidentialProjects));

        const req = new Request(
            "http://localhost/api/projects?tag=Residential&featured=true",
        );
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: {
                projectTags: {
                    some: { tag: { name: { equals: "Residential", mode: "insensitive" } } },
                },
                featured: true,
            },
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual(featuredResidentialProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
        expect(body.every((project: ProjectApiResponse & { tags?: string[] }) =>
            project.tags?.includes("Residential"),
        )).toBe(true);
        expect(body.every((project: ProjectApiResponse) => project.featured === true)).toBe(true);
    });

    /**
     * When the filter matches no rows, the handler must return 200 with an
     * empty array (not 404 or 500) so clients can distinguish "no results" from errors.
     */
    it("should return an empty array when no projects match the filters", async () => {
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const req = new Request("http://localhost/api/projects?tag=NonExistent");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: {
                projectTags: {
                    some: { tag: { name: { equals: "NonExistent", mode: "insensitive" } } },
                },
            },
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual([]);
        expect(Array.isArray(body)).toBe(true);
    });

    /**
     * Non-boolean featured values (e.g. "invalid") must be treated as false so
     * the API is robust to malformed query params and returns a safe default.
     */
    it("should treat invalid featured value as false", async () => {
        const nonFeaturedProjects = mockProjects.filter(
            (project: ProjectApiResponse) => !project.featured,
        );
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(nonFeaturedProjects));

        const req = new Request("http://localhost/api/projects?featured=invalid");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: { featured: false },
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual(nonFeaturedProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
    });

    /**
     * An empty tag param (e.g. ?tag=) must not add a filter; the
     * handler should use an empty where so the full list is returned.
     */
    it("should ignore empty tag parameter", async () => {
        (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(withProjectTags(mockProjects));

        const req = new Request("http://localhost/api/projects?tag=");
        const res = await GET(req);

        expect(prisma.project.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: defaultOrderBy,
            include: projectTagsInclude,
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toEqual(mockProjects.map((p) => ({ ...p, tags: p.tags ?? [] })));
    });
});