/**
 * @module api/cloudinary-config/route
 * @description API route for generating signed Cloudinary upload parameters.
 * Enables secure client-side uploads with progress tracking.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import {
  DEFAULT_PROJECTS_FOLDER,
  dateToFolderAndCreatedAt,
  generateProjectFolder,
  getNextFolderForDatePrefix,
  getSignedUploadParams,
} from "@/lib/cloudinary";

/** Runtime configuration for this API route */
export const runtime = "nodejs";

/** Minimum valid year for project dates */
const MIN_YEAR = 1970;
/** Minimum valid month (January) */
const MIN_MONTH = 1;
/** Maximum valid month (December) */
const MAX_MONTH = 12;

/**
 * Derive a Cloudinary folder path from a project's createdAt, for legacy projects
 * that have no cloudinaryFolder stored.
 * @param createdAt - The project's creation date
 * @returns The Cloudinary folder path in format `projects/YYYYMMDD-HHmmss`
 */
function folderFromCreatedAt(createdAt: Date): string {
  const d = new Date(createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${DEFAULT_PROJECTS_FOLDER}/${y}${m}${day}-${h}${min}${s}`;
}

/**
 * GET /api/cloudinary-config
 *
 * Admin-only. Returns signed upload parameters for client-side uploads. The
 * browser uploads directly to Cloudinary with these params (and the file), so
 * the progress bar reflects real upload progress. Only your server can
 * generate valid signatures.
 *
 * @param req - The incoming Next.js request object
 * @returns JSON response with signed upload parameters or error
 *
 * @example Query params:
 * - `projectId` (optional): When editing an existing project, pass its ID so images
 *   are uploaded to that project's Cloudinary folder. Omit for new projects.
 * - `folder` (optional): Reuse an existing folder path (e.g. from a prior config response).
 *   Use when adding more images in the same create session so all uploads go to one folder.
 *   Must match projects/YYYYMMDD-HHmmss or projects/YYYYMMDD-HHmmss-N.
 * - `year`, `month` (required if date is used): Project date; folder = projects/YYYYMMDD-HHmmss
 * - `day` (optional): Day of month (default 1). Omit for "first of month".
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const purpose = searchParams.get("purpose");
    const existingFolderParam = searchParams.get("folder");
    const projectId = searchParams.get("projectId");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dayParam = searchParams.get("day");

    let folder: string;

    // Reuse existing folder (e.g. "Add more images" in create flow so all uploads go to same folder)
    if (
      existingFolderParam != null &&
      existingFolderParam.trim() !== "" &&
      /^projects\/\d{8}-\d{6}(-\d+)?$/.test(existingFolderParam.trim())
    ) {
      folder = existingFolderParam.trim();
      const params = getSignedUploadParams(folder);
      return NextResponse.json(params);
    }

    if (purpose === "landing") {
      folder = "landing";
      const params = getSignedUploadParams(folder);
      return NextResponse.json(params);
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { cloudinaryFolder: true, createdAt: true },
      });
      if (project?.cloudinaryFolder) {
        folder = project.cloudinaryFolder;
      } else if (project) {
        folder = folderFromCreatedAt(project.createdAt);
      } else {
        folder = generateProjectFolder();
      }
    } else if (
      yearParam != null &&
      yearParam !== "" &&
      monthParam != null &&
      monthParam !== ""
    ) {
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);
      const day =
        dayParam != null && dayParam !== "" ? parseInt(dayParam, 10) : undefined;
      if (
        Number.isNaN(year) ||
        year < MIN_YEAR ||
        Number.isNaN(month) ||
        month < MIN_MONTH ||
        month > MAX_MONTH ||
        (day !== undefined && (Number.isNaN(day) || day < 1 || day > 31))
      ) {
        return NextResponse.json(
          { error: "Invalid date: year (min 1970), month (1-12), optional day (1-31)" },
          { status: 400 },
        );
      }
      const chosenDay = day ?? 1;
      const chosenDate = new Date(year, month - 1, chosenDay, 0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (chosenDate > todayStart) {
        return NextResponse.json(
          { error: "Project date cannot be in the future" },
          { status: 400 },
        );
      }
      const { prefix } = dateToFolderAndCreatedAt(year, month, day);
      // Ensure uniqueness: concurrent requests with same date could otherwise get the same folder.
      let folderCandidate: string;
      do {
        const existing = await prisma.project.findMany({
          where: { cloudinaryFolder: { startsWith: prefix } },
          select: { cloudinaryFolder: true },
        });
        const existingPaths = existing
          .map((p) => p.cloudinaryFolder)
          .filter((f): f is string => typeof f === "string" && f.length > 0);
        folderCandidate = getNextFolderForDatePrefix(prefix, existingPaths);
        const collision = await prisma.project.findFirst({
          where: { cloudinaryFolder: folderCandidate },
          select: { id: true },
        });
        if (!collision) break;
      } while (true);
      folder = folderCandidate;
    } else {
      folder = generateProjectFolder();
      // Ensure uniqueness: same-second requests would otherwise get the same folder.
      let candidate = folder;
      let suffix = 2;
      while (true) {
        const existing = await prisma.project.findFirst({
          where: { cloudinaryFolder: candidate },
          select: { id: true },
        });
        if (!existing) break;
        candidate = `${folder}-${suffix}`;
        suffix += 1;
      }
      folder = candidate;
    }

    const params = getSignedUploadParams(folder);
    return NextResponse.json(params);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cloudinary not configured";
    return NextResponse.json(
      { error: message },
      { status: 503 },
    );
  }
}
