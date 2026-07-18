# Content indexing plan

Status: agreed direction, 2026-07-18. Not yet implemented.

## Goal

Extend portal search beyond curated metadata (name, description, keywords) to the
content of publications, and couple search with ontology terms so that users who do
not know the network's terminology can still find resources. Eventually extend the
same approach to other resource types.

## Constraints and principles

- The portal is a static export with no backend and no API keys at runtime. All
  indexing happens offline; the browser only consumes precomputed artifacts.
- The portal is not a content repository. We commit **derived artifacts**
  (abstracts, term annotations, index structures, later embeddings) — never
  full text obtained from publishers.
- Follow the existing enrichment pattern: offline script → committed JSON cache in
  `data/` → merged into resources at build time by `lib/resources.ts` (as
  `bioportal-cache.json` and `github-releases-cache.json` already are).
- Every cached record carries provenance: source, identifier used, retrieval date.

## Agreed decisions

1. **Content scope:** abstracts for all publications (via Europe PMC / PubMed, using
   the existing `pmid`/`doi` fields), plus full text where openly available (PMC
   open-access subset; preprint servers — Europe PMC also indexes Research Square
   preprints). No scraping of paywalled publisher content.
2. **Query architecture:** lexical search with ontology-synonym expansion first,
   fully static. Neural embeddings are Phase C, layered on top as a hybrid; the
   query-time embedding mechanism (likely a browser-side model via transformers.js)
   is decided then, not now.
3. **Annotation lexicon:** built by us from the BSSO Foundry ontologies' OWL
   sources, not the BioPortal Annotator. Three of the eight Foundry ontologies
   (ADDICTO, GMHO, RBBO) are not in BioPortal, so the Annotator cannot cover them;
   a local lexicon is also deterministic and inspectable.

## Phase A — content acquisition pipeline

New script `scripts/fetch-paper-content.py`:

- For each publication with a `pmid` or `doi`, query Europe PMC
  (`/webservices/rest/search`) for the abstract, open-access status, and full-text
  availability; fetch full-text XML (`/fullTextXML`) for open-access articles.
- Committed output: `data/paper-content-cache.json` — abstract text, source,
  retrieval date, open-access status, full-text availability. Abstracts are the
  only primary text committed.
- Full text is written to a **gitignored** local cache (e.g. `.cache/fulltext/`)
  used only as input to the annotation/indexing scripts. Re-running the fetch
  script repopulates it on any machine.

## Phase B — ontology annotation and lexical search

### Lexicon

New script `scripts/build-term-lexicon.py`:

- Download the eight Foundry ontologies (sources already tracked for the release
  cache) and extract, per term: IRI, ontology, `rdfs:label`, synonyms
  (`oboInOwl:hasExactSynonym` and related properties, IAO alternative term).
- Restrict to each ontology's own namespace — imported upper-level terms (BFO, RO)
  are too generic to be useful annotations.
- Apply a curation layer: minimum label length, a stoplist for ambiguous
  general-language labels ("role", "quality", "person"), reviewable in the repo.
- Output: `data/ontology-lexicon.json`.

### Annotation

New script `scripts/annotate-papers.py`:

- Dictionary matching (case-insensitive, word-boundary, longest-match) of lexicon
  labels/synonyms over each paper's abstract and locally cached full text.
- Output: `data/paper-annotations-cache.json` — per publication: matched term IRI,
  ontology, label, match count, and whether the match came from the abstract or
  full text. Annotations are automated enrichment and are displayed as such,
  distinct from curated `keywords`.

### Build and UI

- `lib/resources.ts` merges abstract + annotations into publication resources at
  build time, alongside the existing enrichments. No schema change to the YAML
  files themselves; annotations live in caches, mirroring the BioPortal pattern.
- Search: replace/augment substring matching with a small client-side lexical index
  (e.g. MiniSearch) over name, description, keywords, abstract, and — key step —
  the labels **and synonyms** of each paper's annotated terms. Indexing synonyms as
  document terms gives synonym expansion without any query-time machinery: a search
  for "quitting smoking" finds papers annotated with *smoking cessation*.
- Cross-links: publication pages list "ontology terms mentioned"; ontology pages
  list "publications mentioning terms from this ontology". This term-usage link
  between network papers and network ontologies is a deliverable in its own right,
  independent of search.
- Facet/filter by ontology term is a possible follow-on once the data exists.

## Phase C — semantic search (deferred)

- Chunk abstracts/full text, embed at index time with a small sentence-embedding
  model, quantize, commit vectors to `data/` (at current scale: hundreds of chunks,
  a few hundred KB).
- Query-time embedding in the browser via transformers.js (one-time model download,
  no keys, keeps the static-export property), used to re-rank or blend with the
  lexical results. Evaluate whether Phase B already suffices before building this.

## Scale check

19 publications today, 40 resources total. Everything above is comfortably
client-side even at 10× growth; no server-side search is needed at any foreseeable
catalog size.

## Open questions

- Curation workflow for annotation quality: who reviews the stoplist and spot-checks
  matches, and do we want a per-paper override mechanism for false positives?
- Which synonym properties beyond exact synonyms to trust for matching (broad/narrow
  synonyms increase recall but add noise).
- Extension to other resource types (tool READMEs, website content) — same pipeline
  shape, different fetchers; revisit after publications work.
