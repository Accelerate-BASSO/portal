"use client";

import { useState } from "react";
import type { TermAnnotation } from "@/lib/resources";

// Per-group display caps (collapsed / expanded). The full annotation set can run
// to ~90 terms with a noisy tail; the display shows a confident, grouped subset.
const TOP_N = 6;
const MAX_SHOWN = 15;

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

// Display groups, in order. "subject" is derived here (abstract-matched terms),
// not from the facet field; the rest come from each term's BFO-derived facet.
type Group = "subject" | "method" | "population" | "other";
const GROUP_LABELS: Record<Group, string> = {
  subject: "Subject",
  method: "Method & intervention",
  population: "Population & context",
  other: "Other concepts",
};
const GROUP_ORDER: Group[] = ["subject", "method", "population", "other"];

interface ResourceTermsProps {
  annotations: TermAnnotation[];
}

function TermChip({ a }: { a: TermAnnotation }) {
  return (
    <a
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
  );
}

function TermGroup({ label, terms }: { label: string; terms: TermAnnotation[] }) {
  const [expanded, setExpanded] = useState(false);
  if (terms.length === 0) return null;
  const shown = expanded ? terms.slice(0, MAX_SHOWN) : terms.slice(0, TOP_N);
  const hidden = terms.length - shown.length;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {shown.map((a) => (
          <TermChip key={a.iri} a={a} />
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
              <span
                className="px-1 py-0.5 text-gray-400"
                title="More terms matched; capped for readability"
              >
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

export default function ResourceTerms({ annotations }: ResourceTermsProps) {
  if (annotations.length === 0) return null;

  // Show only confident matches: from the abstract (dense, curated) or mentioned
  // more than once. A single incidental full-text mention is usually a generic
  // word that happens to be an ontology label, not a topic of the paper.
  const confident = annotations.filter((a) => a.source === "abstract" || a.count >= 2);
  const filtered = confident.length > 0 ? confident : annotations;
  // Collapse same-label terms across ontologies (they read as duplicates); keep
  // the first, which is the highest-salience instance.
  const seen = new Set<string>();
  const pool = filtered.filter((a) => {
    const key = a.prefLabel.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Group: abstract terms are the paper's subject; the rest fall to their facet.
  const groups: Record<Group, TermAnnotation[]> = {
    subject: [], method: [], population: [], other: [],
  };
  for (const a of pool) {
    if (a.source === "abstract") groups.subject.push(a);
    else groups[a.facet ?? "other"].push(a);
  }

  return (
    <div className="space-y-2 text-xs">
      {GROUP_ORDER.map((g) => (
        <TermGroup key={g} label={GROUP_LABELS[g]} terms={groups[g]} />
      ))}
    </div>
  );
}
