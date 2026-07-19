"use client";

import { useState } from "react";
import type { TermAnnotation } from "@/lib/resources";

const TOP_N = 8;

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

  // annotations arrive sorted by salience (abstract-first, then count).
  const shown = expanded ? annotations : annotations.slice(0, TOP_N);
  const hidden = annotations.length - shown.length;

  return (
    <div className="text-xs">
      <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">
        Ontology terms
      </p>
      <div className="flex flex-wrap gap-1">
        {shown.map((a) => (
          <a
            key={a.iri}
            href={a.iri}
            target="_blank"
            rel="noopener noreferrer"
            title={`${a.prefLabel} — ${a.ontology} (${a.count} mention${a.count === 1 ? "" : "s"})\n${a.iri}`}
            className={`rounded border bg-white px-1.5 py-0.5 font-medium no-underline hover:bg-gray-50 ${
              ontologyTint[a.ontology] || "border-gray-300 text-gray-600"
            }`}
          >
            {a.prefLabel}
          </a>
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-1 py-0.5 text-gray-400 underline hover:text-gray-600"
          >
            +{hidden} more
          </button>
        )}
        {expanded && annotations.length > TOP_N && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="px-1 py-0.5 text-gray-400 underline hover:text-gray-600"
          >
            show fewer
          </button>
        )}
      </div>
    </div>
  );
}
