"use client";

import { useState } from "react";
import type { CuratedTerm, Facet } from "@/lib/resources";

const TOP_N = 8;
const MAX_SHOWN = 20;

interface ResourceTermsProps {
  terms: CuratedTerm[];
  facets: Facet[];
}

function TermChip({ t, tint }: { t: CuratedTerm; tint: string }) {
  const className = `rounded border bg-white px-1.5 py-0.5 font-medium ${tint}`;
  // Ontology-backed terms link out; unbacked concept terms render as plain chips.
  if (t.iri && t.url) {
    return (
      <a
        href={t.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`${t.prefLabel} — ${t.ontology}\n${t.url}`}
        className={`${className} no-underline hover:bg-gray-50`}
      >
        {t.prefLabel}
      </a>
    );
  }
  return (
    <span title={`${t.prefLabel} (concept — no ontology term)`} className={className}>
      {t.prefLabel}
    </span>
  );
}

function FacetGroup({ label, tint, terms }: { label: string; tint: string; terms: CuratedTerm[] }) {
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
        {shown.map((t) => (
          <TermChip key={t.iri ?? t.prefLabel} t={t} tint={tint} />
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

export default function ResourceTerms({ terms, facets }: ResourceTermsProps) {
  if (!terms || terms.length === 0) return null;

  const byFacet = new Map<string, CuratedTerm[]>();
  for (const t of terms) {
    const list = byFacet.get(t.facet) ?? [];
    list.push(t);
    byFacet.set(t.facet, list);
  }

  return (
    <div className="space-y-2 text-xs">
      {facets.map((f) => (
        <FacetGroup key={f.key} label={f.label} tint={f.tint ?? "border-gray-300 text-gray-600"} terms={byFacet.get(f.key) ?? []} />
      ))}
    </div>
  );
}
