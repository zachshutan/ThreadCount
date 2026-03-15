import type { ClosetEntry } from "../services/closetService";

export type SubtypeSection = {
  subtypeName: string;
  data: ClosetEntry[];
};

/**
 * Groups owned closet entries by subtype name (alphabetically), with entries
 * within each group sorted by category_rank ascending (ranked items first,
 * unranked items at the bottom of each section).
 */
export function groupOwnedBySubtype(entries: ClosetEntry[]): SubtypeSection[] {
  const owned = entries.filter((e) => e.entry_type === "owned");

  const grouped = new Map<string, ClosetEntry[]>();
  for (const entry of owned) {
    const name = entry.items?.subtypes?.name ?? "Other";
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(entry);
  }

  const sections: SubtypeSection[] = [];
  for (const [subtypeName, groupEntries] of grouped) {
    const sorted = [...groupEntries].sort((a, b) => {
      const rankA = a.scores?.category_rank ?? null;
      const rankB = b.scores?.category_rank ?? null;
      if (rankA === null && rankB === null) return 0;
      if (rankA === null) return 1;
      if (rankB === null) return -1;
      return rankA - rankB;
    });
    sections.push({ subtypeName, data: sorted });
  }

  sections.sort((a, b) => a.subtypeName.localeCompare(b.subtypeName));
  return sections;
}

/**
 * Returns owned entries as a single flat list sorted by overall_score descending.
 * Unranked items (null score) are placed at the bottom.
 * Optionally filtered to a single subtype name (from the filter pill selection).
 */
export function getSortedOwnedFlat(
  entries: ClosetEntry[],
  subtypeFilter: string | null
): ClosetEntry[] {
  let owned = entries.filter((e) => e.entry_type === "owned");
  if (subtypeFilter) {
    owned = owned.filter(
      (e) => (e.items?.subtypes?.name ?? "Other") === subtypeFilter
    );
  }
  return owned.sort((a, b) => {
    const scoreA = a.scores?.overall_score ?? null;
    const scoreB = b.scores?.overall_score ?? null;
    if (scoreA === null && scoreB === null) return 0;
    if (scoreA === null) return 1;
    if (scoreB === null) return -1;
    return scoreB - scoreA;
  });
}

/**
 * Returns all unique subtype names from owned entries (alphabetically sorted).
 * Used to render the subcategory filter pills.
 */
export function getOwnedSubtypeNames(entries: ClosetEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of entries) {
    if (entry.entry_type === "owned") {
      names.add(entry.items?.subtypes?.name ?? "Other");
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
