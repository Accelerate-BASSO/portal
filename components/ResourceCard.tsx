import type { Resource } from "@/lib/resources";
import PlatformIcon from "./PlatformIcon";

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

const typePlatformColors: Record<string, string> = {
  Ontology: "border border-violet-400 text-violet-700 bg-transparent",
  Publication: "border border-orange-400 text-orange-700 bg-transparent",
  Tool: "border border-purple-400 text-purple-700 bg-transparent",
  Community: "border border-amber-400 text-amber-700 bg-transparent",
  Repository: "border border-cyan-400 text-cyan-700 bg-transparent",
  Dataset: "border border-rose-400 text-rose-700 bg-transparent",
  Website: "border border-indigo-400 text-indigo-700 bg-transparent",
  Registry: "border border-teal-400 text-teal-700 bg-transparent",
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
        <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {resource.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm no-underline transition-opacity hover:opacity-80"
            >
              <PlatformIcon platform={link.platform} colorClass={typePlatformColors[resource.type]} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
