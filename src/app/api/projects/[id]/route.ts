import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdmin } from "@/lib/auth-guards";
import { resolveTagNamesToIds } from "@/lib/tags";
import {
  DEFAULT_PROJECTS_FOLDER,
  dateToFolderAndCreatedAt,
  deleteFolder,
  deleteImage,
  uploadImage,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_YEAR = 1970;
const MIN_MONTH = 1;
const MAX_MONTH = 12;

/** Parse HHmmss suffix to seconds since midnight. */
function suffixToSeconds(suffix: string): number {
  if (!/^\d{6}$/.test(suffix)) return 0;
  const h = parseInt(suffix.slice(0, 2), 10);
  const m = parseInt(suffix.slice(2, 4), 10);
  const s = parseInt(suffix.slice(4, 6), 10);
  return h * 3600 + m * 60 + s;
}

function secondsToSuffix(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds)) % 60;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join("");
}

/** Derive folder from project createdAt for legacy projects without cloudinaryFolder. */
function folderForProject(project: {
  cloudinaryFolder: string | null;
  createdAt: Date;
}): string {
  if (project.cloudinaryFolder) return project.cloudinaryFolder;
  const d = new Date(project.createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${DEFAULT_PROJECTS_FOLDER}/${y}${m}${day}-${h}${min}${s}`;
}

/**
 * Resolve a unique folder and createdAt for the given date, excluding the current
 * project so re-saving the same date keeps the same folder.
 */
async function resolveFolderForDate(
  year: number,
  month: number,
  day: number | undefined,
  excludeProjectId: string,
): Promise<{ folder: string; createdAt: Date }> {
  const { prefix, createdAt: baseDate } = dateToFolderAndCreatedAt(
    year,
    month,
    day,
  );
  const existing = await prisma.project.findMany({
    where: {
      cloudinaryFolder: { startsWith: prefix },
      id: { not: excludeProjectId },
    },
    select: { cloudinaryFolder: true },
  });
  let maxSeconds = 0;
  for (const p of existing) {
    const suffix = p.cloudinaryFolder?.slice(-6) ?? "";
    maxSeconds = Math.max(maxSeconds, suffixToSeconds(suffix));
  }
  const nextSeconds = maxSeconds + 1;
  const folder = `${prefix}${secondsToSuffix(nextSeconds)}`;
  const createdAt = new Date(baseDate.getTime() + nextSeconds * 1000);
  return { folder, createdAt };
}

/**
 * Find the displayOrder index where a project with the given createdAt should sit
 * so that when listed by displayOrder, newest first (0 = newest). Excludes the
 * project being moved (excludeProjectId) so we don't count it in the list.
 */
async function getDisplayOrderInsertIndex(
  createdAt: Date,
  excludeProjectId: string,
): Promise<number> {
  const projects = await prisma.project.findMany({
    where: { id: { not: excludeProjectId } },
    orderBy: { displayOrder: "asc" },
    select: { id: true, displayOrder: true, createdAt: true },
  });
  const insertIndex = projects.filter((p) => p.createdAt > createdAt).length;
  return insertIndex;
}

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
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        projectTags: { include: { tag: { select: { name: true } } } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const { projectTags, ...rest } = project;
    return NextResponse.json({ ...rest, tags: projectTags.map((pt) => pt.tag.name) });
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
 * Supports optional `title`, `description`, `tags`, `featured`, `image` (replace),
 * and `removeImage` (delete existing image without replacement), and returns the updated project.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const adminResult = await verifyAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const newUploadedPublicIds: string[] = [];

  try {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
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
    const tagsRaw = formData.get("tags");
    const featured = formData.get("featured");
    const imageEntries = formData.getAll("image");
    const removeImage = formData.get("removeImage");
    const keepPublicIdsRaw = formData.getAll("keepPublicIds");
    const keepPublicIds = new Set(
      keepPublicIdsRaw.filter((x): x is string => typeof x === "string"),
    );
    const thumbnailIndexRaw = formData.get("thumbnailIndex");
    const projectDateYearRaw = formData.get("projectDateYear");
    const projectDateMonthRaw = formData.get("projectDateMonth");
    const projectDateDayRaw = formData.get("projectDateDay");

    let resolvedDate: { folder: string; createdAt: Date } | null = null;
    let resolvedDateIsMonthOnly: boolean | null = null;
    if (
      projectDateYearRaw != null &&
      typeof projectDateYearRaw === "string" &&
      projectDateYearRaw.trim() !== "" &&
      projectDateMonthRaw != null &&
      typeof projectDateMonthRaw === "string" &&
      projectDateMonthRaw.trim() !== ""
    ) {
      const year = parseInt(projectDateYearRaw.trim(), 10);
      const month = parseInt(projectDateMonthRaw.trim(), 10);
      const day =
        projectDateDayRaw != null && typeof projectDateDayRaw === "string" && projectDateDayRaw.trim() !== ""
          ? parseInt(projectDateDayRaw.trim(), 10)
          : undefined;
      if (
        !Number.isNaN(year) &&
        year >= MIN_YEAR &&
        !Number.isNaN(month) &&
        month >= MIN_MONTH &&
        month <= MAX_MONTH &&
        (day === undefined || (!Number.isNaN(day) && day >= 1 && day <= 31))
      ) {
        resolvedDate = await resolveFolderForDate(year, month, day, id);
        resolvedDateIsMonthOnly = day === undefined;
      }
    }

    const folderToUse = resolvedDate?.folder ?? folderForProject(existing);

    if (resolvedDate) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const chosenStart = new Date(resolvedDate.createdAt);
      chosenStart.setHours(0, 0, 0, 0);
      if (chosenStart > todayStart) {
        return NextResponse.json(
          { error: "Project date cannot be in the future" },
          { status: 400 },
        );
      }
    }

    let displayOrderInsertIndex: number | null = null;
    if (resolvedDate) {
      displayOrderInsertIndex = await getDisplayOrderInsertIndex(
        resolvedDate.createdAt,
        id,
      );
      await prisma.project.updateMany({
        where: {
          displayOrder: { gte: displayOrderInsertIndex },
          id: { not: id },
        },
        data: { displayOrder: { increment: 1 } },
      });
    }

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

    const imageFiles = imageEntries.filter((entry): entry is File => {
      if (!entry || typeof entry !== "object") return false;
      if (entry instanceof File) return entry.size > 0;
      const fileLike = entry as { size?: number; type?: string; arrayBuffer?: () => unknown };
      return (
        typeof fileLike.size === "number" &&
        fileLike.size > 0 &&
        typeof fileLike.type === "string" &&
        typeof fileLike.arrayBuffer === "function"
      );
    });

    let tagNames: string[] = [];
    if (typeof tagsRaw === "string") {
      try {
        const parsed = JSON.parse(tagsRaw);
        tagNames = Array.isArray(parsed)
          ? parsed.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean)
          : [];
      } catch {
        // ignore invalid JSON
      }
    }
    const tagIds = await resolveTagNamesToIds(tagNames);
    const projectTagsUpdate = {
      projectTags: {
        deleteMany: {},
        create: tagIds.map((tagId) => ({ tagId })),
      },
    };

    if (removeImage === "true") {
      // Remove all images, then optionally add new ones - must have new images
      if (imageFiles.length === 0) {
        return NextResponse.json(
          { error: "At least one image is required. Add new images before removing all." },
          { status: 400 },
        );
      }
      const publicIdsToDelete = new Set(existing.images.map((i) => i.imagePublicId));
      if (existing.imagePublicId) publicIdsToDelete.add(existing.imagePublicId);
      for (const publicId of publicIdsToDelete) {
        try {
          await deleteImage(publicId);
        } catch {
          return NextResponse.json(
            { error: "Failed to delete existing image" },
            { status: 500 },
          );
        }
      }
      await prisma.projectImage.deleteMany({ where: { projectId: id } });

      if (imageFiles.length > 0) {
        const uploadedImages: { secureUrl: string; publicId: string }[] = [];
        for (const image of imageFiles) {
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
          const uploaded = await uploadImage(buffer, { folder: folderToUse });
          newUploadedPublicIds.push(uploaded.publicId);
          uploadedImages.push({ secureUrl: uploaded.secureUrl, publicId: uploaded.publicId });
        }
        const first = uploadedImages[0];
        await prisma.project.update({
          where: { id },
          data: {
            title: titleTrimmed,
            description:
              typeof description === "string"
                ? (description.trim() || null)
                : existing.description,
            featured:
              typeof featured === "string"
                ? featured === "true"
                : existing.featured,
            imageUrl: first.secureUrl,
            imagePublicId: first.publicId,
            cloudinaryFolder: folderToUse,
            ...(resolvedDate && {
              createdAt: resolvedDate.createdAt,
              ...(displayOrderInsertIndex != null && { displayOrder: displayOrderInsertIndex }),
              ...(resolvedDateIsMonthOnly !== null && { dateIsMonthOnly: resolvedDateIsMonthOnly }),
            }),
            images: {
              create: uploadedImages.map((img, index) => ({
                imageUrl: img.secureUrl,
                imagePublicId: img.publicId,
                sortOrder: index,
              })),
            },
            ...projectTagsUpdate,
          },
        });
      } else {
        await prisma.project.update({
          where: { id },
          data: {
            title: titleTrimmed,
            description:
              typeof description === "string"
                ? (description.trim() || null)
                : existing.description,
            featured:
              typeof featured === "string"
                ? featured === "true"
                : existing.featured,
            imageUrl: null,
            imagePublicId: null,
            ...(resolvedDate && {
              cloudinaryFolder: folderToUse,
              createdAt: resolvedDate.createdAt,
              ...(displayOrderInsertIndex != null && { displayOrder: displayOrderInsertIndex }),
              ...(resolvedDateIsMonthOnly !== null && { dateIsMonthOnly: resolvedDateIsMonthOnly }),
            }),
            ...projectTagsUpdate,
          },
        });
      }
    } else if (keepPublicIds.size < existing.images.length || imageFiles.length > 0) {
      // Remove some existing images and/or add new ones
      const toDelete = existing.images.filter((i) => !keepPublicIds.has(i.imagePublicId));
      const kept = existing.images
        .filter((i) => keepPublicIds.has(i.imagePublicId))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (kept.length === 0 && imageFiles.length === 0) {
        return NextResponse.json(
          { error: "At least one image is required" },
          { status: 400 },
        );
      }
      for (const img of toDelete) {
        try {
          await deleteImage(img.imagePublicId);
        } catch {
          return NextResponse.json(
            { error: "Failed to delete project image" },
            { status: 500 },
          );
        }
      }
      await prisma.projectImage.deleteMany({
        where: {
          projectId: id,
          imagePublicId: { in: toDelete.map((i) => i.imagePublicId) },
        },
      });

      const uploadedImages: { secureUrl: string; publicId: string }[] = [];
      if (imageFiles.length > 0) {
        for (const image of imageFiles) {
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
          const uploaded = await uploadImage(buffer, { folder: folderToUse });
          newUploadedPublicIds.push(uploaded.publicId);
          uploadedImages.push({ secureUrl: uploaded.secureUrl, publicId: uploaded.publicId });
        }
      }

      const firstKept = kept[0];
      const firstNew = uploadedImages[0];
      const newImageUrl = firstKept?.imageUrl ?? firstNew?.secureUrl ?? null;
      const newImagePublicId = firstKept?.imagePublicId ?? firstNew?.publicId ?? null;

      await prisma.project.update({
        where: { id },
        data: {
          title: titleTrimmed,
          description:
            typeof description === "string"
              ? (description.trim() || null)
              : existing.description,
          featured:
            typeof featured === "string"
              ? featured === "true"
              : existing.featured,
          imageUrl: newImageUrl,
          imagePublicId: newImagePublicId,
            ...(resolvedDate && {
              cloudinaryFolder: folderToUse,
              createdAt: resolvedDate.createdAt,
              ...(displayOrderInsertIndex != null && { displayOrder: displayOrderInsertIndex }),
              ...(resolvedDateIsMonthOnly !== null && { dateIsMonthOnly: resolvedDateIsMonthOnly }),
            }),
          ...(uploadedImages.length > 0 && {
            images: {
              create: uploadedImages.map((img, index) => ({
                imageUrl: img.secureUrl,
                imagePublicId: img.publicId,
                sortOrder: kept.length + index,
              })),
            },
          }),
          ...projectTagsUpdate,
        },
      });
    } else {
      // No image change: update text/featured/date only
      await prisma.project.update({
        where: { id },
        data: {
          title: titleTrimmed,
          description:
            typeof description === "string"
              ? (description.trim() || null)
              : existing.description,
          featured:
            typeof featured === "string"
              ? featured === "true"
              : existing.featured,
          ...(resolvedDate && {
            cloudinaryFolder: folderToUse,
            createdAt: resolvedDate.createdAt,
            ...(displayOrderInsertIndex != null && { displayOrder: displayOrderInsertIndex }),
            ...(resolvedDateIsMonthOnly !== null && { dateIsMonthOnly: resolvedDateIsMonthOnly }),
          }),
          ...projectTagsUpdate,
        },
      });
    }

    let updated = await prisma.project.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        projectTags: { include: { tag: { select: { name: true } } } },
      },
    });

    if (
      updated?.images &&
      updated.images.length > 0 &&
      typeof thumbnailIndexRaw === "string" &&
      /^\d+$/.test(thumbnailIndexRaw)
    ) {
      const idx = Math.min(
        Math.max(0, parseInt(thumbnailIndexRaw, 10)),
        updated.images.length - 1,
      );
      const img = updated.images[idx];
      if (img) {
        await prisma.project.update({
          where: { id },
          data: { imageUrl: img.imageUrl, imagePublicId: img.imagePublicId },
        });
        updated = await prisma.project.findUnique({
          where: { id },
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            projectTags: { include: { tag: { select: { name: true } } } },
          },
        });
      }
    }

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const { projectTags, ...rest } = updated;
    return NextResponse.json({ ...rest, tags: projectTags.map((pt) => pt.tag.name) });
  } catch {
    for (const publicId of newUploadedPublicIds) {
      try {
        await deleteImage(publicId);
      } catch {
        // ignore
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
  const adminResult = await verifyAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const publicIdsToDelete = new Set<string>(existing.images.map((i) => i.imagePublicId));
    if (existing.imagePublicId) publicIdsToDelete.add(existing.imagePublicId);
    for (const publicId of publicIdsToDelete) {
      try {
        await deleteImage(publicId);
      } catch {
        return NextResponse.json(
          { error: "Failed to delete project image" },
          { status: 500 },
        );
      }
    }

    if (existing.cloudinaryFolder) {
      try {
        await deleteFolder(existing.cloudinaryFolder);
      } catch (error) {
        console.error(
          "Failed to delete Cloudinary folder",
          existing.cloudinaryFolder,
          error,
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

