#!/usr/bin/env python3
"""
Annotates publications with ontology terms by dictionary-matching the lexicon
(data/ontology-lexicon.json, built by scripts/build-term-lexicon.py) over each
paper's abstract and locally cached full text. Writes
data/paper-annotations-cache.json.

Matching is case-insensitive, word-boundary, longest-match-wins (so a match on
"smoking cessation" is not also counted as "smoking"). Full text is read from
the gitignored .cache/fulltext/ XML written by fetch-paper-content.py; when a
paper has no cached full text, only its abstract is annotated.

Usage:
    python scripts/annotate-papers.py
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict


def load_json(path: str):
    with open(path) as f:
        return json.load(f)


def jats_text(xml_path: str) -> str:
    """Extract readable body text from a JATS full-text XML file."""
    try:
        root = ET.parse(xml_path).getroot()
    except Exception:
        return ""
    body = root.find("body")
    if body is None:
        return ""
    # Join all descendant text; the matcher only needs a bag of words.
    return re.sub(r"\s+", " ", " ".join(body.itertext()))


def build_matcher(lexicon: list[dict]):
    """Build one big alternation regex over all surface forms, plus a map from
    lowercased form -> list of term entries that use it. Longest forms first so
    the regex prefers the longest match at a given position."""
    form_to_terms: dict[str, list[dict]] = defaultdict(list)
    for term in lexicon:
        for form in term["forms"]:
            form_to_terms[form.lower()].append(term)
    # Sort by length desc so alternation is longest-match-preferring.
    forms = sorted(form_to_terms.keys(), key=len, reverse=True)
    pattern = re.compile(
        r"\b(" + "|".join(re.escape(f) for f in forms) + r")\b",
        re.IGNORECASE,
    )
    return pattern, form_to_terms


def annotate_text(text: str, pattern, form_to_terms) -> dict[str, int]:
    """Return {iri: count} of term matches in text."""
    counts: dict[str, int] = defaultdict(int)
    for m in pattern.finditer(text):
        for term in form_to_terms[m.group(0).lower()]:
            counts[term["iri"]] += 1
    return counts


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lexicon_file = os.path.join(repo_root, "data", "ontology-lexicon.json")
    content_file = os.path.join(repo_root, "data", "paper-content-cache.json")
    fulltext_dir = os.path.join(repo_root, ".cache", "fulltext")
    out_file = os.path.join(repo_root, "data", "paper-annotations-cache.json")

    if not os.path.exists(lexicon_file):
        print("Error: run build-term-lexicon.py first.", file=sys.stderr)
        sys.exit(1)
    lexicon = load_json(lexicon_file)
    content = load_json(content_file) if os.path.exists(content_file) else {}

    pattern, form_to_terms = build_matcher(lexicon)
    term_by_iri = {t["iri"]: t for t in lexicon}

    annotations = {}
    for resource_id, entry in content.items():
        abstract = entry.get("abstract") or ""
        abstract_counts = annotate_text(abstract, pattern, form_to_terms)

        fulltext_counts: dict[str, int] = {}
        xml_path = os.path.join(fulltext_dir, f"{resource_id}.xml")
        if os.path.exists(xml_path):
            fulltext_counts = annotate_text(
                jats_text(xml_path), pattern, form_to_terms
            )

        iris = set(abstract_counts) | set(fulltext_counts)
        if not iris:
            continue
        terms = []
        for iri in iris:
            t = term_by_iri[iri]
            in_abstract = iri in abstract_counts
            terms.append(
                {
                    "iri": iri,
                    "curie": iri.rsplit("/", 1)[-1].rsplit("#", 1)[-1],
                    "prefLabel": t["prefLabel"],
                    "ontology": t["ontology"],
                    # Surface forms actually present, for synonym indexing downstream.
                    "forms": t["forms"],
                    "count": abstract_counts.get(iri, 0) + fulltext_counts.get(iri, 0),
                    # Abstract matches are higher-confidence (dense, curated text).
                    "source": "abstract" if in_abstract else "fulltext",
                }
            )
        # Most-mentioned first; abstract matches ahead of full-text-only at ties.
        terms.sort(key=lambda x: (x["source"] != "abstract", -x["count"]))
        annotations[resource_id] = terms

    with open(out_file, "w") as f:
        json.dump(annotations, f, indent=2, ensure_ascii=False)

    total = sum(len(v) for v in annotations.values())
    print(
        f"Annotated {len(annotations)} publications with {total} term mentions "
        f"(avg {total / max(len(annotations), 1):.1f}/paper) -> "
        f"{os.path.relpath(out_file, repo_root)}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
