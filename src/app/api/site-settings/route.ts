import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export const runtime = "nodejs";

const ABOUT_KEYS = ["about.ourStoryHeading", "about.ourStoryBody", "about.whatWeDo"] as const;

/**
 * GET /api/site-settings?keys=key1,key2
 * Returns a map of key -> value (value is null if not set). Public.
 * If no keys param, returns all known about-page keys.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keysParam = searchParams.get("keys");
  const keys = keysParam
    ? keysParam.split(",").map((k) => k.trim()).filter(Boolean)
    : [...ABOUT_KEYS];

  if (keys.length === 0) {
    return NextResponse.json({});
  }

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });

  const map: Record<string, string | null> = {};
  for (const k of keys) {
    map[k] = rows.find((r) => r.key === k)?.value ?? null;
  }
  return NextResponse.json(map);
}

/**
 * PATCH /api/site-settings
 * Body: { key: string, value: string }. Upserts one setting. Admin only.
 */
export async function PATCH(req: Request) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  let body: { key?: string; value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const key =
    typeof body.key === "string" ? body.key.trim() : undefined;
  const value =
    typeof body.value === "string" ? body.value : undefined;

  if (!key) {
    return NextResponse.json(
      { error: "Missing or invalid key" },
      { status: 400 }
    );
  }

  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: value ?? "" },
    update: { value: value ?? "" },
  });

  return NextResponse.json({ ok: true });
}
