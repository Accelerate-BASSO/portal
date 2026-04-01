import type { Resource } from "@/lib/resources";
import PlatformIcon from "./PlatformIcon";

interface ResourceCardProps {
  resource: Resource;
}

const typeColors: Record<string, string> = {
  Ontology: "bg-emerald-100 text-emerald-800",
  Publication: "bg-blue-100 text-blue-800",
  Tool: "bg-purple-100 text-purple-800",
  Community: "bg-amber-100 text-amber-800",
  Repository: "bg-gray-100 text-gray-800",
  Dataset: "bg-rose-100 text-rose-800",
};

const typeTooltips: Record<string, string> = {
  Ontology: "A formal representation of knowledge in a specific domain",
  Publication: "A published report, paper, or document",
  Tool: "A platform, service, or utility supporting the network",
  Community: "A forum or group for discussion and collaboration",
  Repository: "A collection of files, code, or data",
  Dataset: "A structured collection of data",
};

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  "In Development": "bg-yellow-100 text-yellow-700",
  Archived: "bg-gray-100 text-gray-500",
};

const statusTooltips: Record<string, string> = {
  Active: "This resource is actively maintained and available",
  "In Development": "This resource is under active development and may not be complete",
  Archived: "This resource is no longer actively maintained",
};

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-card-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-black">{resource.name}</h3>
        <div className="flex gap-1.5">
          <span
            title={typeTooltips[resource.type] || `Resource type: ${resource.type}`}
            className={`cursor-help rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[resource.type] || "bg-gray-100 text-gray-800"}`}
          >
            {resource.type}
          </span>
          <span
            title={statusTooltips[resource.status] || `Status: ${resource.status}`}
            className={`cursor-help rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[resource.status] || ""}`}
          >
            {resource.status}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-gray-text">{resource.description}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {resource.projects.map((project) => (
          <span
            key={project}
            title={`Affiliated with the ${project} project`}
            className="cursor-help rounded bg-gray-100 px-2 py-0.5 font-medium"
          >
            {project}
          </span>
        ))}
        {resource.bssoFoundry && (
          <span
            title="Member of the Behavioural and Social Sciences Ontology Foundry — a community of interoperable ontologies"
            className="cursor-help rounded bg-accent px-2 py-0.5 font-medium text-green-800"
          >
            BSSO Foundry
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {resource.tags.map((tag) => (
          <span
            key={tag}
            title={`Filter by tag: ${tag}`}
            className="cursor-help rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Links */}
      {resource.links && resource.links.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {resource.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm no-underline transition-opacity hover:opacity-80"
            >
              <PlatformIcon platform={link.platform} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
