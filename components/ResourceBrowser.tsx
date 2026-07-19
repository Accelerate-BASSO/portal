"use client";

import { useState, useMemo, useSyncExternalStore, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Resource } from "@/lib/resources";
import {
  getAllProjects,
  getSharedTermOptions,
  getRelatedOntologies,
  buildOntologyIndex,
  compareResources,
  sortLabels,
  type SortKey,
} from "@/lib/resource-utils";
import { buildIndex, runSearch, type SearchHit } from "@/lib/search";
import OntologyTermFilter from "./OntologyTermFilter";
import ResourceTerms from "./ResourceTerms";
import RelatedOntologies from "./RelatedOntologies";
import ResourceCard from "./ResourceCard";
import ResourceListRow from "./ResourceListRow";
import {
  Search, X, LayoutGrid, List, ArrowUpDown, ChevronDown,
  Network, FileText, Globe, FolderGit2, Library, Users, Wrench, Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { typeColors, typeIconColors } from "@/lib/type-colors";

type ViewMode = "card" | "list";

const VIEW_STORAGE_KEY = "portal.viewMode";
const SORT_STORAGE_KEY = "portal.sortKey";
const TERMS_STORAGE_KEY = "portal.showTerms";
const SORT_KEYS: SortKey[] = ["name-asc", "name-desc", "type", "date-desc", "date-asc"];

// Hydration-safe localStorage read using useSyncExternalStore.
// getServerSnapshot returns the default during SSG/first render so client
// hydration matches the pre-rendered HTML; the stored value takes effect on
// the next render tick.
function useLocalStoragePref<T extends string>(
  key: string,
  isValid: (v: string) => v is T,
  defaultValue: T,
): [T, (v: T) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
  }, []);
  const getSnapshot = useCallback(() => {
    try {
      const v = localStorage.getItem(key);
      return v && isValid(v) ? v : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [key, isValid, defaultValue]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback((v: T) => {
    try {
      localStorage.setItem(key, v);
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore — no persistence available
    }
  }, [key]);
  return [value, setValue];
}

const isViewMode = (v: string): v is ViewMode => v === "card" || v === "list";
const isSortKey = (v: string): v is SortKey => (SORT_KEYS as string[]).includes(v);

const typeIcons: Record<string, LucideIcon> = {
  Ontology: Network,
  Publication: FileText,
  Website: Globe,
  Repository: FolderGit2,
  Registry: Library,
  Community: Users,
  Tool: Wrench,
  Dataset: Database,
};

interface ResourceBrowserProps {
  resources: Resource[];
  types: string[];
  projects: string[];
}

export default function ResourceBrowser({
  resources,
  types,
  projects,
}: ResourceBrowserProps) {
  const searchParams = useSearchParams();
  const initialTypes = useMemo(() => {
    const values = searchParams?.getAll("type") ?? [];
    return new Set(values.filter((t) => types.includes(t)));
  }, [searchParams, types]);
  const initialProjects = useMemo(() => {
    const values = searchParams?.getAll("project") ?? [];
    return new Set(values.filter((p) => projects.includes(p)));
  }, [searchParams, projects]);
  const initialFoundry = searchParams?.get("foundry") === "1";

  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(initialTypes);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(initialProjects);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [foundryOnly, setFoundryOnly] = useState(initialFoundry);
  const [view, updateView] = useLocalStoragePref<ViewMode>(VIEW_STORAGE_KEY, isViewMode, "card");
  const [sortKey, updateSort] = useLocalStoragePref<SortKey>(SORT_STORAGE_KEY, isSortKey, "name-asc");
  const [showTermsPref, updateShowTerms] = useLocalStoragePref<"0" | "1">(
    TERMS_STORAGE_KEY,
    (v): v is "0" | "1" => v === "0" || v === "1",
    "0",
  );
  const showTerms = showTermsPref === "1";

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleProject = (project: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(project)) next.delete(project);
      else next.add(project);
      return next;
    });
  };

  const toggleTerm = (iri: string) => {
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(iri)) next.delete(iri);
      else next.add(iri);
      return next;
    });
  };

  const hasActiveFilters =
    selectedTypes.size > 0 || selectedProjects.size > 0 || selectedTerms.size > 0 || foundryOnly;

  const clearFilters = () => {
    setSelectedTypes(new Set());
    setSelectedProjects(new Set());
    setSelectedTerms(new Set());
    setFoundryOnly(false);
  };

  const clearAll = () => {
    setSearch("");
    clearFilters();
  };

  // Build the lexical index once from the resource set, then re-query on each
  // keystroke. hitsById gives O(1) membership + rank + provenance lookup; when
  // there's no query, search is inactive and every resource passes.
  const index = useMemo(() => buildIndex(resources), [resources]);
  const hitsById = useMemo(() => {
    const map = new Map<string, SearchHit>();
    if (search.trim() === "") return map;
    for (const hit of runSearch(index, search)) map.set(hit.id, hit);
    return map;
  }, [index, search]);

  const searching = search.trim() !== "";
  const matchesSearch = (r: Resource) => !searching || hitsById.has(r.id);

  // Only offer the term-display toggle when some resource actually has annotations.
  const anyAnnotations = useMemo(
    () => resources.some((r) => r.annotations?.length),
    [resources],
  );

  // Index of Ontology resources, for linking a resource to the portal ontologies
  // it is annotated against.
  const ontologyIndex = useMemo(() => buildOntologyIndex(resources), [resources]);

  // When a result matched only via body text the card doesn't show (abstract or
  // description), surface why. Fields visible on the card (name, keywords) need
  // no explanation.
  const VISIBLE_FIELDS = new Set(["name", "keywords"]);
  const FIELD_LABELS: Record<string, string> = {
    description: "description",
    abstract: "abstract",
  };
  const matchProvenance = (id: string): string | null => {
    const hit = hitsById.get(id);
    if (!hit) return null;
    if (hit.matchedFields.some((f) => VISIBLE_FIELDS.has(f))) return null;
    const labels = hit.matchedFields
      .map((f) => FIELD_LABELS[f])
      .filter((l): l is string => Boolean(l));
    return labels.length ? `matched in ${[...new Set(labels)].join(", ")}` : null;
  };

  const matchesType = (r: Resource) => selectedTypes.size === 0 || selectedTypes.has(r.type);
  const matchesProject = (r: Resource) =>
    selectedProjects.size === 0 || getAllProjects(r).some((p) => selectedProjects.has(p));
  const matchesFoundry = (r: Resource) =>
    !foundryOnly || (r.type === "Ontology" && r.bssoFoundry === true);
  // OR within selected terms: a resource passes if it's annotated with any of them.
  const matchesTerms = (r: Resource) =>
    selectedTerms.size === 0 ||
    (r.annotations?.some((a) => selectedTerms.has(a.iri)) ?? false);

  // Term options grouped by ontology, from the resources that pass every filter
  // *except* the term filter — so the offered terms reflect the current view but
  // don't collapse to only the already-selected ones.
  const termGroups = useMemo(() => {
    const base = resources.filter(
      (r) => matchesSearch(r) && matchesType(r) && matchesProject(r) && matchesFoundry(r)
    );
    return getSharedTermOptions(base);
  }, [resources, search, selectedTypes, selectedProjects, foundryOnly]);

  const filtered = useMemo(() => {
    const result = resources.filter(
      (r) =>
        matchesSearch(r) && matchesType(r) && matchesProject(r) && matchesFoundry(r) && matchesTerms(r)
    );
    // While searching, rank by relevance score; otherwise apply the chosen sort.
    if (searching) {
      return result.sort(
        (a, b) => (hitsById.get(b.id)?.score ?? 0) - (hitsById.get(a.id)?.score ?? 0)
      );
    }
    return result.sort((a, b) => compareResources(a, b, sortKey));
  }, [resources, searching, hitsById, selectedTypes, selectedProjects, selectedTerms, foundryOnly, sortKey]);

  // Per-term counts: resources passing all filters except the term filter that
  // carry each term (mirrors the "all filters except this one" chip counting).
  const termCounts = useMemo(() => {
    const base = resources.filter(
      (r) => matchesSearch(r) && matchesType(r) && matchesProject(r) && matchesFoundry(r)
    );
    const counts: Record<string, number> = {};
    for (const r of base) {
      for (const a of r.annotations ?? []) {
        counts[a.iri] = (counts[a.iri] ?? 0) + 1;
      }
    }
    return counts;
  }, [resources, search, selectedTypes, selectedProjects, foundryOnly]);

  // Counts for type chips: apply all filters except type
  const typeCounts = useMemo(() => {
    const base = resources.filter(
      (r) => matchesSearch(r) && matchesProject(r) && matchesFoundry(r) && matchesTerms(r)
    );
    return Object.fromEntries(types.map((t) => [t, base.filter((r) => r.type === t).length]));
  }, [resources, search, selectedProjects, selectedTerms, foundryOnly, types]);

  // Counts for project chips: apply all filters except project
  const projectCounts = useMemo(() => {
    const base = resources.filter(
      (r) => matchesSearch(r) && matchesType(r) && matchesFoundry(r) && matchesTerms(r)
    );
    return Object.fromEntries(
      projects.map((p) => [p, base.filter((r) => getAllProjects(r).includes(p as never)).length])
    );
  }, [resources, search, selectedTypes, selectedTerms, foundryOnly, projects]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search resources by name, description, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-200 bg-white py-3 pl-11 pr-10 text-sm transition-colors focus:border-accent-dark focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-8 rounded-lg bg-accent-band p-4">
        {/* Type chips */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-deep/60">Type</p>
          <div className="flex flex-wrap gap-2">
            {types.map((type) => {
              const active = selectedTypes.has(type);
              const count = typeCounts[type] || 0;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  title={`Filter by ${type} resources`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? typeColors[type] || "bg-accent-deep text-white"
                      : "bg-white text-gray-600 border border-accent-hairline hover:border-accent-dark"
                  } ${count === 0 && !active ? "opacity-40" : ""}`}
                >
                  {typeIcons[type] && (() => { const Icon = typeIcons[type]; return <Icon size={14} strokeWidth={2} className={active ? "" : typeIconColors[type] || ""} />; })()}
                  {type}
                  <span className={`inline-block min-w-[1.25rem] text-center text-xs font-semibold ${active ? "text-white/70" : "text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Project chips */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-deep/60">Project</p>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const active = selectedProjects.has(project);
              const count = projectCounts[project] || 0;
              return (
                <button
                  key={project}
                  onClick={() => toggleProject(project)}
                  title={`Filter by ${project} project`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-accent-deep text-white"
                      : "bg-white text-gray-600 border border-accent-hairline hover:border-accent-dark"
                  } ${count === 0 && !active ? "opacity-40" : ""}`}
                >
                  {project}
                  <span className={`inline-block min-w-[1.25rem] text-center text-xs font-semibold ${active ? "text-accent" : "text-violet-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ontology term facet */}
        <OntologyTermFilter
          groups={termGroups}
          selectedTerms={selectedTerms}
          termCounts={termCounts}
          onToggle={toggleTerm}
        />

        {/* Bottom row: display toggles + clear */}
        <div className="flex items-center justify-between border-t border-accent-hairline pt-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label
              title="Show only ontologies that are members of the Behavioural and Social Sciences Ontology Foundry"
              className="flex cursor-pointer items-center gap-2 text-xs text-gray-500"
            >
              <input
                type="checkbox"
                checked={foundryOnly}
                onChange={(e) => setFoundryOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-accent-dark"
              />
              BSSO Foundry only
            </label>

            {anyAnnotations && (
              <label
                title="Show the ontology terms each resource was automatically annotated with"
                className="flex cursor-pointer items-center gap-2 text-xs text-gray-500"
              >
                <input
                  type="checkbox"
                  checked={showTerms}
                  onChange={(e) => updateShowTerms(e.target.checked ? "1" : "0")}
                  className="h-3.5 w-3.5 rounded accent-accent-dark"
                />
                Show ontology terms
              </label>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 underline hover:text-gray-600"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count + view/sort controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Showing {filtered.length} of {resources.length} resources
          {search && <span> matching &ldquo;{search}&rdquo;</span>}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <ArrowUpDown
              size={12}
              strokeWidth={2}
              className="pointer-events-none absolute left-2 text-gray-400"
              aria-hidden
            />
            <select
              value={searching ? "relevance" : sortKey}
              onChange={(e) => updateSort(e.target.value as SortKey)}
              disabled={searching}
              aria-label="Sort resources"
              title={searching ? "Results are ranked by relevance while searching" : undefined}
              className="cursor-pointer appearance-none rounded-md border border-gray-200 bg-white py-1 pl-7 pr-7 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800 focus:border-accent-dark focus:outline-none disabled:cursor-default disabled:opacity-60"
            >
              {searching && <option value="relevance">Relevance</option>}
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {sortLabels[k]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              strokeWidth={2}
              className="pointer-events-none absolute right-2 text-gray-400"
              aria-hidden
            />
          </div>
          <div
            role="group"
            aria-label="View mode"
            className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white"
          >
            <button
              type="button"
              onClick={() => updateView("card")}
              title="Card view"
              aria-pressed={view === "card"}
              className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                view === "card" ? "bg-accent-deep text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid size={14} strokeWidth={2} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => updateView("list")}
              title="List view"
              aria-pressed={view === "list"}
              className={`flex items-center gap-1 border-l border-gray-200 px-2 py-1 text-xs transition-colors ${
                view === "list" ? "bg-accent-deep text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <List size={14} strokeWidth={2} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resources */}
      {filtered.length > 0 ? (
        view === "card" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((resource) => {
              const provenance = searching ? matchProvenance(resource.id) : null;
              return (
                <div key={resource.id} className="flex flex-col gap-1">
                  <ResourceCard resource={resource} />
                  {(() => {
                    const related = getRelatedOntologies(resource, ontologyIndex);
                    return related.length ? (
                      <div className="px-1">
                        <RelatedOntologies ontologies={related} />
                      </div>
                    ) : null;
                  })()}
                  {showTerms && resource.annotations?.length ? (
                    <div className="px-1">
                      <ResourceTerms annotations={resource.annotations} />
                    </div>
                  ) : null}
                  {provenance && (
                    <p className="px-1 text-xs italic text-gray-400">{provenance}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-accent-hairline bg-white">
            {filtered.map((resource) => {
              const provenance = searching ? matchProvenance(resource.id) : null;
              const related = getRelatedOntologies(resource, ontologyIndex);
              const showTermsRow = showTerms && resource.annotations?.length;
              const hasExtras = related.length > 0 || showTermsRow || provenance;
              return (
                // One bordered block per resource: the row, plus any metadata
                // strips indented beneath it so they read as attached, not as
                // separate entries.
                <div
                  key={resource.id}
                  className="border-b border-accent-hairline last:border-b-0"
                >
                  <ResourceListRow resource={resource} noBorder />
                  {hasExtras && (
                    <div className="space-y-1 pb-2 pl-12 pr-4">
                      {related.length > 0 && <RelatedOntologies ontologies={related} />}
                      {showTermsRow ? (
                        <ResourceTerms annotations={resource.annotations!} />
                      ) : null}
                      {provenance && (
                        <p className="text-xs italic text-gray-400">{provenance}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-lg text-gray-400">No resources match your criteria</p>
          <button
            onClick={clearAll}
            className="mt-3 text-sm text-accent-dark underline hover:text-accent-hover"
          >
            Clear search and filters
          </button>
        </div>
      )}
    </div>
  );
}
