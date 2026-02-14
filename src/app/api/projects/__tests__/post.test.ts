/**
 * @vitest-environment node
 * Tests for the `POST /api/projects` route handler.
 *
 * These integration-style tests focus on request validation, interaction with
 * Prisma, and Cloudinary upload/cleanup behavior. We mock external services
 * (auth, database, and Cloudinary) so that the tests can run deterministically
 * without real network calls or a real database.
 *
 * Scenarios covered:
 * - Success: valid payload with image; FormData trimming and optional fields.
 * - Validation: at least one image required; missing or whitespace-only title → 400.
 * - Validation: missing or whitespace-only title → 400; invalid image type (e.g. SVG)
 *   or image over 10MB → 400 with specific error messages.
 * - Auth: requireAdmin is called; 401 when no/invalid session; 403 when not admin.
 * - Errors: Cloudinary upload failure → 500; DB create failure after upload →
 *   500 and deleteImage is called to clean up the uploaded asset.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { uploadImage, deleteImage } from "@/lib/cloudinary";

// Mock auth guard used by the POST handler so we can simulate different
// authorization outcomes (admin, non-admin, unauthenticated) in isolation.
vi.mock("@/lib/auth-guards", () => ({
    requireAdmin: vi.fn(),
}));

// Mock the Prisma client so that route tests never depend on a live database.
vi.mock("@/lib/db", () => ({
    prisma: {
        project: {
            updateMany: vi.fn().mockResolvedValue(undefined),
            create: vi.fn(),
        },
    },
}));

// Mock Cloudinary helpers so tests avoid real image uploads/deletions and only
// assert that the route calls them with the correct arguments.
vi.mock("@/lib/cloudinary", () => ({
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    generateProjectFolder: vi.fn(() => "projects/20260213-120000"),
}));

// Mock tags lib so we avoid real DB calls for tag resolution
vi.mock("@/lib/tags", () => ({
    resolveTagNamesToIds: vi.fn().mockResolvedValue([]),
}));

describe("POST /api/projects", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * At least one image is required. When FormData has no images, the handler must
     * return 400 and must not call create.
     */
    it("returns 400 when FormData has no images", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const formData = new FormData();
        formData.set("title", "   New Project   ");
        formData.set("description", "A brand new project");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({ error: "At least one image is required" });
    });

    /**
     * When a valid image file (allowed type and size) is included, the handler must
     * call uploadImage, then create with the returned URL and publicId, and return 201.
     */
    it("successfully creates a new project with a valid jpeg image", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const uploaded = {
            publicId: "projects/img-123",
            secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/projects/img-123.jpg",
            width: 1024,
            height: 768,
            format: "jpg",
        };

        (uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue(uploaded);

        const createdProject = {
            id: "proj_img_1",
            title: "Image Project",
            description: "Project with a valid jpeg image",
            featured: true,
            imageUrl: uploaded.secureUrl,
            imagePublicId: uploaded.publicId,
            createdAt: "2026-02-12T12:00:00.000Z",
            updatedAt: "2026-02-12T12:00:00.000Z",
            tags: ["Residential"],
        };

        (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue({
            ...createdProject,
            projectTags: [{ tag: { name: "Residential" } }],
        });

        const jpegFile = new File([new Uint8Array(1024)], "test.jpg", {
            type: "image/jpeg",
        });

        const formData = new FormData();
        formData.set("title", "Image Project");
        formData.set("description", "Project with a valid jpeg image");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");
        formData.append("image", jpegFile);

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(uploadImage).toHaveBeenCalledTimes(1);
        expect(prisma.project.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                title: "Image Project",
                description: "Project with a valid jpeg image",
                featured: true,
                displayOrder: 0,
                imageUrl: uploaded.secureUrl,
                imagePublicId: uploaded.publicId,
                cloudinaryFolder: expect.any(String),
                images: {
                    create: [
                        {
                            imageUrl: uploaded.secureUrl,
                            imagePublicId: uploaded.publicId,
                            sortOrder: 0,
                        },
                    ],
                },
            }),
            include: expect.objectContaining({
                images: { orderBy: { sortOrder: "asc" } },
                projectTags: { include: { tag: { select: { name: true } } } },
            }),
        });

        expect(uploadImage).toHaveBeenCalledWith(
            expect.any(Buffer),
            expect.objectContaining({ folder: expect.any(String) }),
        );
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toMatchObject(createdProject);
    });

    /**
     * At least one image is required. When only title is provided (no images), the
     * handler must return 400 and must not call create.
     */
    it("returns 400 when only title is provided without images", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const formData = new FormData();
        formData.set("title", "Title Only Project");

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({ error: "At least one image is required" });
    });

    /**
     * When JSON body has title but empty uploadedImages, the handler must return
     * 400 and must not call create.
     */
    it("returns 400 when JSON payload has no images", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "No Images Project",
                description: "Test",
                uploadedImages: [],
            }),
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({ error: "At least one image is required" });
    });

    /**
     * Title is required; when it is absent from FormData the handler must return
     * 400 with a clear error and must not call create.
     */
    it("returns 400 when title is missing", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const formData = new FormData();
        // Intentionally do NOT set "title"
        formData.set("description", "Missing title");

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({ error: "Title is required" });
    });

    /**
     * A title that is only whitespace after trim must be rejected like a missing
     * title so we do not create projects with empty titles.
     */
    it("returns 400 when title is only whitespace", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const formData = new FormData();
        formData.set("title", "   "); // whitespace only
        formData.set("description", "Whitespace title");

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({ error: "Title is required" });
    });

    /**
     * When requireAdmin returns not ok (e.g. no session or invalid cookie), the
     * handler must return 401 Unauthorized and must not create a project.
     */
    it("returns 401 when the session is missing or invalid", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            session: null,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }),
        });

        const formData = new FormData();
        formData.set("title", "Some Project");

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ error: "Unauthorized" });
    });

    /**
     * When the user is logged in but not an admin, the handler must return 403
     * Forbidden and must not create a project.
     */
    it("returns 403 when the user is authenticated but not an admin", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            session: {},
            response: new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }),
        });

        const formData = new FormData();
        formData.set("title", "Some Project");

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body).toEqual({ error: "Forbidden" });
    });

    /**
     * Only allowed image types (jpeg, jpg, png, webp, gif) are accepted; e.g. SVG
     * must be rejected with 400 and the documented allowed-types error message.
     */
    it("returns 400 when image has an invalid svg mime type", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const svgFile = new File([new Uint8Array(10)], "test.svg", {
            type: "image/svg+xml",
        });

        const formData = new FormData();
        formData.set("title", "Project With SVG Image");
        formData.set("description", "Has an invalid SVG image");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");
        formData.append("image", svgFile);

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({
            error:
                "Invalid image type. Allowed: image/jpeg, image/jpg, image/png, image/webp, image/gif",
        });
    });

    /**
     * Images over 10MB must be rejected with 400 and a size-limit error so we
     * avoid uploading oversized files to Cloudinary.
     */
    it("returns 400 when image file is larger than 10MB", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const largeFile = new File(
            [new Uint8Array(10 * 1024 * 1024 + 1)],
            "large.jpg",
            { type: "image/jpeg" },
        );

        const formData = new FormData();
        formData.set("title", "Project With Large Image");
        formData.set("description", "Has an oversized image");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");
        formData.append("image", largeFile);

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toEqual({ error: "Image file is too large (max 10MB)" });
    });

    it("returns 500 when Cloudinary upload fails", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        (uploadImage as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Cloudinary upload failed"),
        );

        const jpegFile = new File([new Uint8Array(1024)], "test.jpg", {
            type: "image/jpeg",
        });

        const formData = new FormData();
        formData.set("title", "Image Project");
        formData.set("description", "Project with image");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");
        formData.append("image", jpegFile);

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalledWith();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to create project" });
    });

    /**
     * If uploadImage throws (e.g. Cloudinary unreachable), the handler must return
     * 500 with a generic message and must not call create (no orphan DB record).
     */
    it("returns 500 when Cloudinary upload fails", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        (uploadImage as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Cloudinary upload failed"),
        );

        const jpegFile = new File([new Uint8Array(1024)], "test.jpg", {
            type: "image/jpeg",
        });

        const formData = new FormData();
        formData.set("title", "Project With Failing Upload");
        formData.set("description", "Cloudinary should fail during upload");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");
        formData.append("image", jpegFile);

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(prisma.project.create).not.toHaveBeenCalled();
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to create project" });
    });

    /**
     * If create fails after a successful upload, the handler must return 500 and
     * call deleteImage with the uploaded publicId so we do not leave orphan assets
     * in Cloudinary.
     */
    it("returns 500 and cleans up uploaded image when database create fails", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const uploaded = {
            publicId: "projects/img-db-fail",
            secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/projects/img-db-fail.jpg",
            width: 800,
            height: 600,
            format: "jpg",
        };

        (uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue(uploaded);
        (prisma.project.create as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Database create failed"),
        );

        const deleteImageMock = deleteImage as unknown as ReturnType<typeof vi.fn>;

        const jpegFile = new File([new Uint8Array(1024)], "test.jpg", {
            type: "image/jpeg",
        });

        const formData = new FormData();
        formData.set("title", "Project With DB Failure");
        formData.set("description", "DB create should fail after upload");
        formData.set("tags", JSON.stringify(["Residential"]));
        formData.set("featured", "true");
        formData.append("image", jpegFile);

        const req = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);

        expect(requireAdmin).toHaveBeenCalled();
        expect(uploadImage).toHaveBeenCalledTimes(1);
        expect(prisma.project.create).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toEqual({ error: "Failed to create project" });
        expect(deleteImageMock).toHaveBeenCalledWith(uploaded.publicId);
    });

    /**
     * When create fails after a successful upload and the cleanup deleteImage also
     * fails, the handler must return 500 with a message indicating both failures.
     */
    it("returns 500 with cleanup failure message when create fails and deleteImage cleanup fails", async () => {
        (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            session: {},
            response: null,
        });

        const uploaded = {
            publicId: "projects/img-cleanup-fail",
            secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/projects/img-cleanup-fail.jpg",
            width: 800,
            height: 600,
            format: "jpg",
        };

        (uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue(uploaded);
        (prisma.project.create as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Database create failed"),
        );
        (deleteImage as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error("Cloudinary delete failed"),
        );

        const jpegFile = new File([new Uint8Array(1024)], "test.jpg", {
            type: "image/jpeg",
        });

        const formDataCleanup = new FormData();
        formDataCleanup.set("title", "Project With Cleanup Failure");
        formDataCleanup.set("description", "DB create should fail and cleanup should fail");
        formDataCleanup.set("tags", JSON.stringify(["Residential"]));
        formDataCleanup.set("featured", "true");
        formDataCleanup.append("image", jpegFile);

        const reqCleanup = new Request("http://localhost/api/projects", {
            method: "POST",
            body: formDataCleanup,
        });

        const resCleanup = await POST(reqCleanup);

        expect(requireAdmin).toHaveBeenCalled();
        expect(uploadImage).toHaveBeenCalledTimes(1);
        expect(prisma.project.create).toHaveBeenCalledTimes(1);
        expect(resCleanup.status).toBe(500);
        const bodyCleanup = await resCleanup.json();
        expect(bodyCleanup).toEqual({ error: "Failed to create project" });
        expect(deleteImage).toHaveBeenCalledWith(uploaded.publicId);
    });
});
