import MiniSearch, { type SearchResult } from "minisearch";
import type { Resource } from "./resources";

/**
 * Lexical search over resources (Phase B, step 1).
 *
 * The index covers the curated metadata, each publication's fetched abstract,
 * and the labels + synonyms of the ontology terms it was annotated with, with
 * field boosts so a name hit outranks a body hit. Indexing term synonyms as
 * document text is what gives synonym expansion: a query in lay terms matches a
 * paper annotated with the technical term, with no query-time machinery.
 */

/** Fields extracted per resource for indexing. */
interface IndexDoc {
  id: string;
  name: string;
  keywords: string;
  description: string;
  abstract: string;
  // Populated once resources carry ontology-term annotations.
  prefLabels: string;
  synonyms: string;
}

const SEARCH_FIELDS = [
  "name",
  "keywords",
  "prefLabels",
  "synonyms",
  "description",
  "abstract",
] as const;

// Higher = more influence on rank. A title match should beat a body match.
const FIELD_BOOSTS: Record<string, number> = {
  name: 6,
  keywords: 4,
  prefLabels: 4,
  synonyms: 3,
  description: 2,
  abstract: 1,
};

function toDoc(r: Resource): IndexDoc {
  const annotations = r.annotations ?? [];
  // Index automated-annotation labels plus the curator-asserted term labels, so
  // both the recall-oriented matches and the authoritative curated terms are
  // findable.
  const prefLabels = [
    ...annotations.map((a) => a.prefLabel),
    ...(r.ontologyTerms ?? []).map((t) => t.prefLabel),
  ];
  // All surface forms except the prefLabel are synonyms; index them so a lay
  // query resolves to the paper carrying the technical term.
  const synonyms = annotations.flatMap((a) =>
    a.forms.filter((f) => f.toLowerCase() !== a.prefLabel.toLowerCase())
  );
  return {
    id: r.id,
    name: r.name,
    keywords: r.keywords.join(" "),
    description: r.description,
    abstract: r.paperContent?.abstract ?? "",
    prefLabels: prefLabels.join(" "),
    synonyms: synonyms.join(" "),
  };
}

export function buildIndex(resources: Resource[]): MiniSearch<IndexDoc> {
  const index = new MiniSearch<IndexDoc>({
    fields: [...SEARCH_FIELDS],
    storeFields: ["id"],
    searchOptions: {
      boost: FIELD_BOOSTS,
      prefix: true,
      fuzzy: 0.2,
      combineWith: "AND",
    },
  });
  index.addAll(resources.map(toDoc));
  return index;
}

export interface SearchHit {
  id: string;
  score: number;
  /** Index field names that contributed to this hit (for provenance display). */
  matchedFields: string[];
}

export function runSearch(
  index: MiniSearch<IndexDoc>,
  query: string,
): SearchHit[] {
  if (query.trim() === "") return [];
  return index.search(query).map((r: SearchResult) => ({
    id: r.id as string,
    score: r.score,
    matchedFields: [...new Set(Object.values(r.match).flat())],
  }));
}
