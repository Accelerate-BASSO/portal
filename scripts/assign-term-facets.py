#!/usr/bin/env python3
"""
Assigns a facet to each ontology-term annotation, so the portal can group a
paper's terms into what it is *about* vs. its method, population, etc.

Reads data/paper-annotations-cache.json (from annotate-papers.py), fetches the
BFO upper-ontology ancestry for each distinct annotated term, and derives a
facet from it:

  subject     the paper's conceptual contribution — assigned in the UI from
              abstract-matched terms, NOT here (this script never emits it)
  method      the term is a process / planned process (a BCT, a delivery mode,
              an analysis method, …)
  population   the term is a role, or a person / organism (who/where/context)
  other       anything else (dispositions, qualities, information artifacts, …)

Ancestry comes from OLS4 for the six Foundry ontologies it hosts, and from
BioPortal for PHASES and COPPER (which OLS4 lacks terms for). Ancestry is cached
in .cache/term-ancestry.json (gitignored) so reruns don't refetch.

Usage:
    python scripts/assign-term-facets.py

Environment:
    BIOPORTAL_API_KEY — BioPortal key (defaults to the public key)
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

OLS4_BASE = "https://www.ebi.ac.uk/ols4/api"
BIOPORTAL_BASE = "https://data.bioontology.org"
BIOPORTAL_KEY = os.environ.get("BIOPORTAL_API_KEY", "8b5b7825-538d-40e0-9e9e-5ab9274a9aeb")
USER_AGENT = "accelerate-basso-portal (https://github.com/Accelerate-BASSO/portal)"

# Ontologies served for terms by OLS4; the rest go to BioPortal.
OLS4_ONTOLOGIES = {"ADDICTO", "BCIO", "GMHO", "MF", "MFOEM", "OMRSE"}

# Lowercased ancestor prefLabels that, if present in a term's ancestry, place it
# in a facet. Checked most-specific facet first (method, then population).
METHOD_ANCESTORS = {"planned process", "process", "occurrent"}
POPULATION_ANCESTORS = {
    "role", "person", "human being", "organism", "material entity",
    "population", "group of humans",
}


def fetch_json(url: str, headers: dict | None = None):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def ols_ancestors(acronym: str, iri: str) -> list[str] | None:
    enc = urllib.parse.quote(urllib.parse.quote(iri, safe=""), safe="")
    data = fetch_json(
        f"{OLS4_BASE}/ontologies/{acronym.lower()}/terms/{enc}/hierarchicalAncestors?size=100"
    )
    if not data:
        return None
    terms = data.get("_embedded", {}).get("terms", [])
    return [t.get("label", "") for t in terms]


def bioportal_ancestors(acronym: str, iri: str) -> list[str] | None:
    enc = urllib.parse.quote(iri, safe="")
    data = fetch_json(
        f"{BIOPORTAL_BASE}/ontologies/{acronym}/classes/{enc}/ancestors?apikey={BIOPORTAL_KEY}"
    )
    if not isinstance(data, list):
        return None
    return [c.get("prefLabel", "") for c in data]


def facet_from_ancestry(ancestry: list[str]) -> str:
    labels = {a.lower() for a in ancestry if a}
    if labels & POPULATION_ANCESTORS:
        return "population"
    if labels & METHOD_ANCESTORS:
        return "method"
    return "other"


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ann_file = os.path.join(repo_root, "data", "paper-annotations-cache.json")
    cache_dir = os.path.join(repo_root, ".cache")
    ancestry_cache_file = os.path.join(cache_dir, "term-ancestry.json")

    if not os.path.exists(ann_file):
        print("Error: run annotate-papers.py first.", file=sys.stderr)
        sys.exit(1)
    annotations = json.load(open(ann_file))

    # Distinct (iri, ontology) across all papers.
    distinct: dict[str, str] = {}
    for terms in annotations.values():
        for t in terms:
            distinct[t["iri"]] = t["ontology"]

    os.makedirs(cache_dir, exist_ok=True)
    ancestry = json.load(open(ancestry_cache_file)) if os.path.exists(ancestry_cache_file) else {}

    todo = [(iri, onto) for iri, onto in distinct.items() if iri not in ancestry]

    def fetch(item):
        iri, ontology = item
        if ontology in OLS4_ONTOLOGIES:
            anc = ols_ancestors(ontology, iri)
        else:
            anc = bioportal_ancestors(ontology, iri)
        if anc is None:
            print(f"  Warning: no ancestry for {iri} ({ontology})", file=sys.stderr)
            anc = []
        return iri, anc

    # Ancestry fetches are independent I/O; run them concurrently. A modest pool
    # keeps within the public APIs' rate limits while cutting wall-clock time.
    if todo:
        print(f"  Fetching ancestry for {len(todo)} new terms...", file=sys.stderr)
        with ThreadPoolExecutor(max_workers=8) as pool:
            for iri, anc in pool.map(fetch, todo):
                ancestry[iri] = anc

    with open(ancestry_cache_file, "w") as f:
        json.dump(ancestry, f)
    fetched = len(todo)

    # Stamp each annotation with its facet.
    facet_counts: dict[str, int] = {}
    for terms in annotations.values():
        for t in terms:
            facet = facet_from_ancestry(ancestry.get(t["iri"], []))
            t["facet"] = facet
            facet_counts[facet] = facet_counts.get(facet, 0) + 1

    with open(ann_file, "w") as f:
        json.dump(annotations, f, indent=2, ensure_ascii=False)

    print(
        f"Assigned facets to {sum(len(v) for v in annotations.values())} annotations "
        f"across {len(distinct)} distinct terms "
        f"({fetched} ancestry fetched, {len(distinct) - fetched} cached). "
        f"Facets: {facet_counts}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
