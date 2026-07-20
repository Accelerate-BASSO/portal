#!/usr/bin/env python3
"""
Builds a term lexicon (labels + synonyms) from the BSSO Foundry ontologies plus
the network's own PHASES ontology, for annotating publications (see
scripts/annotate-papers.py). Writes data/ontology-lexicon.json.

Terms come from the EBI OLS4 API for the six Foundry ontologies it hosts, and
from the BioPortal REST API for PHASES, RBBO, and COPPER (which OLS4 does not
serve terms for). Only each ontology's own terms are kept — via OLS4's
`is_defining_ontology` flag, or by an id-space check on the IRI for BioPortal —
so imported upper-level terms (BFO, RO) don't pollute the lexicon.

Both sources return JSON; no OWL/RDF parser is needed.

Usage:
    python scripts/build-term-lexicon.py

Environment:
    BIOPORTAL_API_KEY — BioPortal key (defaults to the public key)
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request

OLS4_BASE = "https://www.ebi.ac.uk/ols4/api"
USER_AGENT = "accelerate-basso-portal (https://github.com/Accelerate-BASSO/portal)"

# Foundry ontologies OLS4 hosts (lowercased acronyms). These carry the
# is_defining_ontology flag we use to drop imported terms.
OLS4_ONTOLOGIES = ["addicto", "bcio", "gmho", "mf", "mfoem", "omrse"]

# Ontologies OLS4 does not serve terms for, fetched from BioPortal's REST API
# (JSON — no OWL parser needed). PHASES is the network's own ontology and has no
# terms on OLS4; RBBO and COPPER are BSSO Foundry ontologies OLS4 lacks. Each
# maps to its BioPortal id-space prefix, used to keep only own-namespace terms
# (BioPortal returns imported classes too).
BIOPORTAL_ONTOLOGIES = {
    "PHASES": "PHASES_",
    "COPPER": "COPPER_",
}

# RBBO (Relationships Between Behaviours Ontology) is a BSSO Foundry ontology
# that is on neither OLS4 nor BioPortal; its only public source is the OWL at
# https://github.com/fatibaba/turbbo (RBBO.owl). It is therefore not yet in the
# lexicon. Adding it needs an OWL parser (rdflib), deferred to avoid a new
# dependency for one ontology. This is the single known coverage gap.
MISSING_ONTOLOGIES = ["RBBO"]
BIOPORTAL_BASE = "https://data.bioontology.org"
BIOPORTAL_KEY = os.environ.get(
    "BIOPORTAL_API_KEY", "8b5b7825-538d-40e0-9e9e-5ab9274a9aeb"
)

# Curation: drop labels/synonyms that are too general to be useful annotations.
# Two mechanisms, both reviewable here:
#  1. A stoplist of exact surface forms to drop. Split into upper-ontology jargon
#     and common-English words that are also ontology labels — the latter were
#     identified empirically as the dominant false positives (they matched in
#     ~half the papers while saying nothing about topic; see the annotation
#     noise analysis).
#  2. A length floor, and a rule that single-word forms must clear a higher bar
#     (STOPLIST membership aside, multi-word domain phrases are almost always
#     signal, bare common nouns almost always noise).
MIN_LENGTH = 4

# Upper-ontology / structural terms.
STOPLIST_STRUCTURAL = {
    "role", "quality", "process", "person", "entity", "continuant", "occurrent",
    "disposition", "function", "capability", "object", "thing", "state", "part",
    "whole", "material", "value", "measurement", "data", "information", "content",
    "characteristic", "attribute", "realizable", "specifically", "generically",
}
# Common English words that are also ontology labels — high-recall noise.
STOPLIST_GENERIC = {
    "communication", "knowledge", "discussion", "language", "learning",
    "representation", "literature", "single", "building", "interest", "goal",
    "money", "intelligence", "decision", "policy", "employed", "professional",
    "theory", "individual", "population", "behaviour", "action", "response",
    "meaning", "experience", "belief", "identity", "feeling", "emotion",
    # Second tier, from annotation-noise review: repeated ordinary words that
    # survived the count>=2 display filter while saying nothing about topic.
    # Deliberately excludes borderline-real terms (study arm, questionnaire,
    # child/adult demographics) — pruning only clear general-language noise.
    "follow-up", "parent", "awareness", "cleaning", "problem solving",
    "location", "country", "planning", "wanting", "facility", "concern",
    "confusion", "medicine",
}
STOPLIST = STOPLIST_STRUCTURAL | STOPLIST_GENERIC


def fetch_json(url: str) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  Warning: fetch failed ({url}): {e}", file=sys.stderr)
        return None


def normalize(text: str) -> str:
    """Trim, drop a trailing period, collapse whitespace. Keeps original case;
    matching is case-insensitive downstream."""
    return re.sub(r"\s+", " ", text.strip().rstrip(".")).strip()


def keep(term: str) -> bool:
    t = term.strip().lower()
    if len(t) < MIN_LENGTH or t in STOPLIST:
        return False
    # Deprecated classes are labelled "obsolete ..." by OBO convention; they
    # should never be suggested as annotations.
    if t.startswith("obsolete"):
        return False
    return True


def fetch_ols4_ontology(acronym: str) -> list[dict]:
    """Page all defining terms of an OLS4 ontology, returning
    [{iri, ontology, label, synonyms:[...]}]."""
    entries = []
    size = 500
    page = 0
    while True:
        url = f"{OLS4_BASE}/ontologies/{acronym}/terms?size={size}&page={page}"
        data = fetch_json(url)
        if not data:
            break
        terms = data.get("_embedded", {}).get("terms", [])
        for t in terms:
            if not t.get("is_defining_ontology"):
                continue
            iri = t.get("iri")
            label = t.get("label")
            if not iri or not label:
                continue
            synonyms = [s for s in (t.get("synonyms") or []) if isinstance(s, str)]
            entries.append(
                {
                    "iri": iri,
                    "ontology": acronym.upper(),
                    "label": label,
                    "synonyms": synonyms,
                }
            )
        info = data.get("page", {})
        if page >= info.get("totalPages", 1) - 1:
            break
        page += 1
    print(f"  {acronym.upper()}: {len(entries)} defining terms", file=sys.stderr)
    return entries


def fetch_bioportal_ontology(acronym: str, idspace: str) -> list[dict]:
    """Page all own-namespace classes of a BioPortal ontology via the REST API,
    returning [{iri, ontology, label, synonyms:[...]}]. Uses JSON, no OWL parser.
    BioPortal returns imported classes too, so keep only those whose IRI carries
    the ontology's own id-space (e.g. PHASES_)."""
    entries = []
    page = 1
    while True:
        params = urllib.parse.urlencode(
            {"apikey": BIOPORTAL_KEY, "pagesize": 500, "page": page,
             "include": "prefLabel,synonym"}
        )
        data = fetch_json(f"{BIOPORTAL_BASE}/ontologies/{acronym}/classes?{params}")
        if not data:
            break
        for c in data.get("collection", []):
            iri = c.get("@id")
            label = c.get("prefLabel")
            if not iri or not label or idspace not in iri.upper():
                continue
            synonyms = [s for s in (c.get("synonym") or []) if isinstance(s, str)]
            entries.append(
                {"iri": iri, "ontology": acronym, "label": label, "synonyms": synonyms}
            )
        if page >= data.get("pageCount", 1):
            break
        page += 1
    print(f"  {acronym}: {len(entries)} own-namespace terms (BioPortal)", file=sys.stderr)
    return entries


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_file = os.path.join(repo_root, "data", "ontology-lexicon.json")

    raw_entries: list[dict] = []
    for acronym in OLS4_ONTOLOGIES:
        raw_entries.extend(fetch_ols4_ontology(acronym))
    for acronym, idspace in BIOPORTAL_ONTOLOGIES.items():
        raw_entries.extend(fetch_bioportal_ontology(acronym, idspace))

    # Build the lexicon: one entry per term, with a curated, normalized,
    # de-duplicated set of matchable surface forms (label + exact synonyms).
    lexicon = []
    dropped = 0
    for e in raw_entries:
        # Skip deprecated classes entirely (OBO labels them "obsolete ...").
        if normalize(e["label"]).lower().startswith("obsolete"):
            continue
        forms = {}
        for surface in [e["label"], *e["synonyms"]]:
            norm = normalize(surface)
            if norm and keep(norm):
                forms[norm.lower()] = norm  # de-dupe case-insensitively, keep a display form
            else:
                dropped += 1
        if not forms:
            continue
        lexicon.append(
            {
                "iri": e["iri"],
                "ontology": e["ontology"],
                "prefLabel": normalize(e["label"]),
                "forms": sorted(forms.values(), key=str.lower),
            }
        )

    with open(out_file, "w") as f:
        json.dump(lexicon, f, indent=2, ensure_ascii=False)

    total_forms = sum(len(t["forms"]) for t in lexicon)
    by_onto = {}
    for t in lexicon:
        by_onto[t["ontology"]] = by_onto.get(t["ontology"], 0) + 1
    print(
        f"Wrote {len(lexicon)} terms ({total_forms} surface forms; "
        f"{dropped} forms dropped by curation) to "
        f"{os.path.relpath(out_file, repo_root)}",
        file=sys.stderr,
    )
    print(f"  By ontology: {by_onto}", file=sys.stderr)
    if MISSING_ONTOLOGIES:
        print(
            f"  Not covered (no OLS4/BioPortal source): {', '.join(MISSING_ONTOLOGIES)}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
