import type { Resource } from "@/lib/resources";
import { getAllProjects } from "@/lib/resource-utils";
import { platformLabels, platformTooltips, PlatformGlyph } from "./PlatformIcon";
import {
  Pencil,
  Network,
  FileText,
  Globe,
  FolderGit2,
  Library,
  Users,
  Wrench,
  Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
import TruncatedText from "./TruncatedText";

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

import { typeColors, typeIconColors } from "@/lib/type-colors";

const projectFullNames: Record<string, string> = {
  APRICOT: "Advancing Prevention Research in Cancer through Ontology Tools",
  "BSO-AD": "Standardizing and Harmonizing Behavioral and Social Science Research Factors in Alzheimer\u2019s Disease through Ontology-Based Approaches",
  ODFA: "Ontology of Dental care-related Fear, Anxiety, and/or Phobia",
  PHASES: "Promoting Health Aging through Semantic Enrichment of Solitude Research",
  DCC: "Dissemination and Coordination Center",
};

const projectUrls: Record<string, string> = {
  APRICOT: "https://accelerate-basso.regenstrief.org/pages/apricot.html",
  "BSO-AD": "https://accelerate-basso.regenstrief.org/pages/bso-ad.html",
  ODFA: "https://accelerate-basso.regenstrief.org/pages/odfa.html",
  PHASES: "https://accelerate-basso.regenstrief.org/pages/phases.html",
  DCC: "https://accelerate-basso.regenstrief.org",
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

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div
      id={resource.id}
      className="flex flex-col gap-3 rounded-lg border border-accent-hairline bg-white p-5 transition-colors hover:border-accent-dark scroll-mt-24 target:border-accent-dark target:ring-2 target:ring-accent"
    >
      {/* Top row: type badge left, project badges right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {typeIcons[resource.type] && (() => {
            const Icon = typeIcons[resource.type];
            return <Icon size={18} strokeWidth={2} className={typeIconColors[resource.type] || "text-gray-500"} />;
          })()}
          <span
            title={typeTooltips[resource.type] || `Resource type: ${resource.type}`}
            className={`cursor-help rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[resource.type] || "bg-gray-100 text-gray-800"}`}
          >
            {resource.type}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {getAllProjects(resource).map((project) => (
            <a
              key={project}
              href={projectUrls[project] || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={`${project} (${projectFullNames[project] || project})`}
              className="rounded bg-accent-band px-2 py-0.5 text-xs font-medium text-accent-deep no-underline hover:bg-accent"
            >
              {project}
            </a>
          ))}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-black">{resource.name}</h3>

      {/* Published date and venue */}
      {resource.type === "Publication" && resource.publishedYear && (
        <p className="text-xs text-gray-400">
          {formatPublishedDate(resource.publishedYear, resource.publishedMonth, resource.publishedDay)}
          {resource.venue && <>{" "}&middot; {resource.venue}</>}
        </p>
      )}

      {/* DOI */}
      {resource.type === "Publication" && resource.doi && (
        <p className="text-xs text-gray-400">
          <a
            href={resource.doi}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-1 underline-offset-2 hover:text-gray-600"
          >
            {resource.doi.replace("https://doi.org/", "doi:")}
          </a>
        </p>
      )}

      {/* Contributors */}
      {resource.type === "Publication" && resource.contributors && resource.contributors.length > 0 && (
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
                  className="inline-flex items-center gap-0.5 underline decoration-1 underline-offset-2 hover:text-gray-800"
                >
                  {c.name}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="inline-block h-3 w-3 flex-shrink-0">
                    <circle cx="128" cy="128" r="128" fill="#A6CE39"/>
                    <path fill="#fff" d="M86.3 186.2H70.9V79.1h15.4v107.1zM78.6 50.4c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zM146.1 79.1h-33.6v107.1h33.6c37.2 0 54.2-25.7 54.2-53.6 0-28-17-53.5-54.2-53.5zm-18.2 91.7V94.6h18.2c28.5 0 38.2 21.2 38.2 38.1 0 16.9-9.7 38.1-38.2 38.1h-18.2z"/>
                  </svg>
                </a>
              ) : (
                <span>{c.name}</span>
              )}
            </span>
          ))}
        </p>
      )}

      {/* Description */}
      <TruncatedText text={resource.description} />

      {/* GitHub release */}
      {resource.githubRelease && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          <span title="Latest release version">{resource.githubRelease.version}</span>
          <span title="Release date">
            Released {new Date(resource.githubRelease.date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
      )}

      {/* BioPortal metrics */}
      {resource.bioportal && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          {resource.bioportal.classes != null && (
            <span title="Number of classes in this ontology">{resource.bioportal.classes.toLocaleString()} classes</span>
          )}
          {resource.bioportal.properties != null && (
            <span title="Number of properties">{resource.bioportal.properties} properties</span>
          )}
          {resource.bioportal.hasOntologyLanguage && (
            <span title="Ontology language">{resource.bioportal.hasOntologyLanguage}</span>
          )}
          {resource.bioportal.released && (
            <span title="Last released on BioPortal">
              Released {new Date(resource.bioportal.released).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
            </span>
          )}
        </div>
      )}

      {/* BSSO Foundry badge */}
      {resource.type === "Ontology" && resource.bssoFoundry && (
        <div className="text-xs">
          <span
            title="Member of the Behavioural and Social Sciences Ontology Foundry — a community of interoperable ontologies"
            className="cursor-help rounded border border-stone-300 px-2 py-0.5 font-medium text-stone-400"
          >
            BSSO Foundry
          </span>
        </div>
      )}

      {/* Links */}
      {resource.links && resource.links.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-accent-hairline/50 pt-3">
          {resource.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={platformTooltips[link.platform] || "Visit external link"}
              className="inline-flex items-center gap-1 text-sm underline decoration-1 underline-offset-2 transition-colors text-accent-dark hover:text-accent-hover"
            >
              <PlatformGlyph platform={link.platform} size={15} />
              {platformLabels[link.platform] || link.platform}
            </a>
          ))}
        </div>
      )}
      {/* Edit on GitHub */}
      {resource._sourcePath && (
        <div className="flex justify-end">
          <a
            href={`https://github.com/Accelerate-BASSO/portal/edit/main/${resource._sourcePath}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Edit this resource on GitHub"
            className="inline-flex items-center gap-1 text-xs text-gray-300 no-underline hover:text-gray-500"
          >
            <Pencil size={11} />
            Edit
          </a>
        </div>
      )}
    </div>
  );
}
