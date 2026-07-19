"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { TermOption } from "@/lib/resource-utils";

// Ontologies in a sensible display order; PHASES (the network's own) first,
// then the Foundry ontologies. Any others fall to the end alphabetically.
const ONTOLOGY_ORDER = ["PHASES", "BCIO", "ADDICTO", "MFOEM", "MF", "GMHO", "OMRSE", "COPPER"];
const TOP_N = 8;

function orderOntologies(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const ia = ONTOLOGY_ORDER.indexOf(a);
    const ib = ONTOLOGY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

interface OntologyTermFilterProps {
  /** Term options grouped by ontology (already filtered to shared terms). */
  groups: Map<string, TermOption[]>;
  selectedTerms: Set<string>;
  /** Live count of resources each term would match under the other filters. */
  termCounts: Record<string, number>;
  onToggle: (iri: string) => void;
}

export default function OntologyTermFilter({
  groups,
  selectedTerms,
  termCounts,
  onToggle,
}: OntologyTermFilterProps) {
  // Ontology groups start collapsed except the first; "show all" is per-group.
  const ordered = orderOntologies([...groups.keys()]);
  // The whole section is collapsed by default — expanded, it's tall.
  const [sectionOpen, setSectionOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(ordered.slice(0, 1)),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (ordered.length === 0) return null;

  const selectedCount = [...selectedTerms].filter((iri) =>
    ordered.some((onto) => (groups.get(onto) ?? []).some((t) => t.iri === iri)),
  ).length;
  const SectionChevron = sectionOpen ? ChevronDown : ChevronRight;

  const toggleOpen = (onto: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(onto) ? next.delete(onto) : next.add(onto);
      return next;
    });
  const toggleExpanded = (onto: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(onto) ? next.delete(onto) : next.add(onto);
      return next;
    });

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        aria-expanded={sectionOpen}
        className="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-deep/60 hover:text-accent-deep"
      >
        <SectionChevron size={14} strokeWidth={2} />
        Ontology terms
        {selectedCount > 0 && (
          <span className="rounded-full bg-accent-deep px-1.5 text-[10px] font-semibold normal-case text-white">
            {selectedCount} selected
          </span>
        )}
      </button>
      {!sectionOpen ? null : (
      <div className="mt-2 space-y-2">
        {ordered.map((onto) => {
          const terms = groups.get(onto) ?? [];
          const isOpen = openGroups.has(onto);
          const isExpanded = expandedGroups.has(onto);
          const visible = isExpanded ? terms : terms.slice(0, TOP_N);
          const selectedInGroup = terms.filter((t) => selectedTerms.has(t.iri)).length;
          const Chevron = isOpen ? ChevronDown : ChevronRight;
          return (
            <div key={onto} className="rounded-md border border-accent-hairline bg-white/50">
              <button
                type="button"
                onClick={() => toggleOpen(onto)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold text-accent-deep"
              >
                <Chevron size={14} strokeWidth={2} className="text-gray-400" />
                {onto}
                <span className="font-normal text-gray-400">{terms.length}</span>
                {selectedInGroup > 0 && (
                  <span className="ml-auto rounded-full bg-accent-deep px-1.5 text-[10px] font-semibold text-white">
                    {selectedInGroup}
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-2 px-3 pb-3">
                  {visible.map((t) => {
                    const active = selectedTerms.has(t.iri);
                    const count = termCounts[t.iri] ?? 0;
                    return (
                      <button
                        key={t.iri}
                        onClick={() => onToggle(t.iri)}
                        title={`Filter by resources mentioning ${t.prefLabel}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-accent-deep text-white"
                            : "border border-accent-hairline bg-white text-gray-600 hover:border-accent-dark"
                        } ${count === 0 && !active ? "opacity-40" : ""}`}
                      >
                        {t.prefLabel}
                        <span
                          className={`inline-block min-w-[1.25rem] text-center text-xs font-semibold ${
                            active ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  {terms.length > TOP_N && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(onto)}
                      className="text-xs text-accent-dark underline hover:text-accent-hover"
                    >
                      {isExpanded ? "Show fewer" : `Show all ${terms.length}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
