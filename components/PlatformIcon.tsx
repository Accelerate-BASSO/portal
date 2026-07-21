interface PlatformIconProps {
  platform: string;
  colorClass?: string;
  className?: string;
}

/**
 * Flat monochrome glyph per link platform, drawn to sit with the lucide icons
 * used elsewhere: 16-unit viewBox, `currentColor` fill/stroke so it inherits the
 * link's text colour, no brand colours. Used as the trailing icon on resource
 * links so BioPortal / Ontobee / OLS / GitHub etc. are distinguishable at a
 * glance. Platforms without a specific glyph fall back to a generic
 * external-link mark.
 */
const PLATFORM_PATHS: Record<string, React.ReactNode> = {
  // GitHub — the Octocat silhouette, simplified to a single monochrome path.
  GitHub: (
    <path fill="currentColor" d="M8 .8a7.2 7.2 0 0 0-2.28 14.03c.36.07.49-.16.49-.35v-1.24c-2 .43-2.42-.96-2.42-.96-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.47.25-.78.45-.96-1.6-.18-3.28-.8-3.28-3.56 0-.79.28-1.43.74-1.93-.07-.18-.32-.91.07-1.9 0 0 .6-.19 1.98.73a6.9 6.9 0 0 1 3.6 0c1.37-.92 1.97-.73 1.97-.73.39.99.14 1.72.07 1.9.46.5.74 1.14.74 1.93 0 2.77-1.69 3.38-3.29 3.56.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.35A7.2 7.2 0 0 0 8 .8Z" />
  ),
  // BioPortal — its swooshing orbit "O" mark, as two open elliptical arcs.
  BioPortal: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M12.6 5.4a5.6 3.4 28 1 0 1.2 3.2" />
      <path d="M3.4 10.6a5.6 3.4 28 1 0-1.2-3.2" />
    </g>
  ),
  // OLS (EBI Ontology Lookup Service) — its logo renders the letters as dotted
  // nodes; evoke that with a small connected-node network.
  OLS: (
    <g stroke="currentColor" strokeWidth="1.2" fill="currentColor">
      <path d="M4 4 8 5.5M12 4 8 5.5M8 5.5v4.5M4 12 8 10M12 12 8 10" fill="none" strokeLinecap="round" />
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="8" cy="5.5" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </g>
  ),
  // Ontobee — its logo is a magnifying glass over the wordmark's "O".
  Ontobee: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4" />
      <path d="M9.6 9.6 14 14" />
    </g>
  ),
  // Zenodo — an archive box.
  Zenodo: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M2 3.5h12v3H2zM3 6.5h10V14H3z" />
      <path d="M6.5 9.5h3" strokeLinecap="round" />
    </g>
  ),
  // OSF / Website / Discourse / Other reuse the generic external-link mark below.
};

const EXTERNAL_LINK = (
  <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h5v5M14 2 7 9M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5" />
  </g>
);

export function PlatformGlyph({ platform, size = 13 }: { platform: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="inline-block flex-shrink-0"
    >
      {PLATFORM_PATHS[platform] ?? EXTERNAL_LINK}
    </svg>
  );
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
