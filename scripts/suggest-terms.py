#!/usr/bin/env python3
"""
Drafts curated ontology-term suggestions into each publication's YAML, as a
commented-out `ontologyTerms:` block for a curator to accept/edit.

The published portal shows only the *curated* `ontologyTerms` a human has signed
off (see lib/resources.ts). This script seeds that curation from the automated
annotations (scripts/annotate-papers.py + assign-term-facets.py): for each
publication it appends a commented block listing the confident suggested terms,
grouped by facet, each pre-filled with iri / prefLabel / ontology and a
best-guess facet key. The curator uncomments the keepers, fixes facets, deletes
the rest, and may add unbacked concept terms (prefLabel + facet, no iri).

It never touches an existing (uncommented) `ontologyTerms:` block, and it
replaces any previous suggestion block it wrote (delimited by markers), so
re-running refreshes suggestions without clobbering curation.

Usage:
    python scripts/suggest-terms.py
"""

import json
import os
import sys

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required.", file=sys.stderr)
    sys.exit(1)

BEGIN = "# --- suggested ontologyTerms (review & uncomment; delete this block) ---"
END = "# --- end suggested ontologyTerms ---"
# Confidence gate mirrors the display: abstract match, or mentioned >= 2 times.
MIN_COUNT = 2


def load_facets(repo_root):
    f = os.path.join(repo_root, "data", "facets.yaml")
    doc = yaml.safe_load(open(f)) if os.path.exists(f) else {}
    facets = sorted(doc.get("facets", []), key=lambda x: x.get("order", 99))
    return [x["key"] for x in facets]


def confident(terms):
    seen, out = set(), []
    for t in sorted(terms, key=lambda x: (x["source"] != "abstract", -x["count"])):
        if not (t["source"] == "abstract" or t["count"] >= MIN_COUNT):
            continue
        key = t["prefLabel"].lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(t)
    return out


def facet_of(t):
    # Subject = abstract-matched; else the BFO-derived facet (default other).
    return "subject" if t["source"] == "abstract" else t.get("facet", "other")


def strip_previous_block(text):
    if BEGIN not in text:
        return text
    before, _, rest = text.partition(BEGIN)
    _, _, after = rest.partition(END)
    return before.rstrip() + "\n" + after.lstrip("\n")


def suggestion_block(terms, facet_order):
    lines = [BEGIN, "# ontologyTerms:"]
    by_facet = {}
    for t in terms:
        by_facet.setdefault(facet_of(t), []).append(t)
    for facet in facet_order:
        group = by_facet.get(facet, [])
        if not group:
            continue
        lines.append(f"#   # {facet}")
        for t in group:
            # Quote the label as a YAML flow scalar on a single line (safe_dump
            # would append a "..." document-end marker, which corrupts the file).
            label = json.dumps(t["prefLabel"], ensure_ascii=False)
            lines.append(f"#   - prefLabel: {label}")
            lines.append(f"#     facet: {facet}")
            lines.append(f"#     ontology: {t['ontology']}")
            lines.append(f"#     iri: {t['iri']}")
    lines.append(END)
    return "\n".join(lines)


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ann_file = os.path.join(repo_root, "data", "paper-annotations-cache.json")
    pubs_dir = os.path.join(repo_root, "data", "resources", "publications")

    if not os.path.exists(ann_file):
        print("Error: run annotate-papers.py and assign-term-facets.py first.", file=sys.stderr)
        sys.exit(1)
    annotations = json.load(open(ann_file))
    facet_order = load_facets(repo_root)

    updated = 0
    for fname in sorted(os.listdir(pubs_dir)):
        if not fname.endswith(".yaml"):
            continue
        path = os.path.join(pubs_dir, fname)
        text = open(path).read()
        doc = yaml.safe_load(text)
        rid = doc.get("id")
        terms = confident(annotations.get(rid, []))
        if not terms:
            continue

        text = strip_previous_block(text).rstrip() + "\n"
        text += suggestion_block(terms, facet_order) + "\n"
        with open(path, "w") as f:
            f.write(text)
        updated += 1
        print(f"  {fname}: {len(terms)} suggestions", file=sys.stderr)

    print(f"Wrote suggestion blocks into {updated} publication files.", file=sys.stderr)


if __name__ == "__main__":
    main()
