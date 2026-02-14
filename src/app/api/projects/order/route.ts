import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export const runtime = "nodejs";

/**
 * PATCH /api/projects/order
 *
 * Admin-only. Body: { orderedIds: string[] }. Sets each project's displayOrder
 * to its index in the array. IDs not in the list are left unchanged.
 */
export async function PATCH(req: Request) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const body = await req.json();
    const orderedIds = body?.orderedIds;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds must be a non-empty array of project IDs" },
        { status: 400 },
      );
    }

    const ids = orderedIds.filter((id: unknown): id is string => typeof id === "string" && id.trim() !== "");
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "orderedIds must contain at least one valid project ID" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.project.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update project order" },
      { status: 500 },
    );
  }
}
