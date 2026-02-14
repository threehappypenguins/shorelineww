import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import {
  DEFAULT_PROJECTS_FOLDER,
  dateToFolderAndCreatedAt,
  generateProjectFolder,
  getSignedUploadParams,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

const MIN_YEAR = 1970;
const MIN_MONTH = 1;
const MAX_MONTH = 12;

/**
 * Derive a Cloudinary folder path from a project's createdAt, for legacy projects
 * that have no cloudinaryFolder stored.
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

/** Parse HHmmss suffix to seconds since midnight. */
function suffixToSeconds(suffix: string): number {
  if (!/^\d{6}$/.test(suffix)) return 0;
  const h = parseInt(suffix.slice(0, 2), 10);
  const m = parseInt(suffix.slice(2, 4), 10);
  const s = parseInt(suffix.slice(4, 6), 10);
  return h * 3600 + m * 60 + s;
}

/** Seconds since midnight to HHmmss (pad to 6 digits). */
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

/**
 * GET /api/cloudinary-config
 *
 * Admin-only. Returns signed upload parameters for client-side uploads. The
 * browser uploads directly to Cloudinary with these params (and the file), so
 * the progress bar reflects real upload progress. Only your server can
 * generate valid signatures.
 *
 * Query params:
 * - projectId (optional): When editing an existing project, pass its ID so images
 *   are uploaded to that project's Cloudinary folder. Omit for new projects.
 * - year, month (required if date is used): Project date; folder = projects/YYYYMMDD-HHmmss (midnight by default; +1s if same day exists).
 * - day (optional): Day of month (default 1). Omit for "first of month".
 */
export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dayParam = searchParams.get("day");

    let folder: string;

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
      const existing = await prisma.project.findMany({
        where: { cloudinaryFolder: { startsWith: prefix } },
        select: { cloudinaryFolder: true },
      });
      let maxSeconds = 0;
      for (const p of existing) {
        const suffix = p.cloudinaryFolder?.slice(-6) ?? "";
        maxSeconds = Math.max(maxSeconds, suffixToSeconds(suffix));
      }
      const nextSeconds = maxSeconds + 1;
      folder = `${prefix}${secondsToSuffix(nextSeconds)}`;
    } else {
      folder = generateProjectFolder();
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
