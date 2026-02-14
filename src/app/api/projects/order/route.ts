import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export const runtime = "nodejs";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * PATCH /api/projects/order
 *
 * Admin-only. Body: { orderedIds: string[] }. Order is preserved by updating
 * only createdAt: within each calendar day, timestamps are reassigned so the
 * first in the list has the latest time that day. The list is sorted by
 * createdAt desc, so the saved order is reflected. Cloudinary folder names
 * and assets are not changed.
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

    const projects = await prisma.project.findMany({
      where: { id: { in: ids } },
      select: { id: true, createdAt: true },
    });

    const idToProject = new Map(projects.map((p) => [p.id, p]));

    const ordered = ids
      .map((id) => idToProject.get(id))
      .filter((p): p is (typeof projects)[0] => p != null);

    const byDay = new Map<string, { id: string; createdAt: Date }[]>();
    for (const p of ordered) {
      const key = dateKey(p.createdAt);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push({ id: p.id, createdAt: p.createdAt });
    }

    const updates: { id: string; createdAt: Date }[] = [];
    for (const [, group] of byDay) {
      const base = new Date(group[0]!.createdAt);
      base.setHours(0, 0, 0, 0);
      const n = group.length;
      for (let i = 0; i < n; i++) {
        const createdAt = new Date(base.getTime() + (n - 1 - i) * 1000);
        updates.push({ id: group[i]!.id, createdAt });
      }
    }

    await prisma.$transaction(
      updates.map(({ id, createdAt }) =>
        prisma.project.update({
          where: { id },
          data: { createdAt },
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
