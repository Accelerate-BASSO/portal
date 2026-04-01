import type { Resource } from "@/lib/resources";
import { platformLabels, platformTooltips } from "./PlatformIcon";
import { ExternalLink } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
}

const typeColors: Record<string, string> = {
  Ontology: "bg-violet-600 text-white",
  Publication: "bg-orange-600 text-white",
  Tool: "bg-purple-600 text-white",
  Community: "bg-amber-600 text-white",
  Repository: "bg-cyan-600 text-white",
  Dataset: "bg-rose-600 text-white",
  Website: "bg-indigo-600 text-white",
  Registry: "bg-teal-600 text-white",
};

const typeLinkColors: Record<string, string> = {
  Ontology: "text-violet-600 hover:text-violet-800",
  Publication: "text-orange-600 hover:text-orange-800",
  Tool: "text-purple-600 hover:text-purple-800",
  Community: "text-amber-600 hover:text-amber-800",
  Repository: "text-cyan-600 hover:text-cyan-800",
  Dataset: "text-rose-600 hover:text-rose-800",
  Website: "text-indigo-600 hover:text-indigo-800",
  Registry: "text-teal-600 hover:text-teal-800",
};

const typeTooltips: Record<string, string> = {
  Ontology: "A formal representation of knowledge in a specific domain",
  Publication: "A published report, paper, or document",
  Tool: "A software tool, editor, converter, or utility",
  Community: "A forum or group for discussion and collaboration",
  Repository: "A browsable collection of ontologies or data",
  Dataset: "A structured collection of data",
  Website: "A project or network website",
  Registry: "A standards body or curated registry of resources",
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
      {/* Type badge */}
      <div className="flex gap-1.5">
        <span
          title={typeTooltips[resource.type] || `Resource type: ${resource.type}`}
          className={`cursor-help rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[resource.type] || "bg-gray-100 text-gray-800"}`}
        >
          {resource.type}
        </span>
        {resource.status !== "Active" && (
          <span
            title={statusTooltips[resource.status] || `Status: ${resource.status}`}
            className={`cursor-help rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[resource.status] || ""}`}
          >
            {resource.status}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-black">{resource.name}</h3>

      {/* Published date */}
      {resource.publishedDate && (
        <p className="text-xs text-gray-400">
          {new Date(resource.publishedDate + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
      )}

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

      {/* Links */}
      {resource.links && resource.links.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3">
          {resource.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={platformTooltips[link.platform] || "Visit external link"}
              className={`inline-flex items-center gap-1 text-sm underline decoration-1 underline-offset-2 transition-colors ${typeLinkColors[resource.type] || "text-gray-500 hover:text-gray-800"}`}
            >
              {platformLabels[link.platform] || link.platform}
              <ExternalLink size={16} strokeWidth={3} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
