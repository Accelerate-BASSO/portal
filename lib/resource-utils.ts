import type { Resource, ProjectName } from "./resources";

export function getAllProjects(resource: Resource): ProjectName[] {
  return [...new Set([...(resource.producedByProjects || []), ...(resource.usedByProjects || [])])];
}

/**
 * Best-available date for a resource, as a YYYY-MM-DD string suitable for
 * lexical comparison. Prefers the resource's own temporal info over the
 * metadata-review date:
 *   publishedDate > githubRelease.date > bioportal.released > lastUpdated
 */
export function effectiveDate(r: Resource): string {
  if (r.publishedYear) {
    const m = String(r.publishedMonth ?? 1).padStart(2, "0");
    const d = String(r.publishedDay ?? 1).padStart(2, "0");
    return `${r.publishedYear}-${m}-${d}`;
  }
  if (r.githubRelease?.date) return r.githubRelease.date.slice(0, 10);
  if (r.bioportal?.released) return r.bioportal.released.slice(0, 10);
  return r.lastUpdated;
}

export type SortKey = "name-asc" | "name-desc" | "type" | "date-desc" | "date-asc";

export const sortLabels: Record<SortKey, string> = {
  "name-asc": "Name (A\u2013Z)",
  "name-desc": "Name (Z\u2013A)",
  "type": "Type",
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
};

export function compareResources(a: Resource, b: Resource, key: SortKey): number {
  switch (key) {
    case "name-asc":
      return a.name.localeCompare(b.name);
    case "name-desc":
      return b.name.localeCompare(a.name);
    case "type": {
      const t = a.type.localeCompare(b.type);
      return t !== 0 ? t : a.name.localeCompare(b.name);
    }
    case "date-desc": {
      const d = effectiveDate(b).localeCompare(effectiveDate(a));
      return d !== 0 ? d : a.name.localeCompare(b.name);
    }
    case "date-asc": {
      const d = effectiveDate(a).localeCompare(effectiveDate(b));
      return d !== 0 ? d : a.name.localeCompare(b.name);
    }
  }
}
