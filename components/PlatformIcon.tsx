interface PlatformIconProps {
  platform: string;
  colorClass?: string;
  className?: string;
}

export const platformLabels: Record<string, string> = {
  GitHub: "GitHub",
  BioPortal: "BioPortal",
  Zenodo: "Zenodo",
  OSF: "OSF",
  Website: "Web",
  Discourse: "Discourse",
  OLS: "OLS",
  Ontobee: "Ontobee",
  Other: "Link",
};

const platformColors: Record<string, string> = {
  GitHub: "border border-gray-300 text-gray-600 bg-transparent",
  BioPortal: "border border-gray-300 text-gray-600 bg-transparent",
  Zenodo: "border border-gray-300 text-gray-600 bg-transparent",
  OSF: "border border-gray-300 text-gray-600 bg-transparent",
  Website: "border border-gray-300 text-gray-600 bg-transparent",
  Discourse: "border border-gray-300 text-gray-600 bg-transparent",
  OLS: "border border-gray-300 text-gray-600 bg-transparent",
  Ontobee: "border border-gray-300 text-gray-600 bg-transparent",
  Other: "border border-gray-300 text-gray-600 bg-transparent",
};

export const platformTooltips: Record<string, string> = {
  GitHub: "View on GitHub — source code, releases, and issue tracking",
  BioPortal: "View on BioPortal — browse ontology classes and relationships",
  Zenodo: "View on Zenodo — archived release with a DOI",
  OSF: "View on OSF — publications and datasets",
  Website: "Visit the resource website",
  Discourse: "Visit the Discourse community forum",
  OLS: "View on OLS — the EMBL-EBI Ontology Lookup Service",
  Ontobee: "View on Ontobee — linked data server for OBO ontologies",
  Other: "Visit external link",
};

export default function PlatformIcon({ platform, colorClass, className = "" }: PlatformIconProps) {
  const colors = colorClass || platformColors[platform] || platformColors.Other;
  return (
    <span
      title={platformTooltips[platform] || platformTooltips.Other}
      className={`inline-flex cursor-help items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors} ${className}`}
    >
      {platformLabels[platform] || platform}
    </span>
  );
}
