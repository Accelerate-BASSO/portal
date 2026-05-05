#!/usr/bin/env python3
"""
Compares current BioPortal metrics against a baseline to detect new releases.

Usage:
    python scripts/check-ontology-updates.py \
        --previous data/bioportal-baseline.json \
        --current data/bioportal-cache.json \
        --output-dir /tmp/updates

Writes one markdown file per updated ontology (named `<ACRONYM>.md`) into
the output directory, and emits `has_updates` and a space-separated
`acronyms` list to GITHUB_OUTPUT.
"""

import argparse
import json
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Check for ontology updates on BioPortal.")
    parser.add_argument("--previous", required=True, help="Path to previous baseline JSON")
    parser.add_argument("--current", required=True, help="Path to current BioPortal cache JSON")
    parser.add_argument("--output-dir", required=True, help="Directory to write per-ontology markdown reports")
    args = parser.parse_args()

    # Load current
    with open(args.current) as f:
        current = json.load(f)

    # Load previous baseline (empty if first run)
    if os.path.exists(args.previous):
        with open(args.previous) as f:
            previous = json.load(f)
    else:
        previous = {}

    updates = []

    for resource_id, cur in current.items():
        acronym = cur.get("acronym", resource_id)
        cur_released = cur.get("released", "")
        cur_classes = cur.get("classes")

        prev = previous.get(resource_id, {})
        prev_released = prev.get("released", "")
        prev_classes = prev.get("classes")

        changes = []

        if cur_released and cur_released != prev_released:
            if prev_released:
                changes.append(f"Release date changed: {prev_released[:10]} → {cur_released[:10]}")
            else:
                changes.append(f"New release: {cur_released[:10]}")

        if cur_classes is not None and prev_classes is not None and cur_classes != prev_classes:
            diff = cur_classes - prev_classes
            sign = "+" if diff > 0 else ""
            changes.append(f"Class count: {prev_classes} → {cur_classes} ({sign}{diff})")

        if changes:
            updates.append({
                "acronym": acronym,
                "resource_id": resource_id,
                "changes": changes,
                "classes": cur_classes,
                "released": cur_released,
            })

    # Also check for new ontologies not in the baseline
    for resource_id in current:
        if resource_id not in previous:
            acronym = current[resource_id].get("acronym", resource_id)
            if not any(u["resource_id"] == resource_id for u in updates):
                updates.append({
                    "acronym": acronym,
                    "resource_id": resource_id,
                    "changes": ["Newly tracked ontology"],
                    "classes": current[resource_id].get("classes"),
                    "released": current[resource_id].get("released", ""),
                })

    has_updates = len(updates) > 0
    github_output = os.environ.get("GITHUB_OUTPUT")

    os.makedirs(args.output_dir, exist_ok=True)

    acronyms = []
    for update in updates:
        acronym = update["acronym"]
        acronyms.append(acronym)

        lines = [f"## Ontology Update Detected: {acronym}", ""]
        for change in update["changes"]:
            lines.append(f"- {change}")
        if update.get("classes"):
            lines.append(f"- Current class count: {update['classes']}")
        lines.append(f"- [View on BioPortal](https://bioportal.bioontology.org/ontologies/{acronym})")
        lines.append("")
        lines.append("---")
        lines.append("*This issue was created automatically by the daily ontology update check.*")

        with open(os.path.join(args.output_dir, f"{acronym}.md"), "w") as f:
            f.write("\n".join(lines))

    if github_output:
        with open(github_output, "a") as f:
            f.write(f"has_updates={'true' if has_updates else 'false'}\n")
            f.write(f"acronyms={' '.join(acronyms)}\n")

    if not has_updates:
        print("No ontology updates detected.", file=sys.stderr)
        return

    print(f"Found updates for {len(updates)} ontologies: {', '.join(acronyms)}", file=sys.stderr)


if __name__ == "__main__":
    main()
