"use client";

import { useState, useMemo } from "react";
import type { Resource } from "@/lib/resources";
import { getAllProjects } from "@/lib/resource-utils";
import ResourceCard from "./ResourceCard";
import {
  Search, X,
  Network, FileText, Globe, FolderGit2, Library, Users, Wrench, Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { typeColors, typeIconColors } from "@/lib/type-colors";

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
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [foundryOnly, setFoundryOnly] = useState(false);

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
    r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

  const matchesType = (r: Resource) => selectedTypes.size === 0 || selectedTypes.has(r.type);
  const matchesProject = (r: Resource) =>
    selectedProjects.size === 0 || getAllProjects(r).some((p) => selectedProjects.has(p));
  const matchesFoundry = (r: Resource) => !foundryOnly || r.bssoFoundry === true;

  const filtered = useMemo(() => {
    return resources.filter(
      (r) => matchesSearch(r) && matchesType(r) && matchesProject(r) && matchesFoundry(r)
    );
  }, [resources, search, selectedTypes, selectedProjects, foundryOnly]);

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
          className="w-full rounded-lg border-2 border-gray-200 bg-white py-3 pl-11 pr-10 text-sm transition-colors focus:border-black focus:outline-none"
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
      <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        {/* Type chips */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Type</p>
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
                      ? typeColors[type] || "bg-black text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Project</p>
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
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
                  } ${count === 0 && !active ? "opacity-40" : ""}`}
                >
                  {project}
                  <span className={`inline-block min-w-[1.25rem] text-center text-xs font-semibold ${active ? "text-green-300" : "text-violet-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom row: Foundry toggle + clear */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <label
            title="Show only ontologies that are members of the Behavioural and Social Sciences Ontology Foundry"
            className="flex cursor-pointer items-center gap-2 text-xs text-gray-500"
          >
            <input
              type="checkbox"
              checked={foundryOnly}
              onChange={(e) => setFoundryOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-green-600"
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

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        Showing {filtered.length} of {resources.length} resources
        {search && <span> matching &ldquo;{search}&rdquo;</span>}
      </p>

      {/* Resource grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-lg text-gray-400">No resources match your criteria</p>
          <button
            onClick={clearAll}
            className="mt-3 text-sm text-black underline"
          >
            Clear search and filters
          </button>
        </div>
      )}
    </div>
  );
}
