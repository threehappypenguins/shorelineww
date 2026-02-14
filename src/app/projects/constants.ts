export const PAGE_SIZE = 6;
export const TAG_NONE = '__none__';

export function formatProjectDate(createdAt: string, dateIsMonthOnly?: boolean | null): string {
  const d = new Date(createdAt);
  const month = d.toLocaleString('default', { month: 'long' });
  const year = d.getFullYear();
  if (dateIsMonthOnly) {
    return `${month} ${year}`;
  }
  const day = d.getDate();
  return `${month} ${day}, ${year}`;
}

/** History state for modal stack: each entry is one modal level (gallery or photo). */
export type ModalHistoryState =
  | { modal: 'gallery'; projectId: string }
  | { modal: 'photo'; projectId: string; photoIndex: number }
  | null;
