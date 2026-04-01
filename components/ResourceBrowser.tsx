"use client";

import { useState, useMemo } from "react";
import type { Resource } from "@/lib/resources";
import ResourceCard from "./ResourceCard";

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
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [projectFilter, setProjectFilter] = useState<string>("All");
  const [foundryOnly, setFoundryOnly] = useState(false);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch =
        search === "" ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesType = typeFilter === "All" || r.type === typeFilter;
      const matchesProject = projectFilter === "All" || r.projects.includes(projectFilter as never);
      const matchesFoundry = !foundryOnly || r.bssoFoundry === true;

      return matchesSearch && matchesType && matchesProject && matchesFoundry;
    });
  }, [resources, search, typeFilter, projectFilter, foundryOnly]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="flex-1 sm:min-w-[250px]">
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border-2 border-gray-300 bg-white px-4 py-2 text-sm transition-colors focus:border-black focus:outline-none"
          />
        </div>

        {/* Type filter */}
        <select
          title="Filter by resource type (e.g. Ontology, Tool, Publication)"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-full border-2 border-gray-300 bg-white px-4 py-2 text-sm focus:border-black focus:outline-none"
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Project filter */}
        <select
          title="Filter by network project affiliation"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-full border-2 border-gray-300 bg-white px-4 py-2 text-sm focus:border-black focus:outline-none"
        >
          <option value="All">All Projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Foundry toggle */}
        <label
          title="Show only ontologies that are members of the Behavioural and Social Sciences Ontology Foundry"
          className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"
        >
          <input
            type="checkbox"
            checked={foundryOnly}
            onChange={(e) => setFoundryOnly(e.target.checked)}
            className="h-4 w-4 rounded accent-green-600"
          />
          BSSO Foundry only
        </label>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        Showing {filtered.length} of {resources.length} resources
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
          <p className="text-lg text-gray-400">No resources match your filters</p>
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("All");
              setProjectFilter("All");
              setFoundryOnly(false);
            }}
            className="mt-3 text-sm text-black underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
