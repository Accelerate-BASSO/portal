#!/usr/bin/env python3
"""
Resolves ORCIDs in existing resource YAML files using data/contributors.yaml.

Scans all YAML files under data/resources/ and fills in missing ORCIDs
for any contributors whose names match entries in contributors.yaml.

Usage:
    python scripts/resolve-orcids.py          # dry run — show what would change
    python scripts/resolve-orcids.py --apply  # apply changes to files
"""

import argparse
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


def load_known_contributors(repo_root: str) -> dict[str, str]:
    contributors_file = os.path.join(repo_root, "data", "contributors.yaml")
    if not os.path.exists(contributors_file):
        print(f"Error: {contributors_file} not found.", file=sys.stderr)
        sys.exit(1)

    with open(contributors_file) as f:
        data = yaml.safe_load(f)

    lookup = {}
    for entry in data.get("contributors", []):
        name = entry.get("name", "").strip()
        orcid = entry.get("orcid", "").strip()
        if name and orcid:
            lookup[name.lower()] = orcid
    return lookup


def find_yaml_files(directory: str) -> list[str]:
    results = []
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith(".yaml"):
                results.append(os.path.join(root, f))
    return sorted(results)


def resolve_file(filepath: str, known: dict[str, str], apply: bool) -> int:
    """Resolve ORCIDs in a single file. Returns count of resolved ORCIDs."""
    with open(filepath) as f:
        content = f.read()

    resource = yaml.safe_load(content)
    contributors = resource.get("contributors")
    if not contributors:
        return 0

    resolved_count = 0
    for c in contributors:
        name = c.get("name", "")
        if c.get("orcid"):
            continue
        orcid = known.get(name.lower())
        if orcid:
            resolved_count += 1
            rel_path = os.path.relpath(filepath)
            print(f"  {rel_path}: {name} -> {orcid}")

    if resolved_count > 0 and apply:
        # Apply changes by editing the raw YAML text to preserve formatting
        lines = content.splitlines()
        new_lines = []
        i = 0
        while i < len(lines):
            new_lines.append(lines[i])
            # Look for contributor name lines without an orcid on the next line
            match = re.match(r"^(\s+)- name:\s*(.+)$", lines[i])
            if match:
                indent = match.group(1)
                name = match.group(2).strip()
                # Check if next line is already an orcid
                has_orcid = (i + 1 < len(lines) and
                             re.match(r"^\s+orcid:", lines[i + 1]))
                if not has_orcid:
                    orcid = known.get(name.lower())
                    if orcid:
                        new_lines.append(f"{indent}  orcid: \"{orcid}\"")
            i += 1

        with open(filepath, "w") as f:
            f.write("\n".join(new_lines) + "\n")

    return resolved_count


def main():
    parser = argparse.ArgumentParser(
        description="Resolve missing ORCIDs in resource files from contributors.yaml."
    )
    parser.add_argument("--apply", action="store_true", help="Apply changes (default is dry run)")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resources_dir = os.path.join(repo_root, "data", "resources")

    known = load_known_contributors(repo_root)
    print(f"Loaded {len(known)} known contributors.", file=sys.stderr)

    files = find_yaml_files(resources_dir)
    total_resolved = 0

    for filepath in files:
        count = resolve_file(filepath, known, args.apply)
        total_resolved += count

    if total_resolved == 0:
        print("No missing ORCIDs to resolve.")
    elif args.apply:
        print(f"\nResolved {total_resolved} ORCIDs across resource files.")
    else:
        print(f"\n{total_resolved} ORCIDs can be resolved. Run with --apply to update files.")


if __name__ == "__main__":
    main()
