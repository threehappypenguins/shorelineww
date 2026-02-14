import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export const runtime = "nodejs";

/**
 * GET /api/tags
 *
 * - ?q=... : Returns tag names matching the query (ILIKE). Used for tag suggestions. Public.
 * - ?list=names : Returns all tag names. Public. Used for /projects page filter dropdown.
 * - No query: Returns all tags with project count. Admin-only. Used for tag editor.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const list = searchParams.get("list");

  if (q != null && typeof q === "string" && q.trim()) {
    const query = q.trim();
    const tags = await prisma.tag.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: { name: true },
      orderBy: { name: "asc" },
      take: 20,
    });
    return NextResponse.json(tags.map((t) => t.name));
  }

  if (list === "names") {
    const tags = await prisma.tag.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags.map((t) => t.name));
  }

  // List all tags (admin)
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projectTags: true } },
    },
  });

  return NextResponse.json(
    tags.map((t) => ({
      id: t.id,
      name: t.name,
      projectCount: t._count.projectTags,
    }))
  );
}
