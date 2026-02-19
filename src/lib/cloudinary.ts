/**
 * @module lib/cloudinary
 * @description Cloudinary integration utilities for image upload, deletion, and URL generation.
 * Provides functions for managing project images in Cloudinary storage.
 */
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with secure URLs
// Credentials are read from process.env.CLOUDINARY_URL by default
cloudinary.config({
  secure: true,
});

/**
 * Parameters for a single client-side signed upload.
 * The client sends these (plus the file) to Cloudinary.
 * Only your server can generate valid signatures.
 */
export interface SignedUploadParams {
  /** Cloudinary cloud name */
  cloudName: string;
  /** Cloudinary API key */
  apiKey: string;
  /** Unix timestamp when signature was generated */
  timestamp: number;
  /** Cryptographic signature for upload authorization */
  signature: string;
  /** Target folder path in Cloudinary */
  folder: string;
}

/** Default Cloudinary folder when no project-specific folder is used. */
export const DEFAULT_PROJECTS_FOLDER = "projects";

/**
 * Generate a unique Cloudinary folder path for a new project, based on creation date/time.
 * @returns Folder path in format `projects/YYYYMMDD-HHmmss` (e.g., `projects/20260213-214530`)
 */
export function generateProjectFolder(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${DEFAULT_PROJECTS_FOLDER}/${y}${m}${d}-${h}${min}${s}`;
}

/**
 * Result of converting a project date (year/month/day) to folder and createdAt.
 */
export interface ProjectDateFolderResult {
  /** Folder path for this date with time 00:00:00, e.g. `projects/20250201-000000` */
  folderBase: string;
  /** Prefix to match existing folders for same day, e.g. `projects/20250201-` */
  prefix: string;
  /** Date at noon UTC for the chosen day so the calendar date displays correctly in all timezones */
  createdAt: Date;
}

/**
 * Convert year/month/day to Cloudinary folder base and createdAt.
 * Day defaults to 1 (first of month). createdAt is stored as noon UTC so the
 * calendar date displays correctly in all timezones (midnight UTC would show
 * as the previous day in timezones behind UTC).
 *
 * @param year - The year component (e.g., 2026)
 * @param month - The month component (1-12)
 * @param day - Optional day component (1-31), defaults to 1
 * @returns Object with folder base, prefix, and createdAt date
 */
export function dateToFolderAndCreatedAt(
  year: number,
  month: number,
  day?: number,
): ProjectDateFolderResult {
  const d = day ?? 1;
  const date = new Date(Date.UTC(year, month - 1, d, 12, 0, 0, 0));
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const dayStr = String(d).padStart(2, "0");
  const prefix = `${DEFAULT_PROJECTS_FOLDER}/${y}${m}${dayStr}-`;
  const folderBase = `${prefix}000000`;
  return { folderBase, prefix, createdAt: date };
}

/**
 * Format a Date as a Cloudinary folder path.
 * @param date - The date to format
 * @returns Folder path in format `projects/YYYYMMDD-HHmmss`
 */
export function dateToFolderString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${DEFAULT_PROJECTS_FOLDER}/${y}${m}${d}-${h}${min}${s}`;
}

/**
 * Parse HHmmss suffix (6 digits) to seconds since midnight.
 * Used to compute the next available folder in a date prefix.
 */
export function suffixToSeconds(suffix: string): number {
  if (!/^\d{6}$/.test(suffix)) return 0;
  const h = parseInt(suffix.slice(0, 2), 10);
  const m = parseInt(suffix.slice(2, 4), 10);
  const s = parseInt(suffix.slice(4, 6), 10);
  return h * 3600 + m * 60 + s;
}

/**
 * Convert seconds since midnight to HHmmss format (6 digits).
 */
export function secondsToSuffix(seconds: number): string {
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
 * Compute the next available folder path for a date prefix given existing folder paths.
 * Used when moving uploads to a date-based folder (e.g. user picked date after uploading).
 * @param prefix - Prefix from dateToFolderAndCreatedAt (e.g. "projects/20260101-")
 * @param existingFolderPaths - Full folder paths that start with the prefix
 * @returns Next folder path (e.g. "projects/20260101-000001")
 */
export function getNextFolderForDatePrefix(
  prefix: string,
  existingFolderPaths: string[],
): string {
  let maxSeconds = 0;
  for (const path of existingFolderPaths) {
    if (!path?.startsWith(prefix)) continue;
    const suffix = path.slice(prefix.length).slice(0, 6);
    maxSeconds = Math.max(maxSeconds, suffixToSeconds(suffix));
  }
  return `${prefix}${secondsToSuffix(maxSeconds + 1)}`;
}

/**
 * Parse a Cloudinary folder path to a Date.
 * Uses noon UTC for the calendar date so display is correct in all timezones;
 * adds the folder's HHmmss suffix as seconds for ordering.
 * @param folder - Folder path (e.g., `projects/20250201-000001`)
 * @returns Parsed Date object, or `null` if the format is invalid
 */
export function parseFolderToCreatedAt(folder: string | null | undefined): Date | null {
  if (!folder || typeof folder !== "string") return null;
  const match = folder.trim().match(/^projects\/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  const year = parseInt(y!, 10);
  const month = parseInt(m!, 10) - 1;
  const day = parseInt(d!, 10);
  const suffix = `${h}${min}${s}`;
  const secs = suffixToSeconds(suffix);
  const noonUtc = Date.UTC(year, month, day, 12, 0, 0, 0);
  const date = new Date(noonUtc + secs * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Generate signed upload parameters for client-side uploads.
 * The client uses these with the file in a POST to Cloudinary.
 * The signature proves the upload was authorized by your server.
 * Safe to call per batch of uploads (same params can be used for multiple files within a short period).
 *
 * @param folder - Optional Cloudinary folder path. Defaults to "projects"
 * @returns Signed upload parameters for client-side use
 * @throws Error if Cloudinary is not configured
 */
export function getSignedUploadParams(folder?: string): SignedUploadParams {
  const config = cloudinary.config();
  const cloudName = config?.cloud_name;
  const apiKey = config?.api_key;
  const apiSecret = config?.api_secret;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_URL)");
  }
  const targetFolder = folder ?? DEFAULT_PROJECTS_FOLDER;
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder: targetFolder, timestamp };
  const signature = (cloudinary.utils as { api_sign_request: (params: Record<string, unknown>, secret: string) => string }).api_sign_request(
    paramsToSign,
    apiSecret,
  );
  return { cloudName, apiKey, timestamp, signature, folder: targetFolder };
}

/**
 * Normalized result of an image upload to Cloudinary.
 */
export interface UploadResult {
  /** Cloudinary public ID for the uploaded asset */
  publicId: string;
  /** HTTPS URL to access the image */
  secureUrl: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Image format (e.g., "jpg", "png", "webp") */
  format: string;
}

/**
 * Options for image upload operations.
 */
type UploadOptions = {
  /** Optional Cloudinary transformation options applied during upload */
  transformation?: object;
  /** Optional explicit public ID for the asset; otherwise Cloudinary generates one */
  publicId?: string;
  /** Optional Cloudinary folder name; defaults to "projects" */
  folder?: string;
};

/** @internal Default folder when none provided. */
const DEFAULT_UPLOAD_FOLDER = DEFAULT_PROJECTS_FOLDER;

/**
 * Upload an image to Cloudinary.
 * Accepts either a base64/data-URI or URL (`string`) or a `Buffer` and returns
 * normalized upload metadata.
 *
 * @param file - Image data as string (URL or base64) or Buffer
 * @param options - Upload options (transformation, publicId, folder)
 * @returns Upload result with public ID, URL, and dimensions
 * @throws Error on upload failure
 */
export async function uploadImage(
  file: string | Buffer,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { transformation, publicId, folder = DEFAULT_UPLOAD_FOLDER } = options;

  if (typeof file === "string") {
    try {
      // Cloudinary supports regular URLs and base64 data URIs as the `file` argument.
      const result = await cloudinary.uploader.upload(file, {
        folder,
        public_id: publicId,
        transformation,
        resource_type: "image",
      });

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width ?? 0,
        height: result.height ?? 0,
        format: result.format ?? "",
      };
    } catch (error) {
      console.error("Failed to upload image to Cloudinary (string source)", error);
      throw new Error("Failed to upload image to Cloudinary");
    }
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        transformation,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          console.error(
            "Failed to upload image to Cloudinary (buffer source)",
            error,
          );
          return reject(
            error ?? new Error("Failed to upload image to Cloudinary"),
          );
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          width: result.width ?? 0,
          height: result.height ?? 0,
          format: result.format ?? "",
        });
      },
    );

    uploadStream.end(file);
  });
}

/**
 * Rename (move) an image in Cloudinary to a new public ID (e.g. new folder path).
 * Use when moving project images to a date-based folder after the user picks a date.
 *
 * @param fromPublicId - Current public ID (e.g. projects/20260218-174333/abc)
 * @param toPublicId - New public ID (e.g. projects/20260101-000001/abc)
 */
export async function renameImage(
  fromPublicId: string,
  toPublicId: string,
): Promise<void> {
  if (!fromPublicId || !toPublicId || fromPublicId === toPublicId) return;
  await cloudinary.uploader.rename(fromPublicId, toPublicId, {
    resource_type: "image",
  });
}

/**
 * Delete an image from Cloudinary by its public ID.
 * No-op when `publicId` is falsy.
 *
 * @param publicId - The Cloudinary public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

/**
 * Set the asset_folder of a resource (dynamic folder mode only).
 * Use after renaming so the Media Library shows the asset in the new folder.
 * No-op if the API doesn't support it (e.g. fixed folder mode).
 *
 * @param publicId - The resource's public_id (after rename)
 * @param assetFolder - The folder path for the Console UI (e.g. projects/20260101-000001)
 */
export async function setAssetFolder(
  publicId: string,
  assetFolder: string,
): Promise<void> {
  if (!publicId || !assetFolder?.trim()) return;
  try {
    await cloudinary.api.update(publicId, {
      resource_type: "image",
      asset_folder: assetFolder.trim(),
    });
  } catch {
    // Ignore: fixed folder mode or API may not support asset_folder
  }
}

/**
 * Delete an empty folder from Cloudinary.
 * The folder must not contain any assets (or call deleteResourcesByPrefix first).
 * No-op when `folder` is falsy or equals the root projects folder ("projects").
 *
 * In dynamic folder mode, folders may not exist as deletable paths (404) or may
 * report "not empty" after assets were moved by public_id. This function treats
 * 404 and 400 "Folder is not empty" as non-fatal and resolves without throwing.
 *
 * @param folder - Full folder path (e.g., `projects/20260213-120000`)
 */
export async function deleteFolder(folder: string | null | undefined): Promise<void> {
  if (!folder || !folder.trim()) return;
  const trimmed = folder.trim();
  if (trimmed === DEFAULT_PROJECTS_FOLDER) return;

  try {
    await cloudinary.api.delete_folder(trimmed);
  } catch (err: unknown) {
    const errObj = err && typeof err === "object" ? err as Record<string, unknown> : null;
    const inner = errObj?.error && typeof errObj.error === "object" ? errObj.error as Record<string, unknown> : errObj;
    const msg = typeof inner?.message === "string" ? inner.message : String(err);
    const code = typeof inner?.http_code === "number" ? inner.http_code : undefined;
    if (code === 404 || code === 400 || /can't find folder|folder is not empty/i.test(msg)) {
      return;
    }
    throw err;
  }
}

/**
 * List all image resources under a prefix (e.g. "projects/"). Paginates through results.
 * Used by cleanup to find orphaned project folders.
 *
 * @param prefix - Prefix (folder path) to list, e.g. "projects/"
 * @returns Array of { public_id, created_at } (created_at is ISO string from Cloudinary)
 */
export async function listResourcesByPrefix(prefix: string): Promise<{ public_id: string; created_at: string }[]> {
  const results: { public_id: string; created_at: string }[] = [];
  let nextCursor: string | undefined;
  do {
    const opts: { prefix: string; max_results: number; type: string; next_cursor?: string } = {
      prefix,
      max_results: 500,
      type: "upload",
    };
    if (nextCursor) opts.next_cursor = nextCursor;
    const resp = (await cloudinary.api.resources(opts)) as {
      resources?: { public_id: string; created_at?: string }[];
      next_cursor?: string;
    };
    const list = resp.resources ?? [];
    for (const r of list) {
      results.push({ public_id: r.public_id, created_at: r.created_at ?? "" });
    }
    nextCursor = resp.next_cursor;
  } while (nextCursor);
  return results;
}

/**
 * Delete all image resources whose public_id starts with the given prefix.
 * Use a trailing slash for a folder, e.g. "projects/20260217-143022/".
 *
 * @param prefix - Prefix (folder path with trailing slash) to delete
 */
export async function deleteResourcesByPrefix(prefix: string): Promise<void> {
  if (!prefix || !prefix.trim()) return;
  const trimmed = prefix.trim();
  await cloudinary.api.delete_resources_by_prefix(trimmed, { resource_type: "image" });
}

/** Default age threshold for orphaned folder cleanup: 1 hour (ms). */
export const ORPHANED_FOLDER_AGE_MS = 60 * 60 * 1000;

/**
 * Find project folders in Cloudinary that are not in the known set and whose
 * oldest asset is older than the given threshold. Used to clean up abandoned uploads
 * (e.g. user closed the page before creating the project).
 *
 * @param knownFolders - Set of folder paths that belong to existing projects (from DB)
 * @param olderThanMs - Only consider folders whose oldest asset is older than this (ms ago)
 * @returns Array of folder paths to delete
 */
export async function findOrphanedProjectFolders(
  knownFolders: Set<string>,
  olderThanMs: number = ORPHANED_FOLDER_AGE_MS,
): Promise<string[]> {
  const resources = await listResourcesByPrefix(`${DEFAULT_PROJECTS_FOLDER}/`);
  const folderToOldest: Record<string, number> = {};
  const cutoff = Date.now() - olderThanMs;
  for (const r of resources) {
    const idx = r.public_id.lastIndexOf("/");
    const folder = idx > 0 ? r.public_id.slice(0, idx) : r.public_id;
    if (!folder.startsWith(DEFAULT_PROJECTS_FOLDER + "/")) continue;
    const created = r.created_at ? new Date(r.created_at).getTime() : 0;
    if (folderToOldest[folder] == null || created < folderToOldest[folder]) {
      folderToOldest[folder] = created;
    }
  }
  const orphaned: string[] = [];
  for (const [folder, oldest] of Object.entries(folderToOldest)) {
    if (knownFolders.has(folder)) continue;
    if (oldest > 0 && oldest < cutoff) orphaned.push(folder);
  }
  return orphaned;
}

/**
 * Delete orphaned project folders from Cloudinary (contents first, then folder).
 * Call this periodically (e.g. cron or on-demand) to remove abandoned uploads.
 *
 * @param knownFolders - Set of folder paths that belong to existing projects
 * @param olderThanMs - Only delete folders whose oldest asset is older than this
 * @returns List of folder paths that were deleted
 */
export async function cleanupOrphanedProjectFolders(
  knownFolders: Set<string>,
  olderThanMs: number = ORPHANED_FOLDER_AGE_MS,
): Promise<string[]> {
  const toDelete = await findOrphanedProjectFolders(knownFolders, olderThanMs);
  const deleted: string[] = [];
  for (const folder of toDelete) {
    try {
      await deleteResourcesByPrefix(`${folder}/`);
      await deleteFolder(folder);
      deleted.push(folder);
    } catch (err) {
      console.error(`Cloudinary cleanup: failed to delete folder ${folder}`, err);
    }
  }
  return deleted;
}

/**
 * Replace a project's image in Cloudinary.
 * Best-effort deletes the existing image (if any) and uploads a new one.
 *
 * @param oldPublicId - Public ID of the existing image to delete (can be null)
 * @param fileBuffer - Buffer containing the new image data
 * @param options - Upload options (transformation, folder)
 * @returns Upload result for the new image
 */
export async function replaceProjectImage(
  oldPublicId: string | null | undefined,
  fileBuffer: Buffer,
  options: Omit<UploadOptions, "publicId"> = {},
): Promise<UploadResult> {
  // First upload the new image so we always have a valid asset to point to.
  const uploaded = await uploadImage(fileBuffer, options);

  // Best-effort delete of the old image; failures are logged but do not affect the result.
  if (oldPublicId) {
    try {
      await deleteImage(oldPublicId);
    } catch (error) {
      console.error("Failed to delete old Cloudinary image", error);
    }
  }

  return uploaded;
}

/** Regex pattern matching valid CLOUDINARY_URL format */
const CLOUDINARY_URL_REGEX = /^cloudinary:\/\/[^:]+:[^@]+@([a-zA-Z0-9_-]+)$/;

/**
 * Ensure `CLOUDINARY_URL` is set and has a valid format before generating URLs.
 * @throws Error if CLOUDINARY_URL is missing or has invalid format
 * @internal
 */
function assertCloudinaryUrlConfigured(): void {
  const url = process.env.CLOUDINARY_URL;
  if (!url || url.trim() === "") {
    throw new Error("CLOUDINARY_URL is not set");
  }
  if (!CLOUDINARY_URL_REGEX.test(url.trim())) {
    throw new Error(
      "CLOUDINARY_URL has invalid format; expected cloudinary://API_KEY:API_SECRET@CLOUD_NAME",
    );
  }
}

/**
 * Get Cloudinary cloud name from CLOUDINARY_URL.
 * @internal
 */
function getCloudName(): string {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (!url) throw new Error("CLOUDINARY_URL is not set");
  const match = url.match(CLOUDINARY_URL_REGEX);
  if (!match) throw new Error("CLOUDINARY_URL has invalid format");
  return match[1];
}

/** Max width for hero/landing images to avoid loading full-resolution phone photos (saves memory and bandwidth). */
const HERO_IMAGE_MAX_WIDTH = 1920;

/**
 * Build an HTTPS URL for an image by public ID.
 * Uses f_auto so HEIC and other formats are delivered as browser-compatible (e.g. JPEG/WebP).
 * Fixes broken images when users upload HEIC from iPhone.
 *
 * @param publicId - The Cloudinary public ID (e.g. "landing/xyz" or "folder/id")
 * @returns Full HTTPS URL to the image (transformed for display)
 */
export function getImageUrl(publicId: string): string {
  const cloudName = getCloudName();
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto/${publicId}`;
}

/**
 * Build an HTTPS URL for the landing hero image with a max width so the browser
 * never loads full-resolution phone photos (e.g. 12MP). Avoids high memory use and near-crash on refresh.
 *
 * @param publicId - The Cloudinary public ID (e.g. "landing/xyz")
 * @returns Full HTTPS URL with w_1920,c_fill,f_auto
 */
export function getHeroImageUrl(publicId: string): string {
  const cloudName = getCloudName();
  const transformation = `w_${HERO_IMAGE_MAX_WIDTH},c_fill,f_auto`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
}

/**
 * Convert a Cloudinary image URL to a display URL that uses f_auto,
 * so HEIC and other formats are delivered as browser-compatible (e.g. JPEG/WebP).
 * Use when returning image URLs to the client (e.g. project images).
 * Idempotent: if the URL already contains f_auto, returns it unchanged.
 *
 * @param url - Full Cloudinary image URL (e.g. from upload response or DB)
 * @returns URL that will display in all browsers
 */
export function toDisplayUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (url.includes("/f_auto/")) return url;
  return url.replace("/image/upload/", "/image/upload/f_auto/");
}

/**
 * Options for generating optimized Cloudinary image URLs.
 */
type OptimizeOptions = {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Cloudinary crop mode (e.g., "fill", "fit") */
  crop?: string;
  /** Quality setting (e.g., "auto" or a numeric value) */
  quality?: string | number;
  /** Output format (e.g., "webp", "jpg") */
  format?: string;
};

/**
 * Generate a secure, optimized Cloudinary URL for a given public ID.
 * Applies basic transformation options (width, height, crop, quality, format)
 * and always returns an HTTPS URL.
 *
 * @param publicId - The Cloudinary public ID of the image
 * @param options - Optimization options (dimensions, crop, quality, format)
 * @returns Optimized HTTPS URL for the image
 * @throws Error if Cloudinary is not configured
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: OptimizeOptions = {},
): string {
  assertCloudinaryUrlConfigured();

  const { width, height, crop, quality, format } = options;

  const transformation: Record<string, unknown> = {};

  if (width !== undefined) transformation.width = width;
  if (height !== undefined) transformation.height = height;
  if (crop !== undefined) transformation.crop = crop;
  if (quality !== undefined) transformation.quality = quality;
  if (format !== undefined) transformation.fetch_format = format;

  const hasTransformation = Object.keys(transformation).length > 0;

  return cloudinary.url(publicId, {
    secure: true,
    transformation: hasTransformation ? [transformation] : undefined,
  });
}

