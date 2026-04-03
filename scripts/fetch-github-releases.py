#!/usr/bin/env python3
"""
Fetches latest release info from GitHub for resources that have a GitHub link.
Writes results to data/github-releases-cache.json.

Usage:
    python scripts/fetch-github-releases.py

Environment:
    GITHUB_TOKEN — optional, increases rate limit
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


def find_yaml_files(directory: str) -> list[str]:
    results = []
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith(".yaml"):
                results.append(os.path.join(root, f))
    return sorted(results)


def extract_github_repos(resources_dir: str) -> dict[str, str]:
    """Find resources with GitHub links.
    Returns dict mapping resource id -> 'owner/repo'."""
    repos = {}
    for filepath in find_yaml_files(resources_dir):
        with open(filepath) as f:
            resource = yaml.safe_load(f)
        # Only fetch for tools and repositories
        if resource.get("type") not in ("Tool", "Repository"):
            continue
        for link in resource.get("links", []):
            if link.get("platform") == "GitHub" and link.get("url"):
                match = re.search(r"github\.com/([^/]+/[^/]+?)(?:\.git)?(?:/|$)", link["url"])
                if match:
                    repos[resource["id"]] = match.group(1)
    return repos


def fetch_latest_release(owner_repo: str, token: str | None) -> dict | None:
    """Fetch latest release from GitHub API."""
    url = f"https://api.github.com/repos/{owner_repo}/releases/latest"
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return {
            "version": data.get("tag_name", ""),
            "date": data.get("published_at", "")[:10],
        }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"  No releases found for {owner_repo}", file=sys.stderr)
        else:
            print(f"  Error fetching {owner_repo}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error fetching {owner_repo}: {e}", file=sys.stderr)
        return None


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resources_dir = os.path.join(repo_root, "data", "resources")
    cache_file = os.path.join(repo_root, "data", "github-releases-cache.json")

    token = os.environ.get("GITHUB_TOKEN")

    repos = extract_github_repos(resources_dir)
    print(f"Found {len(repos)} tools/repositories with GitHub links.", file=sys.stderr)

    cache = {}
    for resource_id, owner_repo in repos.items():
        print(f"  Fetching {owner_repo}...", file=sys.stderr)
        release = fetch_latest_release(owner_repo, token)
        if release:
            cache[resource_id] = release

    with open(cache_file, "w") as f:
        json.dump(cache, f, indent=2)

    print(f"Wrote {len(cache)} entries to {os.path.relpath(cache_file, repo_root)}", file=sys.stderr)


if __name__ == "__main__":
    main()
