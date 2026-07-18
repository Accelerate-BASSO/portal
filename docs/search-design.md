# Search design (Phase B)

Status: agreed direction, 2026-07-18. Extends `docs/content-indexing-plan.md`.
Not yet implemented.

## Goal

Replace substring search with a ranked lexical search that also indexes each
resource's **ontology-term annotations** (labels + synonyms), so users who don't know
the network's terminology can still find resources, and matched terms become
first-class filters. Fully static — no backend, no query-time ML.

## What exists today

`components/ResourceBrowser.tsx` is a client component holding all resources in
memory. Search (lines 135–139) is `String.includes()` over `name`, `description`,
`keywords`, recomputed in a `useMemo`. Type/Project/Foundry are filter chips with
live counts. No ranking, no index, no typo tolerance.

## Agreed decisions

1. **Terms are both searchable text and filters.** Term labels + synonyms go into the
   free-text index (synonym expansion), and matched terms are exposed as filter chips
   alongside Type/Project.
2. **Real lexical index (MiniSearch),** not extended substring — relevance ranking,
   prefix + fuzzy matching, per-field boosting.
3. **Index built in-browser on load** from the annotated resource JSON already shipped.
   No prebuilt index artifact unless cold-start becomes noticeable.
4. **Match provenance shown** — when a hit came from an annotation or the abstract
   rather than the visible name, the card says so (e.g. "matched: smoking cessation").

## Sequencing (agreed 2026-07-18)

Ship in two steps; the ranked synonym-aware **search** is separable from the **term
facet**, and the facet's main open question (volume) answers itself once real
annotation data exists.

- **Step 1 — ranked synonym-aware search.** Decisions 2, 3, 4, and the *searchable-text*
  half of decision 1. MiniSearch index over name/keywords/term-labels/term-synonyms/
  description/abstract, relevance ranking, provenance display. This is the high-value,
  lower-risk piece.
- **Step 2 — ontology-term facet.** The *filter-chip* half of decision 1. Deferred until
  Step 1 is live and we can measure how many distinct terms real annotation produces,
  which decides the facet layout (top-N vs. grouped vs. searchable).

Note both steps depend on the annotation cache existing. Step 1 can begin against
name/keywords/description + abstract as soon as Phase A's `paper-content-cache.json` is
wired into `getAllResources()`; term-label/synonym fields switch on when
`paper-annotations-cache.json` (Phase B lexicon + annotation) lands.

## Data flow

Following the existing enrichment pattern (offline script → cache in `data/` →
merged in `lib/resources.ts`):

- Phase A `paper-content-cache.json` → adds `abstract` to publication resources.
- Phase B `paper-annotations-cache.json` → adds `annotations` to resources:
  `[{ iri, curie, prefLabel, ontology, synonyms: string[], source: "abstract"|"fulltext", count }]`.
- `getAllResources()` merges both by `id`, exactly as it merges bioportal/github
  caches today. No change to the YAML files.

The browser receives resources already carrying `abstract` + `annotations`. Nothing
new is fetched at runtime.

## The index

Built once on the client (in a `useMemo`) with MiniSearch:

- **Documents:** one per resource.
- **Indexed fields, with boosts:** `name` (highest), `keywords`, `prefLabels` (of
  annotated terms), `synonyms` (of annotated terms), `description`, `abstract`
  (lowest). Boosts make a title hit outrank an abstract hit.
- **Synonym expansion is achieved by indexing synonyms as document text** — no
  query-side expansion, no query embedding. This is the mechanism that solves the
  wrong-terminology case.
- **Options:** prefix matching on, low fuzz (~0.2) for typo tolerance, per-field
  boosts as above. `storeFields` keeps the resource `id` so results map back to the
  full object.
- Search returns ranked ids + per-result `match` metadata (which terms/fields hit),
  which we keep for provenance display.

## UI changes to ResourceBrowser

- **Ranking:** when `search !== ""`, order results by MiniSearch score instead of the
  current sort; the Sort control applies only when there's no query (or offer a
  "Relevance" sort key that's implicit while searching). *(Open — see below.)*
- **Term facet:** a new chip group ("Ontology terms") built from the union of
  annotations across the *currently filtered* set, with counts, behaving like the
  Type/Project chips. Selecting a term filters to resources annotated with it. Likely
  collapsed/scrollable since there can be many terms.
- **Provenance:** on cards/rows whose match came from a synonym/abstract (not the
  name), show a small "matched: «label» (ONTOLOGY)" line, derived from MiniSearch
  match metadata. Not shown when the name itself matched.
- Existing Type/Project/Foundry filters and their count logic are unchanged; the term
  facet participates in the same "apply all filters except this one" counting.

## Deliberately out of scope (Phase C)

Neural/embedding search. The synonym-indexing approach is expected to cover most of
the terminology-gap cases; we evaluate remaining gaps before adding embeddings.

## Open questions

- **Relevance vs. Sort:** does the Sort dropdown get a "Relevance" entry that's forced
  while a query is active, or does searching silently override sort? Leaning: add
  "Relevance", auto-selected when a query is present.
- **Term facet volume:** with abstracts+fulltext annotated, the term list could be
  long. Cap to top-N by frequency? Group by ontology? Search-within-facet?
- **Which synonyms to index:** exact synonyms only, or also broad/narrow? Broader =
  more recall, more noise. Ties to the lexicon-build decision in the indexing plan.
- **Annotation display elsewhere:** the paper↔ontology cross-links (terms-on-paper,
  papers-on-ontology) from the indexing plan are related but separate from search;
  sequence after search or alongside?
