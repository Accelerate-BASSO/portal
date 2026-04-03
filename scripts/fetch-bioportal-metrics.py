#!/usr/bin/env python3
"""
Fetches metrics from BioPortal for all ontologies that have a BioPortal link
in their resource YAML files. Writes results to data/bioportal-cache.json.

Run as part of the build pipeline to keep metrics fresh.

Usage:
    python scripts/fetch-bioportal-metrics.py

Environment:
    BIOPORTAL_API_KEY — API key (defaults to the public key)
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

# Public BioPortal API key
DEFAULT_API_KEY = "8b5b7825-538d-40e0-9e9e-5ab9274a9aeb"


def find_yaml_files(directory: str) -> list[str]:
    results = []
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith(".yaml"):
                results.append(os.path.join(root, f))
    return sorted(results)


def extract_bioportal_acronyms(resources_dir: str) -> dict[str, str]:
    """Find all ontology resources with BioPortal links.
    Returns dict mapping resource id -> BioPortal acronym."""
    acronyms = {}
    for filepath in find_yaml_files(resources_dir):
        with open(filepath) as f:
            resource = yaml.safe_load(f)
        if resource.get("type") != "Ontology":
            continue
        for link in resource.get("links", []):
            if link.get("platform") == "BioPortal" and link.get("url"):
                # Extract acronym from URL like https://bioportal.bioontology.org/ontologies/BCIO
                match = re.search(r"/ontologies/(\w+)", link["url"])
                if match:
                    acronyms[resource["id"]] = match.group(1)
    return acronyms


def fetch_metrics(acronym: str, api_key: str) -> dict | None:
    """Fetch metrics and submission metadata from BioPortal for an ontology."""
    base = "https://data.bioontology.org"
    headers = {"Authorization": f"apikey token={api_key}"}

    result = {}

    # Fetch metrics
    try:
        req = urllib.request.Request(f"{base}/ontologies/{acronym}/metrics", headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            metrics = json.loads(resp.read().decode("utf-8"))
        result["classes"] = metrics.get("classes")
        result["properties"] = metrics.get("properties")
        result["individuals"] = metrics.get("individuals")
        result["maxDepth"] = metrics.get("maxDepth")
    except Exception as e:
        print(f"  Warning: Could not fetch metrics for {acronym}: {e}", file=sys.stderr)

    # Fetch latest submission for release date, language, homepage
    try:
        req = urllib.request.Request(f"{base}/ontologies/{acronym}/latest_submission", headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            submission = json.loads(resp.read().decode("utf-8"))
        result["released"] = submission.get("released")
        result["hasOntologyLanguage"] = submission.get("hasOntologyLanguage")
        result["homepage"] = submission.get("homepage")
        result["status"] = submission.get("status")
        result["description"] = submission.get("description")
    except Exception as e:
        print(f"  Warning: Could not fetch submission for {acronym}: {e}", file=sys.stderr)

    return result if result else None


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resources_dir = os.path.join(repo_root, "data", "resources")
    cache_file = os.path.join(repo_root, "data", "bioportal-cache.json")

    api_key = os.environ.get("BIOPORTAL_API_KEY", DEFAULT_API_KEY)

    acronyms = extract_bioportal_acronyms(resources_dir)
    print(f"Found {len(acronyms)} ontologies with BioPortal links.", file=sys.stderr)

    cache = {}
    for resource_id, acronym in acronyms.items():
        print(f"  Fetching {acronym}...", file=sys.stderr)
        metrics = fetch_metrics(acronym, api_key)
        if metrics:
            cache[resource_id] = {
                "acronym": acronym,
                **metrics,
            }

    with open(cache_file, "w") as f:
        json.dump(cache, f, indent=2)

    print(f"Wrote {len(cache)} entries to {os.path.relpath(cache_file, repo_root)}", file=sys.stderr)


if __name__ == "__main__":
    main()
