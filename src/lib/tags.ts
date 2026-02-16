/**
 * @module lib/tags
 * @description Tag resolution utilities for project tagging.
 * Provides functions to resolve tag names to database IDs, creating new tags as needed.
 */
import { prisma } from "@/lib/db";

/**
 * Resolves tag names to Tag IDs, creating tags that don't exist.
 * Returns array of tag IDs in the same order as input (deduplicated by name, first occurrence wins).
 *
 * @param names - Array of tag names to resolve
 * @returns Array of tag IDs corresponding to the input names
 *
 * @example
 * ```typescript
 * const tagIds = await resolveTagNamesToIds(["Featured", "New", "Featured"]);
 * // Returns: ["id-for-featured", "id-for-new"] (deduplicated)
 * ```
 */
export async function resolveTagNamesToIds(names: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const toCreate: string[] = [];
  for (const n of names) {
    const trimmed = n.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    toCreate.push(trimmed);
  }
  if (toCreate.length === 0) return [];

  const existing = await prisma.tag.findMany({
    where: { name: { in: toCreate, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  const existingLower = new Map(existing.map((t) => [t.name.toLowerCase(), t.id]));
  const toInsert = toCreate.filter((n) => !existingLower.has(n.toLowerCase()));

  for (const name of toInsert) {
    const created = await prisma.tag.create({
      data: { name },
      select: { id: true, name: true },
    });
    existingLower.set(created.name.toLowerCase(), created.id);
  }

  return toCreate.map((n) => existingLower.get(n.toLowerCase())!).filter(Boolean);
}
