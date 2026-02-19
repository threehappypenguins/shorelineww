/**
 * @module api/projects/route
 * @description API routes for listing and creating projects.
 * Supports filtering, pagination, and both JSON and multipart/form-data uploads.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import {
  dateToFolderAndCreatedAt,
  deleteFolder,
  deleteResourcesByPrefix,
  generateProjectFolder,
  getImageUrl,
  getNextFolderForDatePrefix,
  parseFolderToCreatedAt,
  renameImage,
  setAssetFolder,
  toDisplayUrl,
  uploadImage,
  deleteImage,
} from "@/lib/cloudinary";
import { resolveTagNamesToIds } from "@/lib/tags";

/** Runtime configuration for this API route */
export const runtime = "nodejs";

/** Set of allowed MIME types for image uploads */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Maximum allowed image file size in bytes (10MB) */
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Calculate the display order for a new project based on its creation date.
 * Projects are listed by date (newest first), then by displayOrder within the same day.
 * @param createdAt - The creation date of the new project
 * @returns The next available displayOrder value for projects on that day
 */
async function getDisplayOrderForNewProject(createdAt: Date): Promise<number> {
  const startOfDay = new Date(createdAt);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const result = await prisma.project.aggregate({
    _max: { displayOrder: true },
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  });
  const maxOrder = result._max.displayOrder;
  return maxOrder == null ? 0 : maxOrder + 1;
}

/**
 * GET /api/projects
 *
 * Returns a list of projects, optionally filtered by `tag`, `featured`, and `year`.
 * @param req - The incoming request object
 * @returns JSON response with projects array or `{ projects, hasMore }` when paginated
 *
 * @example Query parameters:
 * - `tag`: Filter by tag name, or "None" for projects with no tags
 * - `featured`: Filter by featured status ("true" or "false")
 * - `year`: Filter by year (e.g., 2025)
 * - `limit`: Max number to return; when set, response is `{ projects, hasMore }`
 * - `offset`: Skip N projects (for pagination with limit)
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
      orderBy: [{ createdAt: "desc" }, { displayOrder: "asc" }],
      include: {
        projectTags: { include: { tag: { select: { name: true } } } },
        images: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
      },
      ...(limit != null && {
        take: limit + 1,
        skip: offset,
      }),
    });

    const serialized = projects.map((p) => ({
      ...p,
      imageUrl: p.imageUrl ? toDisplayUrl(p.imageUrl) : null,
      tags: p.projectTags.map((pt) => pt.tag.name),
      projectTags: undefined,
      images: p.images.map((img) => ({ imageUrl: toDisplayUrl(img.imageUrl) })),
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
 * Admin-only. Creates a new project.
 * @param req - The incoming request object
 * @returns JSON response with the created project (status 201) or error
 *
 * @example Accepts either:
 * - `application/json` with `{ title, description?, tags?, featured?, thumbnailIndex?, uploadedImages? }`
 *   (uploadedImages = pre-uploaded to Cloudinary from client)
 * - `multipart/form-data` with title and optional image files (server uploads to Cloudinary)
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

/**
 * Handle POST request with JSON body.
 * Creates a project using pre-uploaded Cloudinary images.
 * @param req - The incoming request object with JSON body
 * @returns JSON response with created project or error
 * @internal
 */
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

    const cloudinaryFolder =
      typeof cloudinaryFolderRaw === "string" && cloudinaryFolderRaw.trim().length > 0
        ? cloudinaryFolderRaw.trim()
        : null;

    // Explicit project date (e.g. user picked date after uploading) overrides folder-derived date.
    const yearParam = body?.projectDateYear;
    const monthParam = body?.projectDateMonth;
    const dayParam = body?.projectDateDay;
    const yearNum =
      typeof yearParam === "number"
        ? yearParam
        : typeof yearParam === "string"
          ? parseInt(yearParam.trim(), 10)
          : NaN;
    const monthNum =
      typeof monthParam === "number"
        ? monthParam
        : typeof monthParam === "string"
          ? parseInt(monthParam.trim(), 10)
          : NaN;
    const hasExplicitDate =
      !Number.isNaN(yearNum) &&
      !Number.isNaN(monthNum) &&
      yearNum >= 1970 &&
      monthNum >= 1 &&
      monthNum <= 12;
    const dayNum =
      typeof dayParam === "number"
        ? dayParam
        : typeof dayParam === "string" && dayParam.trim() !== ""
          ? parseInt(dayParam.trim(), 10)
          : 1;
    const validDay = !Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 31;

    let createdAt: Date | undefined;
    let dateIsMonthOnly: boolean | undefined;

    if (hasExplicitDate && validDay) {
      createdAt = new Date(Date.UTC(yearNum, monthNum - 1, dayNum, 12, 0, 0, 0));
      dateIsMonthOnly = body?.dateIsMonthOnly === true || body?.dateIsMonthOnly === "true";
    } else if (cloudinaryFolder != null) {
      createdAt = parseFolderToCreatedAt(cloudinaryFolder) ?? undefined;
      dateIsMonthOnly = body?.dateIsMonthOnly === true || body?.dateIsMonthOnly === "true";
    }

    // Only reject "date in the future" when the user explicitly chose a date. When createdAt
    // was derived from the upload folder, that folder was generated from upload time and can
    // be "tomorrow" in UTC (e.g. user in Atlantic late evening = next day UTC).
    if (createdAt && hasExplicitDate) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const chosenStart = new Date(createdAt);
      chosenStart.setHours(0, 0, 0, 0);
      if (chosenStart > todayStart) {
        return NextResponse.json(
          { error: "Project date cannot be in the future" },
          { status: 400 },
        );
      }
    }

    // When user picked a date after uploading, move images to a date-based folder in Cloudinary.
    let finalUploadedImages = uploadedImages;
    let finalCloudinaryFolder = cloudinaryFolder;
    let finalImageUrl = chosenImage?.secureUrl ?? null;
    let finalImagePublicId = chosenImage?.publicId ?? null;
    let oldFolderToDelete: string | null = null;

    if (
      hasExplicitDate &&
      validDay &&
      cloudinaryFolder != null &&
      cloudinaryFolder.trim() !== ""
    ) {
      const { prefix } = dateToFolderAndCreatedAt(yearNum, monthNum, dayNum);
      const existing = await prisma.project.findMany({
        where: { cloudinaryFolder: { startsWith: prefix } },
        select: { cloudinaryFolder: true },
      });
      const existingPaths = existing
        .map((p) => p.cloudinaryFolder)
        .filter((f): f is string => typeof f === "string" && f.length > 0);
      const targetFolder = getNextFolderForDatePrefix(prefix, existingPaths);
      const oldFolder = cloudinaryFolder.trim();

      if (targetFolder !== oldFolder) {
        const moved: { secureUrl: string; publicId: string }[] = [];
        try {
          for (const img of uploadedImages) {
            const suffix = img.publicId.startsWith(`${oldFolder}/`)
              ? img.publicId.slice(oldFolder.length + 1)
              : img.publicId.split("/").pop() ?? img.publicId;
            // Cloudinary public_id should not include file extension for images
            const suffixNoExt = suffix.includes(".")
              ? suffix.replace(/\.[a-zA-Z0-9]+$/, "")
              : suffix;
            const newPublicId = `${targetFolder}/${suffixNoExt}`;
            await renameImage(img.publicId, newPublicId);
            await setAssetFolder(newPublicId, targetFolder);
            moved.push({ publicId: newPublicId, secureUrl: getImageUrl(newPublicId) });
          }
          finalUploadedImages = moved;
          finalCloudinaryFolder = targetFolder;
          const chosenMoved = moved[thumbnailIndex] ?? moved[0] ?? null;
          finalImageUrl = chosenMoved?.secureUrl ?? null;
          finalImagePublicId = chosenMoved?.publicId ?? null;
          oldFolderToDelete = oldFolder;
        } catch (moveErr) {
          const message =
            moveErr instanceof Error ? moveErr.message : "Failed to move images to project date folder";
          console.error("Project create: move images to date folder failed", {
            oldFolder,
            targetFolder,
            error: moveErr,
          });
          return NextResponse.json(
            {
              error: "Failed to create project. Could not move images to the selected date folder.",
              details: message,
            },
            { status: 500 },
          );
        }
      }
    }

    const tagNames = Array.isArray(tagsRaw)
      ? tagsRaw.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean)
      : [];
    const tagIds = await resolveTagNamesToIds(tagNames);

    const createdAtForOrder = createdAt ?? new Date();
    const insertIndex = await getDisplayOrderForNewProject(createdAtForOrder);

    const project = await prisma.project.create({
      data: {
        title: titleTrimmed,
        description:
          description != null && typeof description === "string"
            ? description.trim() || null
            : null,
        featured: featured === true || featured === "true",
        displayOrder: insertIndex,
        imageUrl: finalImageUrl,
        imagePublicId: finalImagePublicId,
        cloudinaryFolder: finalCloudinaryFolder,
        ...(createdAt && { createdAt }),
        ...(dateIsMonthOnly !== undefined && { dateIsMonthOnly }),
        images: {
          create: finalUploadedImages.map((img, index) => ({
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

    if (oldFolderToDelete) {
      try {
        await deleteResourcesByPrefix(`${oldFolderToDelete}/`);
        await deleteFolder(oldFolderToDelete);
      } catch (err) {
        console.error("Failed to delete old Cloudinary folder after move:", oldFolderToDelete, err);
      }
    }

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

/**
 * Handle POST request with multipart/form-data.
 * Uploads images to Cloudinary server-side and creates the project.
 * @param req - The incoming request object with form data
 * @returns JSON response with created project or error
 * @internal
 */
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

    const createdAtForOrder = new Date();
    const insertIndex = await getDisplayOrderForNewProject(createdAtForOrder);

    const project = await prisma.project.create({
      data: {
        title: titleTrimmed,
        description:
          description && typeof description === "string"
            ? description.trim() || null
            : null,
        featured: typeof featured === "string" ? featured === "true" : false,
        displayOrder: insertIndex,
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

