/**
 * @vitest-environment node
 * Tests for the `GET /api/cloudinary-config` route handler.
 *
 * Verifies admin guard behavior, folder selection based on projectId and date
 * query params, default folder generation, and error handling around Cloudinary
 * configuration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "../route";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import {
  dateToFolderAndCreatedAt,
  generateProjectFolder,
  getSignedUploadParams,
} from "@/lib/cloudinary";

vi.mock("@/lib/auth-guards", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/cloudinary", () => {
  const suffixToSeconds = (suffix: string) => {
    if (!/^\d{6}$/.test(suffix)) return 0;
    const h = parseInt(suffix.slice(0, 2), 10);
    const m = parseInt(suffix.slice(2, 4), 10);
    const s = parseInt(suffix.slice(4, 6), 10);
    return h * 3600 + m * 60 + s;
  };
  const secondsToSuffix = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds)) % 60;
    const m = Math.floor(seconds / 60) % 60;
    const h = Math.floor(seconds / 3600);
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join("");
  };
  const getNextFolderForDatePrefix = (prefix: string, paths: string[]) => {
    let max = 0;
    for (const p of paths) {
      const suf = p.slice(prefix.length).slice(0, 6);
      max = Math.max(max, suffixToSeconds(suf));
    }
    return prefix + secondsToSuffix(max + 1);
  };
  return {
    DEFAULT_PROJECTS_FOLDER: "projects",
    dateToFolderAndCreatedAt: vi.fn(),
    generateProjectFolder: vi.fn(() => "projects/generated-folder"),
    getNextFolderForDatePrefix: vi.fn(getNextFolderForDatePrefix),
    getSignedUploadParams: vi.fn((folder: string) => ({
      signature: "signed",
      folder,
    })),
  };
});

describe("GET /api/cloudinary-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the auth guard response when requireAdmin fails", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const req = new Request("http://localhost/api/cloudinary-config");
    const res = await GET(req as unknown as NextRequest);

    expect(requireAdmin).toHaveBeenCalled();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
    expect(getSignedUploadParams).not.toHaveBeenCalled();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("uses existing cloudinaryFolder when project has one", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    (prisma.project.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      cloudinaryFolder: "projects/existing-folder",
      createdAt: new Date(),
    });

    const req = new Request(
      "http://localhost/api/cloudinary-config?projectId=proj-1",
    );
    const res = await GET(req as unknown as NextRequest);

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      select: { cloudinaryFolder: true, createdAt: true },
    });
    expect(getSignedUploadParams).toHaveBeenCalledWith("projects/existing-folder");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      signature: "signed",
      folder: "projects/existing-folder",
    });
  });

  it("derives folder from createdAt when project has no cloudinaryFolder", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    const createdAt = new Date("2024-01-02T03:04:05Z");
    (prisma.project.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      cloudinaryFolder: null,
      createdAt,
    });

    const req = new Request(
      "http://localhost/api/cloudinary-config?projectId=proj-2",
    );
    await GET(req as unknown as NextRequest);

    // We don't assert exact HHmmss because of timezone differences; just that
    // the folder is under the DEFAULT_PROJECTS_FOLDER and contains the date.
    expect(getSignedUploadParams).toHaveBeenCalledTimes(1);
    const calledFolder =
      (getSignedUploadParams as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(calledFolder).toMatch(/^projects\/\d{8}-\d{6}$/);
  });

  it("falls back to generateProjectFolder when projectId is not found", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    (prisma.project.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const req = new Request(
      "http://localhost/api/cloudinary-config?projectId=missing",
    );
    const res = await GET(req as unknown as NextRequest);

    expect(generateProjectFolder).toHaveBeenCalled();
    expect(getSignedUploadParams).toHaveBeenCalledWith("projects/generated-folder");
    expect(res.status).toBe(200);
  });

  it("builds date-based folder and increments suffix based on existing folders", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));

    (dateToFolderAndCreatedAt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      prefix: "projects/20240101-",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    (prisma.project.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cloudinaryFolder: "projects/20240101-000001" },
      { cloudinaryFolder: "projects/20240101-000010" },
    ]);
    (prisma.project.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request(
      "http://localhost/api/cloudinary-config?year=2024&month=1&day=1",
    );
    await GET(req as unknown as NextRequest);

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { cloudinaryFolder: { startsWith: "projects/20240101-" } },
      select: { cloudinaryFolder: true },
    });
    expect(getSignedUploadParams).toHaveBeenCalledWith("projects/20240101-000011");
  });

  it("uses default day=1 when only year and month are provided", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    (dateToFolderAndCreatedAt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      prefix: "projects/20231201-",
      createdAt: new Date("2023-12-01T00:00:00Z"),
    });

    (prisma.project.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.project.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request(
      "http://localhost/api/cloudinary-config?year=2023&month=12",
    );
    await GET(req as unknown as NextRequest);

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { cloudinaryFolder: { startsWith: "projects/20231201-" } },
      select: { cloudinaryFolder: true },
    });
    expect(getSignedUploadParams).toHaveBeenCalledWith("projects/20231201-000001");
  });

  it("rejects invalid date params with 400", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    const urls = [
      "http://localhost/api/cloudinary-config?year=1969&month=1",
      "http://localhost/api/cloudinary-config?year=2024&month=13",
      "http://localhost/api/cloudinary-config?year=2024&month=0",
      "http://localhost/api/cloudinary-config?year=2024&month=1&day=32",
    ];

    for (const url of urls) {
      const req = new Request(url);
      const res = await GET(req as unknown as NextRequest);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Invalid date: year (min 1970), month (1-12), optional day (1-31)",
      });
    }
  });

  it("rejects future project dates with 400", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));

    const req = new Request(
      "http://localhost/api/cloudinary-config?year=2025&month=1&day=1",
    );
    const res = await GET(req as unknown as NextRequest);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Project date cannot be in the future",
    });
  });

  it("uses generateProjectFolder when no projectId and no date params are provided", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });
    (prisma.project.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request("http://localhost/api/cloudinary-config");
    const res = await GET(req as unknown as NextRequest);

    expect(prisma.project.findUnique).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(generateProjectFolder).toHaveBeenCalled();
    expect(getSignedUploadParams).toHaveBeenCalledWith("projects/generated-folder");
    expect(res.status).toBe(200);
  });

  it("returns 503 with error message when getSignedUploadParams throws Error", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });
    (prisma.project.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSignedUploadParams as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => {
        throw new Error("Cloudinary misconfigured");
      },
    );

    const req = new Request("http://localhost/api/cloudinary-config");
    const res = await GET(req as unknown as NextRequest);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Cloudinary misconfigured" });
  });

  it("returns generic 503 error when a non-Error is thrown", async () => {
    (requireAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      response: null,
    });
    (prisma.project.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSignedUploadParams as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => {
        // Throw a non-Error value to hit the generic branch
        throw "boom";
      },
    );

    const req = new Request("http://localhost/api/cloudinary-config");
    const res = await GET(req as unknown as NextRequest);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Cloudinary not configured" });
  });
});

