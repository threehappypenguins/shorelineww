import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/projects/years
 *
 * Returns distinct years from project createdAt dates, sorted descending.
 * Public. Used for the date filter on /projects.
 */
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const years = [...new Set(projects.map((p) => p.createdAt.getFullYear()))].sort(
      (a, b) => b - a,
    );

    return NextResponse.json(years);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch years" },
      { status: 500 },
    );
  }
}
