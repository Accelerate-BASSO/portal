import type { Resource, ProjectName } from "./resources";

export function getAllProjects(resource: Resource): ProjectName[] {
  return [...new Set([...(resource.producedByProjects || []), ...(resource.usedByProjects || [])])];
}

export interface TermOption {
  iri: string;
  prefLabel: string;
  ontology: string;
  /** Number of resources (within the given set) annotated with this term. */
  count: number;
}

/**
 * Ontology terms worth offering as filter chips: those annotated on at least
 * `minResources` resources in the given set. A term on a single resource
 * filters to that one resource, which free-text search already does better, so
 * such terms are excluded. Returned grouped by ontology, each group's terms
 * sorted by descending resource count then label.
 */
export function getSharedTermOptions(
  resources: Resource[],
  minResources = 2,
): Map<string, TermOption[]> {
  const byIri = new Map<string, TermOption>();
  for (const r of resources) {
    for (const a of r.annotations ?? []) {
      const existing = byIri.get(a.iri);
      if (existing) existing.count += 1;
      else byIri.set(a.iri, { iri: a.iri, prefLabel: a.prefLabel, ontology: a.ontology, count: 1 });
    }
  }
  const groups = new Map<string, TermOption[]>();
  for (const opt of byIri.values()) {
    if (opt.count < minResources) continue;
    const group = groups.get(opt.ontology) ?? [];
    group.push(opt);
    groups.set(opt.ontology, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => b.count - a.count || a.prefLabel.localeCompare(b.prefLabel));
  }
  return groups;
}

/**
 * Best-available date for a resource, as a YYYY-MM-DD string suitable for
 * lexical comparison. Returns only dates that mean something about the
 * resource itself (publication, release, BioPortal upload). Returns null
 * when only the metadata-review date (lastUpdated) is available, since
 * that's about the YAML file, not the resource.
 */
export function effectiveDate(r: Resource): string | null {
  if (r.type === "Publication" && r.publishedYear) {
    const m = String(r.publishedMonth ?? 1).padStart(2, "0");
    const d = String(r.publishedDay ?? 1).padStart(2, "0");
    return `${r.publishedYear}-${m}-${d}`;
  }
  if (r.githubRelease?.date) return r.githubRelease.date.slice(0, 10);
  if (r.bioportal?.released) return r.bioportal.released.slice(0, 10);
  return null;
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
      const da = effectiveDate(a);
      const db = effectiveDate(b);
      // Push undated resources to the end in both sort directions, so the
      // dated cluster reads cleanly and undated items don't masquerade as
      // recent (or ancient) just because they have a metadata-review date.
      if (da === null && db === null) return a.name.localeCompare(b.name);
      if (da === null) return 1;
      if (db === null) return -1;
      const d = db.localeCompare(da);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    }
    case "date-asc": {
      const da = effectiveDate(a);
      const db = effectiveDate(b);
      if (da === null && db === null) return a.name.localeCompare(b.name);
      if (da === null) return 1;
      if (db === null) return -1;
      const d = da.localeCompare(db);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    }
  }
}
