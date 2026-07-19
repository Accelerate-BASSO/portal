import Link from "next/link";
import { Network } from "lucide-react";
import type { RelatedOntology } from "@/lib/resource-utils";

interface RelatedOntologiesProps {
  ontologies: RelatedOntology[];
}

/**
 * Links a resource to the portal ontology entries it is annotated against —
 * the ontologies it "talks about". Each chip scrolls to that ontology's card
 * (/resources#<id>). One chip per distinct ontology, not per term.
 */
export default function RelatedOntologies({ ontologies }: RelatedOntologiesProps) {
  if (ontologies.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-gray-400">
        <Network size={12} strokeWidth={2} />
        Ontologies
      </span>
      {ontologies.map((o) => (
        <Link
          key={o.id}
          href={`/resources#${o.id}`}
          title={`${o.name} — ${o.termCount} term${o.termCount === 1 ? "" : "s"} mentioned; view in the portal`}
          className="rounded-full border border-accent-hairline bg-accent-band px-2 py-0.5 font-medium text-accent-deep no-underline hover:bg-accent"
        >
          {o.acronym}
        </Link>
      ))}
    </div>
  );
}
