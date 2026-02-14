import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { uploadImage, deleteImage, generateProjectFolder } from "@/lib/cloudinary";
import { resolveTagNamesToIds } from "@/lib/tags";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/projects
 *
 * Returns a list of projects, optionally filtered by `tag`, `featured`, and `year`.
 * - tag: filter by tag name, or "None" for projects with no tags
 * - featured: filter by featured status
 * - year: filter by year (e.g. 2025)
 * - limit: max number to return; when set, response is { projects, hasMore }
 * - offset: skip N projects (for pagination with limit)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tagParam = searchParams.get("tag");
    const featuredParam = searchParams.get("featured");
    const yearParam = searchParams.get("year");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const where: {
      featured?: boolean;
      projectTags?:
        | { some: { tag: { name: { equals: string; mode: "insensitive" } } } }
        | { none: Record<string, never> };
      createdAt?: { gte: Date; lt: Date };
    } = {};

    if (tagParam && tagParam.trim()) {
      if (tagParam.trim().toLowerCase() === "none") {
        where.projectTags = { none: {} };
      } else {
        where.projectTags = {
          some: { tag: { name: { equals: tagParam.trim(), mode: "insensitive" } } },
        };
      }
    }

    if (featuredParam !== null && featuredParam !== "") {
      where.featured = featuredParam === "true";
    }

    if (yearParam && /^\d{4}$/.test(yearParam.trim())) {
      const year = parseInt(yearParam.trim(), 10);
      where.createdAt = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }

    const limit =
      limitParam && /^\d+$/.test(limitParam) ? Math.min(parseInt(limitParam, 10), 100) : null;
    const offset = offsetParam && /^\d+$/.test(offsetParam) ? parseInt(offsetParam, 10) : 0;

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: { projectTags: { include: { tag: { select: { name: true } } } } },
      ...(limit != null && {
        take: limit + 1,
        skip: offset,
      }),
    });

    const serialized = projects.map((p) => ({
      ...p,
      tags: p.projectTags.map((pt) => pt.tag.name),
      projectTags: undefined,
    }));

    if (limit != null) {
      const hasMore = serialized.length > limit;
      const slice = hasMore ? serialized.slice(0, limit) : serialized;
      return NextResponse.json({ projects: slice, hasMore });
    }

    return NextResponse.json(serialized);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects
 *
 * Admin-only. Creates a new project. Accepts either:
 * - application/json with { title, description?, tags?, featured?, thumbnailIndex?, uploadedImages? }
 *   (uploadedImages = pre-uploaded to Cloudinary from client; progress is shown during that upload).
 * - multipart/form-data with title and optional image files (server uploads to Cloudinary).
 */
export async function POST(req: Request) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (isJson) {
    return handlePostJson(req);
  }
  return handlePostFormData(req);
}

async function handlePostJson(req: Request) {
  try {
    const body = await req.json();
    const title = body?.title;
    const description = body?.description;
    const tagsRaw = body?.tags;
    const featured = body?.featured;
    const thumbnailIndexRaw = body?.thumbnailIndex;
    const uploadedImagesRaw = body?.uploadedImages;
    const cloudinaryFolderRaw = body?.cloudinaryFolder;

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

    const uploadedImages: { secureUrl: string; publicId: string }[] = [];
    if (Array.isArray(uploadedImagesRaw)) {
      for (const item of uploadedImagesRaw) {
        if (
          item &&
          typeof item.secureUrl === "string" &&
          typeof item.publicId === "string"
        ) {
          uploadedImages.push({
            secureUrl: item.secureUrl,
            publicId: item.publicId,
          });
        }
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 },
      );
    }

    const thumbnailIndex =
      typeof thumbnailIndexRaw === "number" && Number.isInteger(thumbnailIndexRaw)
        ? Math.min(
            Math.max(0, thumbnailIndexRaw),
            Math.max(0, uploadedImages.length - 1),
          )
        : typeof thumbnailIndexRaw === "string" && /^\d+$/.test(thumbnailIndexRaw)
          ? Math.min(
              Math.max(0, parseInt(thumbnailIndexRaw, 10)),
              Math.max(0, uploadedImages.length - 1),
            )
          : 0;
    const chosenImage = uploadedImages[thumbnailIndex] ?? uploadedImages[0] ?? null;
    const imageUrl = chosenImage?.secureUrl ?? null;
    const imagePublicId = chosenImage?.publicId ?? null;

    const cloudinaryFolder =
      typeof cloudinaryFolderRaw === "string" && cloudinaryFolderRaw.trim().length > 0
        ? cloudinaryFolderRaw.trim()
        : null;

    const tagNames = Array.isArray(tagsRaw)
      ? tagsRaw.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean)
      : [];
    const tagIds = await resolveTagNamesToIds(tagNames);

    // New projects appear first on /projects: set displayOrder 0 and shift others down
    await prisma.project.updateMany({ data: { displayOrder: { increment: 1 } } });

    const project = await prisma.project.create({
      data: {
        title: titleTrimmed,
        description:
          description != null && typeof description === "string"
            ? description.trim() || null
            : null,
        featured: featured === true || featured === "true",
        displayOrder: 0,
        imageUrl,
        imagePublicId,
        cloudinaryFolder,
        images: {
          create: uploadedImages.map((img, index) => ({
            imageUrl: img.secureUrl,
            imagePublicId: img.publicId,
            sortOrder: index,
          })),
        },
        ...(tagIds.length > 0 && {
          projectTags: { create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        projectTags: { include: { tag: { select: { name: true } } } },
      },
    });

    const { projectTags, ...rest } = project;
    return NextResponse.json(
      { ...rest, tags: projectTags.map((pt) => pt.tag.name) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

async function handlePostFormData(req: Request) {
  const uploadedPublicIds: string[] = [];

  try {
    const formData = await req.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const tagsRaw = formData.get("tags");
    const featured = formData.get("featured");
    const thumbnailIndexRaw = formData.get("thumbnailIndex");
    const imageEntries = formData.getAll("image");

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

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 },
      );
    }

    const cloudinaryFolder = generateProjectFolder();
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
      const uploaded = await uploadImage(buffer, { folder: cloudinaryFolder });
      uploadedPublicIds.push(uploaded.publicId);
      uploadedImages.push({ secureUrl: uploaded.secureUrl, publicId: uploaded.publicId });
    }

    const thumbnailIndex =
      typeof thumbnailIndexRaw === "string" && /^\d+$/.test(thumbnailIndexRaw)
        ? Math.min(
            Math.max(0, parseInt(thumbnailIndexRaw, 10)),
            Math.max(0, uploadedImages.length - 1),
          )
        : 0;
    const chosenImage = uploadedImages[thumbnailIndex] ?? uploadedImages[0] ?? null;
    const imageUrl = chosenImage?.secureUrl ?? null;
    const imagePublicId = chosenImage?.publicId ?? null;

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

    // New projects appear first on /projects: set displayOrder 0 and shift others down
    await prisma.project.updateMany({ data: { displayOrder: { increment: 1 } } });

    const project = await prisma.project.create({
      data: {
        title: titleTrimmed,
        description:
          description && typeof description === "string"
            ? description.trim() || null
            : null,
        featured: typeof featured === "string" ? featured === "true" : false,
        displayOrder: 0,
        imageUrl,
        imagePublicId,
        cloudinaryFolder,
        images: {
          create: uploadedImages.map((img, index) => ({
            imageUrl: img.secureUrl,
            imagePublicId: img.publicId,
            sortOrder: index,
          })),
        },
        ...(tagIds.length > 0 && {
          projectTags: { create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        projectTags: { include: { tag: { select: { name: true } } } },
      },
    });

    const { projectTags, ...rest } = project;
    return NextResponse.json(
      { ...rest, tags: projectTags.map((pt) => pt.tag.name) },
      { status: 201 }
    );
  } catch {
    for (const publicId of uploadedPublicIds) {
      try {
        await deleteImage(publicId);
      } catch {
        // best-effort cleanup
      }
    }
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

