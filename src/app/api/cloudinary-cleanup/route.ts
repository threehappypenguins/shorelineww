/**
 * @module api/cloudinary-cleanup/route
 * @description Admin-only API to delete orphaned project folders from Cloudinary.
 *
 * When users upload images for a new project but close the page without saving,
 * those images remain in Cloudinary. This endpoint finds project folders that
 * are not linked to any project in the database and deletes them (if their
 * oldest asset is older than 1 hour). Run periodically via cron or on-demand.
 *
 * Auth: Either (1) admin session cookie, or (2) Authorization: Bearer <CRON_SECRET>
 * for Vercel Cron and other external schedulers.
 *
 * @see docs/cloudinary-cleanup.md
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import {
  cleanupOrphanedProjectFolders,
  ORPHANED_FOLDER_AGE_MS,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

/** Check if request is authorized via Vercel Cron secret (Bearer token). */
function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  return token.length > 0 && token === secret;
}

/**
 * GET /api/cloudinary-cleanup
 *
 * Admin only (or valid CRON_SECRET Bearer token). Deletes Cloudinary project
 * folders that are not in the database and whose oldest asset is older than
 * 1 hour. Returns { deleted: string[] }.
 * Safe to call from Vercel Cron; set CRON_SECRET in Vercel env vars.
 */
export async function GET(request: Request) {
  const cronOk = isCronAuthorized(request);
  if (!cronOk) {
    const adminResult = await requireAdmin();
    if (!adminResult.ok) {
      return adminResult.response;
    }
  }

  try {
    const projects = await prisma.project.findMany({
      where: { cloudinaryFolder: { not: null } },
      select: { cloudinaryFolder: true },
    });
    const knownFolders = new Set(
      projects
        .map((p) => p.cloudinaryFolder)
        .filter((f): f is string => typeof f === "string" && f.trim() !== ""),
    );

    const deleted = await cleanupOrphanedProjectFolders(
      knownFolders,
      ORPHANED_FOLDER_AGE_MS,
    );

    return NextResponse.json({
      ok: true,
      deleted,
      message:
        deleted.length > 0
          ? `Deleted ${deleted.length} orphaned folder(s).`
          : "No orphaned folders to delete.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
