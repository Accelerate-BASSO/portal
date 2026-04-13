import type { Resource } from "@/lib/resources";
import { getAllProjects, effectiveDate } from "@/lib/resource-utils";
import { platformLabels, platformTooltips } from "./PlatformIcon";
import {
  ExternalLink,
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

const typeLinkColors: Record<string, string> = {
  Ontology: "text-[#7040C0] hover:text-[#5A30A0]",
  Publication: "text-[#D87030] hover:text-[#B86020]",
  Tool: "text-[#D4A820] hover:text-[#B08A10]",
  Community: "text-[#D02870] hover:text-[#B02060]",
  Repository: "text-emerald-600 hover:text-emerald-800",
  Dataset: "text-lime-600 hover:text-lime-800",
  Website: "text-[#4898E8] hover:text-[#3080D0]",
  Registry: "text-cyan-700 hover:text-cyan-900",
};

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

function formatDateShort(iso: string): string {
  // Expects YYYY-MM-DD (or YYYY-MM-01 fallback from effectiveDate)
  const [y, m] = iso.split("-");
  if (!m) return y;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m, 10) - 1;
  return `${monthNames[idx] || m} ${y}`;
}

interface ResourceListRowProps {
  resource: Resource;
}

export default function ResourceListRow({ resource }: ResourceListRowProps) {
  const Icon = typeIcons[resource.type];
  const date = effectiveDate(resource);
  const linkColor = typeLinkColors[resource.type] || "text-gray-500 hover:text-gray-800";

  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 px-3 py-3 transition-colors last:border-b-0 hover:bg-gray-50">
      {/* Line 1: type icon + name + projects */}
      <div className="flex items-start gap-2">
        {Icon && (
          <Icon
            size={16}
            strokeWidth={2}
            className={`mt-0.5 flex-shrink-0 ${typeIconColors[resource.type] || "text-gray-500"}`}
          />
        )}
        <h3 className="flex-1 text-sm font-semibold text-black">{resource.name}</h3>
        <div className="flex flex-shrink-0 items-center gap-1">
          {getAllProjects(resource).map((project) => (
            <a
              key={project}
              href={projectUrls[project] || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={`${project} (${projectFullNames[project] || project})`}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 no-underline hover:bg-gray-200"
            >
              {project}
            </a>
          ))}
        </div>
      </div>

      {/* Line 2: type pill + date + links + edit */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[resource.type] || "bg-gray-100 text-gray-800"}`}
        >
          {resource.type}
        </span>
        {resource.bssoFoundry && (
          <span
            title="Member of the Behavioural and Social Sciences Ontology Foundry"
            className="cursor-help rounded border border-stone-300 px-1.5 py-0.5 text-[10px] font-medium text-stone-400"
          >
            BSSO Foundry
          </span>
        )}
        {date && (
          <span title={`Date: ${date}`} className="text-gray-400">
            {formatDateShort(date)}
          </span>
        )}
        {resource.venue && (
          <span title="Publication venue" className="truncate text-gray-400">
            {resource.venue}
          </span>
        )}
        <div className="flex flex-wrap gap-x-3">
          {resource.links?.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={platformTooltips[link.platform] || "Visit external link"}
              className={`inline-flex items-center gap-0.5 underline decoration-1 underline-offset-2 transition-colors ${linkColor}`}
            >
              {platformLabels[link.platform] || link.platform}
              <ExternalLink size={12} strokeWidth={3} />
            </a>
          ))}
        </div>
        {resource._sourcePath && (
          <a
            href={`https://github.com/Accelerate-BASSO/portal/edit/main/${resource._sourcePath}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Edit this resource on GitHub"
            className="ml-auto inline-flex items-center gap-0.5 text-gray-300 no-underline hover:text-gray-500"
          >
            <Pencil size={10} />
            Edit
          </a>
        )}
      </div>
    </div>
  );
}
