#!/usr/bin/env python3
"""
Validate the resource metadata files under data/resources/.

Checks every file against the schema documented in docs/resource-schema.md:
common required fields, controlled vocabularies (type, project names,
link platforms), type-specific fields (e.g. ontologies need bssoFoundry,
publications need publishedYear/venue), date formats, and globally unique ids.

Usage:
    python scripts/validate-resources.py

Exits 0 if all files are valid, 1 (printing the problems) otherwise.
"""
import glob
import os
import re
import sys

import yaml

TYPES = {
    "Ontology", "Publication", "Website", "Repository",
    "Registry", "Community", "Tool", "Dataset",
}
PROJECTS = {"APRICOT", "BSO-AD", "ODFA", "PHASES", "DCC"}
PLATFORMS = {
    "GitHub", "BioPortal", "OLS", "Ontobee", "Zenodo",
    "OSF", "Website", "Discourse", "Other",
}
# subdirectory name -> expected type
DIR_TYPE = {
    "ontologies": "Ontology", "publications": "Publication", "websites": "Website",
    "repositories": "Repository", "registries": "Registry", "communities": "Community",
    "tools": "Tool", "datasets": "Dataset",
}
# Type-specific fields, each mapped to the set of types it may appear on.
TYPE_SPECIFIC_FIELDS = {
    "bssoFoundry": {"Ontology"},
    "publishedYear": {"Publication"},
    "publishedMonth": {"Publication"},
    "publishedDay": {"Publication"},
    "venue": {"Publication"},
    "pmid": {"Publication"},
    "contributors": {"Publication"},
    "doi": {"Publication", "Dataset"},
    "license": {"Ontology", "Tool", "Repository", "Dataset"},
}
# (`keywords` was publication-only when it held imported keywords; it is now the
#  common curated field, formerly `tags`.)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
COMMON_REQUIRED = [
    "id", "name", "type", "description",
    "producedByProjects", "usedByProjects", "links", "keywords", "lastUpdated",
]


def validate_file(path, ids, errors):
    rel = os.path.relpath(path)

    try:
        with open(path) as f:
            d = yaml.safe_load(f)
    except yaml.YAMLError as e:
        errors.append(f"{rel}: not valid YAML: {e}")
        return
    if not isinstance(d, dict):
        errors.append(f"{rel}: top level must be a mapping.")
        return

    def err(msg):
        errors.append(f"{rel}: {msg}")

    for field in COMMON_REQUIRED:
        if field not in d:
            err(f"missing required field `{field}`.")

    rid = d.get("id")
    if rid is not None:
        if not isinstance(rid, str) or not re.match(r"^[a-z0-9-]+$", rid):
            err(f"`id` {rid!r} must be lowercase kebab-case.")
        elif rid in ids:
            err(f"duplicate id {rid!r} (also in {ids[rid]}).")
        else:
            ids[rid] = rel

    rtype = d.get("type")
    if rtype is not None and rtype not in TYPES:
        err(f"unknown type {rtype!r} (allowed: {', '.join(sorted(TYPES))}).")

    # type must match the directory the file lives in
    parent = os.path.basename(os.path.dirname(path))
    expected = DIR_TYPE.get(parent)
    if expected and rtype and rtype != expected:
        err(f"type {rtype!r} does not match directory {parent}/ (expects {expected}).")

    for key in ("producedByProjects", "usedByProjects"):
        val = d.get(key)
        if val is not None:
            if not isinstance(val, list):
                err(f"`{key}` must be a list (use [] if none).")
            else:
                for p in val:
                    if p not in PROJECTS:
                        err(f"`{key}` has unknown project {p!r} "
                            f"(allowed: {', '.join(sorted(PROJECTS))}).")

    links = d.get("links")
    if links is not None:
        if not isinstance(links, list) or not links:
            err("`links` must be a non-empty list — every resource needs at least one link.")
        else:
            for i, ln in enumerate(links):
                if not isinstance(ln, dict):
                    err(f"link[{i}] must be a mapping.")
                    continue
                if not ln.get("label"):
                    err(f"link[{i}] missing `label`.")
                if not ln.get("url"):
                    err(f"link[{i}] missing `url`.")
                if ln.get("platform") not in PLATFORMS:
                    err(f"link[{i}] has unknown platform {ln.get('platform')!r} "
                        f"(allowed: {', '.join(sorted(PLATFORMS))}).")

    lu = d.get("lastUpdated")
    if lu is not None and not DATE_RE.match(str(lu)):
        err(f"`lastUpdated` {lu!r} must be YYYY-MM-DD.")

    for key in ("keywords",):
        if key in d and not isinstance(d[key], list):
            err(f"`{key}` must be a list (use [] if none).")

    # --- type-specific rules ---
    if rtype == "Ontology":
        if not isinstance(d.get("bssoFoundry"), bool):
            err("ontology requires boolean `bssoFoundry`.")

    if rtype == "Publication":
        if not isinstance(d.get("publishedYear"), int):
            err("publication requires integer `publishedYear`.")
        for key in ("publishedMonth", "publishedDay"):
            if key in d and not isinstance(d[key], int):
                err(f"`{key}` must be an integer.")
        if not d.get("venue"):
            err("publication requires `venue`.")
        if "contributors" in d:
            for i, c in enumerate(d["contributors"] or []):
                if not isinstance(c, dict) or not c.get("name"):
                    err(f"contributor[{i}] must have a `name`.")

    # Type-specific fields must not appear on a type that doesn't allow them.
    for field, allowed in TYPE_SPECIFIC_FIELDS.items():
        if field in d and rtype not in allowed:
            err(f"`{field}` is only valid on {' / '.join(sorted(allowed))} "
                f"resources, not {rtype}.")


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resources_dir = os.path.join(root, "data", "resources")
    files = sorted(glob.glob(os.path.join(resources_dir, "**", "*.yaml"), recursive=True))

    if not files:
        print(f"No resource files found under {resources_dir}.", file=sys.stderr)
        return 1

    ids: dict[str, str] = {}
    errors: list[str] = []
    for f in files:
        validate_file(f, ids, errors)

    if errors:
        print(f"Found {len(errors)} problem(s) in resource files:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(f"All {len(files)} resource files OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
