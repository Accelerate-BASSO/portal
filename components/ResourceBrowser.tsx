"use client";

import { useState, useMemo, useSyncExternalStore, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Resource } from "@/lib/resources";
import {
  getAllProjects,
  compareResources,
  sortLabels,
  type SortKey,
} from "@/lib/resource-utils";
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
  const [foundryOnly, setFoundryOnly] = useState(initialFoundry);
  const [view, updateView] = useLocalStoragePref<ViewMode>(VIEW_STORAGE_KEY, isViewMode, "card");
  const [sortKey, updateSort] = useLocalStoragePref<SortKey>(SORT_STORAGE_KEY, isSortKey, "name-asc");

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

  const hasActiveFilters = selectedTypes.size > 0 || selectedProjects.size > 0 || foundryOnly;

  const clearFilters = () => {
    setSelectedTypes(new Set());
    setSelectedProjects(new Set());
    setFoundryOnly(false);
  };

  const clearAll = () => {
    setSearch("");
    clearFilters();
  };

  const matchesSearch = (r: Resource) =>
    search === "" ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()));

  const matchesType = (r: Resource) => selectedTypes.size === 0 || selectedTypes.has(r.type);
  const matchesProject = (r: Resource) =>
    selectedProjects.size === 0 || getAllProjects(r).some((p) => selectedProjects.has(p));
  const matchesFoundry = (r: Resource) =>
    !foundryOnly || (r.type === "Ontology" && r.bssoFoundry === true);

  const filtered = useMemo(() => {
    return resources
      .filter(
        (r) => matchesSearch(r) && matchesType(r) && matchesProject(r) && matchesFoundry(r)
      )
      .sort((a, b) => compareResources(a, b, sortKey));
  }, [resources, search, selectedTypes, selectedProjects, foundryOnly, sortKey]);

  // Counts for type chips: apply all filters except type
  const typeCounts = useMemo(() => {
    const base = resources.filter(
      (r) => matchesSearch(r) && matchesProject(r) && matchesFoundry(r)
    );
    return Object.fromEntries(types.map((t) => [t, base.filter((r) => r.type === t).length]));
  }, [resources, search, selectedProjects, foundryOnly, types]);

  // Counts for project chips: apply all filters except project
  const projectCounts = useMemo(() => {
    const base = resources.filter(
      (r) => matchesSearch(r) && matchesType(r) && matchesFoundry(r)
    );
    return Object.fromEntries(
      projects.map((p) => [p, base.filter((r) => getAllProjects(r).includes(p as never)).length])
    );
  }, [resources, search, selectedTypes, foundryOnly, projects]);

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

        {/* Bottom row: Foundry toggle + clear */}
        <div className="flex items-center justify-between border-t border-accent-hairline pt-3">
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
              value={sortKey}
              onChange={(e) => updateSort(e.target.value as SortKey)}
              aria-label="Sort resources"
              className="cursor-pointer appearance-none rounded-md border border-gray-200 bg-white py-1 pl-7 pr-7 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800 focus:border-accent-dark focus:outline-none"
            >
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
            {filtered.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-accent-hairline bg-white">
            {filtered.map((resource) => (
              <ResourceListRow key={resource.id} resource={resource} />
            ))}
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
