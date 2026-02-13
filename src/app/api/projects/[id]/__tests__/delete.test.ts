/**
 * Tests for the `DELETE /api/projects/[id]` route handler.
 *
 * These tests verify admin-only deletion: auth via verifyAdmin, deletion from
 * Prisma and optional Cloudinary image cleanup. We mock auth, database, and
 * Cloudinary so tests run without live services.
 *
 * Scenarios covered:
 * - Success: admin deletes a project; handler removes it from DB and Cloudinary
 *   (when imagePublicId is set) and returns 200 with { success: true }; second
 *   delete of same id returns 404.
 * - Not found: handler returns 404 when the project does not exist.
 * - Auth: verifyAdmin is called; 401 when session is missing or invalid; 403
 *   when the user is authenticated but not an admin.
 * - Server error: handler returns 500 when the database throws (e.g. delete fails).
 * - Cloudinary failure: when the project has an image and deleteImage throws, handler
 *   returns 500 with { error: "Failed to delete project image" } and does not delete from DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "../route";
import { prisma } from "@/lib/db";
import { verifyAdmin } from "@/lib/auth-guards";
import { deleteImage } from "@/lib/cloudinary";
import { mockProjects } from "../../__tests__/fixtures";

// Mock auth guard used by the DELETE handler so we can simulate admin vs
// unauthenticated/forbidden outcomes.
vi.mock("@/lib/auth-guards", () => ({
    verifyAdmin: vi.fn(),
}));

// Mock Prisma so route tests never depend on a live database.
vi.mock("@/lib/db", () => ({
    prisma: {
        project: {
            findUnique: vi.fn(),
            delete: vi.fn(),
        },
    },
}));

// Mock Cloudinary so we avoid real deletions and only assert calls.
vi.mock("@/lib/cloudinary", () => ({
    deleteImage: vi.fn(),
}));

describe("DELETE /api/projects/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * When the project exists and has an image, the handler must delete from both
     * the database and Cloudinary and return 200 with { success: true }. A second
     * delete of the same id must return 404 and must not call delete or deleteImage again.
     */
    it("should delete a project from both the database and Cloudinary AND second delete of same id returns 404", async () => {
        (verifyAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            user: { isAdmin: true },
        });

        const project = mockProjects[0];
        const projectId = project.id;
        const params = Promise.resolve({ id: projectId });

        // First call: project exists (has imagePublicId) → delete from DB and Cloudinary, return 200
        (prisma.project.findUnique as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(project)
            .mockResolvedValue(null); // Second call: already deleted → 404
        (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (deleteImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const req1 = new Request(`http://localhost/api/projects/${projectId}`, {
            method: "DELETE",
        });
        const res1 = await DELETE(req1, { params });

        expect(verifyAdmin).toHaveBeenCalledWith(req1, { params });
        expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: projectId } });
        expect(deleteImage).toHaveBeenCalledWith(project.imagePublicId);
        expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: projectId } });
        expect(res1.status).toBe(200);
        const body1 = await res1.json();
        expect(body1).toEqual({ success: true });

        // Second call: same id, project already deleted → 404
        const req2 = new Request(`http://localhost/api/projects/${projectId}`, {
            method: "DELETE",
        });
        const res2 = await DELETE(req2, { params });

        expect(prisma.project.findUnique).toHaveBeenCalledTimes(2);
        expect(res2.status).toBe(404);
        const body2 = await res2.json();
        expect(body2).toEqual({ error: "Project not found" });
        // delete and deleteImage must not be called again when project is not found
        expect(prisma.project.delete).toHaveBeenCalledTimes(1);
        expect(deleteImage).toHaveBeenCalledTimes(1);
    });

    /**
     * When no project exists for the requested id, the handler must return 404
     * with a consistent error body and must not call delete or deleteImage.
     */
    it("should return 404 when the project does not exist", async () => {
        (verifyAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            user: { isAdmin: true },
        });
        (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const params = Promise.resolve({ id: "nonexistent" });
        const req = new Request("http://localhost/api/projects/nonexistent", {
            method: "DELETE",
        });
        const res = await DELETE(req, { params });

        expect(verifyAdmin).toHaveBeenCalledWith(req, { params });
        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: "nonexistent" },
        });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toEqual({ error: "Project not found" });
        expect(prisma.project.delete).not.toHaveBeenCalled();
        expect(deleteImage).not.toHaveBeenCalled();
    });

    /**
     * When the session is missing or invalid, verifyAdmin returns a 401 response;
     * the handler must return that response and must not touch the database or Cloudinary.
     */
    it("should return 401 when the session is missing or invalid", async () => {
        (verifyAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
            }),
        });

        const params = Promise.resolve({ id: "1" });
        const req = new Request("http://localhost/api/projects/1", {
            method: "DELETE",
        });
        const res = await DELETE(req, { params });

        expect(verifyAdmin).toHaveBeenCalledWith(req, { params });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ error: "Unauthorized" });
        expect(prisma.project.findUnique).not.toHaveBeenCalled();
        expect(prisma.project.delete).not.toHaveBeenCalled();
        expect(deleteImage).not.toHaveBeenCalled();
    });

    /**
     * When the user is authenticated but not an admin, verifyAdmin returns 403
     * Forbidden; the handler must return that response and must not touch the database or Cloudinary.
     */
    it("should return 403 when the user is authenticated but NOT an admin", async () => {
        (verifyAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }),
        });

        const params = Promise.resolve({ id: "1" });
        const req = new Request("http://localhost/api/projects/1", {
            method: "DELETE",
        });
        const res = await DELETE(req, { params });

        expect(verifyAdmin).toHaveBeenCalledWith(req, { params });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body).toEqual({ error: "Forbidden" });
        expect(prisma.project.findUnique).not.toHaveBeenCalled();
        expect(prisma.project.delete).not.toHaveBeenCalled();
        expect(deleteImage).not.toHaveBeenCalled();
    });

    /**
     * If the database throws (e.g. delete fails), the handler catches and returns
     * 500 with a generic message so we don't leak internal details to the client.
     */
    it("should return 500 when something is wrong with the database", async () => {
        (verifyAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            user: { isAdmin: true },
        });
        const project = mockProjects[0];
        (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(project);
        (prisma.project.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Database connection lost"),
        );
        (deleteImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const params = Promise.resolve({ id: project.id });
        const req = new Request(`http://localhost/api/projects/${project.id}`, {
            method: "DELETE",
        });
        const res = await DELETE(req, { params });

        expect(verifyAdmin).toHaveBeenCalledWith(req, { params });
        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: project.id },
        });
        expect(deleteImage).toHaveBeenCalledWith(project.imagePublicId);
        expect(prisma.project.delete).toHaveBeenCalledWith({
            where: { id: project.id },
        });
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to delete project" });
    });

    /**
     * When the project has an image and deleteImage throws (e.g. Cloudinary unreachable),
     * the handler must return 500 with { error: "Failed to delete project image" } and
     * must not delete the project from the database, so the client can retry.
     */
    it("should return 500 and not delete from DB when Cloudinary deleteImage fails", async () => {
        (verifyAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            user: { isAdmin: true },
        });
        const project = mockProjects[0];
        (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(project);
        (deleteImage as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Cloudinary API error"),
        );

        const params = Promise.resolve({ id: project.id });
        const req = new Request(`http://localhost/api/projects/${project.id}`, {
            method: "DELETE",
        });
        const res = await DELETE(req, { params });

        expect(verifyAdmin).toHaveBeenCalledWith(req, { params });
        expect(prisma.project.findUnique).toHaveBeenCalledWith({
            where: { id: project.id },
        });
        expect(deleteImage).toHaveBeenCalledWith(project.imagePublicId);
        expect(prisma.project.delete).not.toHaveBeenCalled();
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to delete project image" });
    });
});
