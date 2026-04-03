import type { Resource } from "@/lib/resources";
import { getAllProjects } from "@/lib/resource-utils";
import { platformLabels, platformTooltips } from "./PlatformIcon";
import { ExternalLink } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPublishedDate(year: number, month?: number, day?: number): string {
  if (day && month) return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  if (month) return `${MONTH_NAMES[month - 1]} ${year}`;
  return `${year}`;
}

interface ResourceCardProps {
  resource: Resource;
}

import { typeColors } from "@/lib/type-colors";

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
  Ontology: "An ontology developed and maintained by a network member",
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
      {/* Top row: type badge left, project badges right */}
      <div className="flex items-start justify-between gap-2">
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
        <div className="flex flex-wrap justify-end gap-1">
          {getAllProjects(resource).map((project) => (
            <span
              key={project}
              title={`Affiliated with the ${project} project`}
              className="cursor-help rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
            >
              {project}
            </span>
          ))}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-black">{resource.name}</h3>

      {/* Published date and venue */}
      {resource.publishedYear && (
        <p className="text-xs text-gray-400">
          {formatPublishedDate(resource.publishedYear, resource.publishedMonth, resource.publishedDay)}
          {resource.venue && <>{" "}&middot; {resource.venue}</>}
        </p>
      )}

      {/* Contributors */}
      {resource.contributors && resource.contributors.length > 0 && (
        <p className="text-xs leading-relaxed text-gray-500">
          {resource.contributors.map((c, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {c.orcid ? (
                <a
                  href={`https://orcid.org/${c.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`ORCID: ${c.orcid}`}
                  className="underline decoration-1 underline-offset-2 hover:text-gray-800"
                >
                  {c.name}
                </a>
              ) : (
                <span>{c.name}</span>
              )}
            </span>
          ))}
        </p>
      )}

      {/* Description */}
      <p className="text-sm leading-relaxed text-gray-text">{resource.description}</p>

      {/* BSSO Foundry badge */}
      {resource.bssoFoundry && (
        <div className="text-xs">
          <span
            title="Member of the Behavioural and Social Sciences Ontology Foundry — a community of interoperable ontologies"
            className="cursor-help rounded bg-accent px-2 py-0.5 font-medium text-green-800"
          >
            BSSO Foundry
          </span>
        </div>
      )}

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
