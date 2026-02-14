import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  secure: true,
  // Credentials are read from process.env.CLOUDINARY_URL by default
});

/**
 * Parameters for a single client-side signed upload. The client sends these
 * (plus the file) to Cloudinary; only your server can generate valid signatures.
 */
export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** Default Cloudinary folder when no project-specific folder is used. */
export const DEFAULT_PROJECTS_FOLDER = "projects";

/**
 * Generate a unique Cloudinary folder path for a new project, based on creation date/time.
 * Format: projects/YYYYMMDD-HHmmss (e.g., projects/20260213-214530).
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

/** Result of converting a project date (year/month/day) to folder and createdAt. */
export interface ProjectDateFolderResult {
  /** Folder path for this date with time 00:00:00, e.g. projects/20250201-000000 */
  folderBase: string;
  /** Prefix to match existing folders for same day, e.g. projects/20250201- */
  prefix: string;
  /** Date at midnight (00:00:00) for the chosen day (day defaults to 1). */
  createdAt: Date;
}

/**
 * Convert year/month/day to Cloudinary folder base and createdAt.
 * Day defaults to 1 (first of month). Time is midnight (00:00:00).
 * Used with resolveProjectFolderUniqueness to get a unique folder when multiple
 * projects share the same year+month (no day) → same day 1, seconds incremented.
 */
export function dateToFolderAndCreatedAt(
  year: number,
  month: number,
  day?: number,
): ProjectDateFolderResult {
  const d = day ?? 1;
  const date = new Date(year, month - 1, d, 0, 0, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  const prefix = `${DEFAULT_PROJECTS_FOLDER}/${y}${m}${dayStr}-`;
  const folderBase = `${prefix}000000`;
  return { folderBase, prefix, createdAt: date };
}

/**
 * Format a Date as a Cloudinary folder path (projects/YYYYMMDD-HHmmss).
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
 * Parse a Cloudinary folder path (e.g. projects/20250201-000001) to a Date.
 * Returns null if the format is invalid.
 */
export function parseFolderToCreatedAt(folder: string | null | undefined): Date | null {
  if (!folder || typeof folder !== "string") return null;
  const match = folder.trim().match(/^projects\/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  const date = new Date(
    parseInt(y!, 10),
    parseInt(m!, 10) - 1,
    parseInt(d!, 10),
    parseInt(h!, 10),
    parseInt(min!, 10),
    parseInt(s!, 10),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Generate signed upload parameters for client-side uploads. The client uses
 * these with the file in a POST to Cloudinary; the signature proves the upload
 * was authorized by your server. Safe to call per batch of uploads (same params
 * can be used for multiple files within a short period).
 *
 * @param folder - Optional Cloudinary folder path. Defaults to "projects".
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
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
}

type UploadOptions = {
  /**
   * Optional Cloudinary transformation options applied during upload.
   */
  transformation?: object;
  /**
   * Optional explicit public ID for the asset; otherwise Cloudinary generates one.
   */
  publicId?: string;
  /**
   * Optional Cloudinary folder name; defaults to `"projects"`.
   */
  folder?: string;
};

/** @internal Default folder when none provided. */
const DEFAULT_UPLOAD_FOLDER = DEFAULT_PROJECTS_FOLDER;

/**
 * Upload an image to Cloudinary.
 *
 * Accepts either a base64/data-URI or URL (`string`) or a `Buffer` and returns
 * normalized upload metadata. Throws on upload failure.
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
 * Delete an image from Cloudinary by its public ID.
 *
 * No-op when `publicId` is falsy.
 */
export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

/**
 * Delete an empty folder from Cloudinary. The folder must not contain any assets.
 * No-op when `folder` is falsy or equals the root projects folder ("projects").
 *
 * @param folder - Full folder path (e.g. "projects/20260213-120000")
 */
export async function deleteFolder(folder: string | null | undefined): Promise<void> {
  if (!folder || !folder.trim()) return;
  const trimmed = folder.trim();
  if (trimmed === DEFAULT_PROJECTS_FOLDER) return;

  await cloudinary.api.delete_folder(trimmed);
}

/**
 * Replace a project's image in Cloudinary.
 *
 * Best-effort deletes the existing image (if any) and uploads a new one, returning
 * the new upload metadata.
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

/** Matches `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`. */
const CLOUDINARY_URL_REGEX = /^cloudinary:\/\/[^:]+:[^@]+@[a-zA-Z0-9_-]+$/;

/**
 * Ensure `CLOUDINARY_URL` is set and has a valid format before generating URLs.
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

type OptimizeOptions = {
  /** Optional target width in pixels. */
  width?: number;
  /** Optional target height in pixels. */
  height?: number;
  /** Optional Cloudinary crop mode (e.g. `"fill"`, `"fit"`). */
  crop?: string;
  /** Optional quality setting (e.g. `"auto"` or a numeric value). */
  quality?: string | number;
  /** Optional output format (e.g. `"webp"`, `"jpg"`). */
  format?: string;
};

/**
 * Generate a secure, optimized Cloudinary URL for a given public ID.
 *
 * Applies basic transformation options (width, height, crop, quality, format)
 * and always returns an HTTPS URL.
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

