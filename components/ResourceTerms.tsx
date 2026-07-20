"use client";

import { useState } from "react";
import type { TermAnnotation } from "@/lib/resources";

// Collapsed and expanded display caps. The full annotation set can run to ~90
// terms with a noisy single-mention tail; the display shows a confident subset.
const TOP_N = 8;
const MAX_SHOWN = 20;

// Muted, ontology-distinct chip tints. Automated annotations are shown more
// quietly than curated keywords — outlined, not filled — to signal provenance.
const ontologyTint: Record<string, string> = {
  PHASES: "border-sky-300 text-sky-700",
  BCIO: "border-emerald-300 text-emerald-700",
  ADDICTO: "border-amber-300 text-amber-700",
  MFOEM: "border-rose-300 text-rose-700",
  MF: "border-violet-300 text-violet-700",
  GMHO: "border-teal-300 text-teal-700",
  OMRSE: "border-indigo-300 text-indigo-700",
  COPPER: "border-orange-300 text-orange-700",
};

interface ResourceTermsProps {
  annotations: TermAnnotation[];
}

export default function ResourceTerms({ annotations }: ResourceTermsProps) {
  const [expanded, setExpanded] = useState(false);
  if (annotations.length === 0) return null;

  // Show only confident matches: from the abstract (dense, curated) or mentioned
  // more than once. A single incidental full-text mention is usually a generic
  // word that happens to be an ontology label, not a topic of the paper.
  const confident = annotations.filter((a) => a.source === "abstract" || a.count >= 2);
  // Fall back to the raw list if the filter left nothing (short papers).
  const filtered = confident.length > 0 ? confident : annotations;
  // Collapse same-label terms from different ontologies (they read as
  // duplicates); keep the first, which is the highest-salience instance.
  const seen = new Set<string>();
  const pool = filtered.filter((a) => {
    const key = a.prefLabel.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // annotations arrive sorted by salience (abstract-first, then count).
  const shown = expanded ? pool.slice(0, MAX_SHOWN) : pool.slice(0, TOP_N);
  const hidden = pool.length - shown.length;

  return (
    <div className="text-xs">
      <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">
        Ontology terms
      </p>
      <div className="flex flex-wrap gap-1">
        {shown.map((a) => (
          <a
            key={a.iri}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${a.prefLabel} — ${a.ontology} (${a.count} mention${a.count === 1 ? "" : "s"})\n${a.url}`}
            className={`rounded border bg-white px-1.5 py-0.5 font-medium no-underline hover:bg-gray-50 ${
              ontologyTint[a.ontology] || "border-gray-300 text-gray-600"
            }`}
          >
            {a.prefLabel}
          </a>
        ))}
        {!expanded && hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-1 py-0.5 text-gray-400 underline hover:text-gray-600"
          >
            +{hidden} more
          </button>
        )}
        {expanded && (
          <>
            {hidden > 0 && (
              <span className="px-1 py-0.5 text-gray-400" title="More terms matched; capped for readability">
                +{hidden} not shown
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-1 py-0.5 text-gray-400 underline hover:text-gray-600"
            >
              show fewer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
