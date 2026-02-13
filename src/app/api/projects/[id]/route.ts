import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdmin } from "@/lib/auth-guards";
import { deleteImage, uploadImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]
 *
 * Public endpoint that returns a single project by id, or 404 if it does not exist.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(project);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/projects/[id]
 *
 * Admin-only endpoint that updates an existing project using multipart/form-data.
 * Supports optional `title`, `description`, `category`, `featured`, `image` (replace),
 * and `removeImage` (delete existing image without replacement), and returns the updated project.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const adminResult = await verifyAdmin(req, { params });
  if (!adminResult.ok) {
    return adminResult.response;
  }

  // Track a new image public ID so we can clean it up in case the DB update fails.
  let newUploadedPublicId: string | null = null;

  try {
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const category = formData.get("category");
    const featured = formData.get("featured");
    const image = formData.get("image");
    const removeImage = formData.get("removeImage");

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }
    const titleTrimmed = title.trim();
    if (!titleTrimmed) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    let imageUrl: string | null = existing.imageUrl;
    let imagePublicId: string | null = existing.imagePublicId;

    const hasNewImage = image instanceof File && image.size > 0;

    // If a new image is provided, treat this as a replace operation and ignore `removeImage`.
    if (hasNewImage) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        return NextResponse.json(
          {
            error:
              "Invalid image type. Allowed: image/jpeg, image/jpg, image/png, image/webp, image/gif",
          },
          { status: 400 },
        );
      }
      if (image.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Image file is too large (max 10MB)" },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await image.arrayBuffer());
      const uploaded = await uploadImage(buffer);
      imageUrl = uploaded.secureUrl;
      imagePublicId = uploaded.publicId;
      newUploadedPublicId = uploaded.publicId;
    } else if (removeImage === "true") {
      if (existing.imagePublicId) {
        try {
          await deleteImage(existing.imagePublicId);
          // Only clear DB fields if Cloudinary deletion succeeds
          imageUrl = null;
          imagePublicId = null;
        } catch {
          return NextResponse.json(
            { error: "Failed to delete existing image" },
            { status: 500 },
          );
        }
      } else {
        // No Cloudinary image, but honor explicit removeImage request
        imageUrl = null;
        imagePublicId = null;
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: titleTrimmed,
        description:
          typeof description === "string"
            ? (description.trim() || null)
            : existing.description,
        category:
          typeof category === "string"
            ? (category.trim() || null)
            : existing.category,
        featured:
          typeof featured === "string"
            ? featured === "true"
            : existing.featured,
        imageUrl,
        imagePublicId,
      },
    });

    // After a successful DB update, delete the old image if we uploaded a new one.
    if (hasNewImage && existing.imagePublicId && existing.imagePublicId !== imagePublicId) {
      try {
        await deleteImage(existing.imagePublicId);
      } catch {
        // Best-effort: ignore failure to delete old image from Cloudinary
      }
    }

    return NextResponse.json(updated);
  } catch {
    // Best-effort cleanup if a new image was uploaded but the DB update failed.
    if (newUploadedPublicId) {
      try {
        await deleteImage(newUploadedPublicId);
      } catch {
        // Ignore cleanup failure
      }
    }

    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * Admin-only endpoint that deletes a project and, if present, its associated Cloudinary image.
 * Returns `{ success: true }` when deletion succeeds, or 404 if the project is not found.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const adminResult = await verifyAdmin(req, { params });
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    if (existing.imagePublicId) {
      try {
        await deleteImage(existing.imagePublicId);
      } catch {
        return NextResponse.json(
          { error: "Failed to delete project image" },
          { status: 500 },
        );
      }
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}

