#!/usr/bin/env python3
"""
Fetches publication content from Europe PMC for all Publication resources that
have a pmid or doi. Writes abstracts and availability info to
data/paper-content-cache.json; downloads open-access full-text XML to
.cache/fulltext/ (gitignored, input to later annotation/indexing steps only —
full text is never committed).

Usage:
    python scripts/fetch-paper-content.py [--force]

Options:
    --force  Re-download full-text XML even if already present in .cache/fulltext/
"""

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

EPMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest"
USER_AGENT = "accelerate-basso-portal (https://github.com/Accelerate-BASSO/portal)"


def find_yaml_files(directory: str) -> list[str]:
    results = []
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith(".yaml"):
                results.append(os.path.join(root, f))
    return sorted(results)


def load_publications(resources_dir: str) -> list[dict]:
    publications = []
    for filepath in find_yaml_files(resources_dir):
        with open(filepath) as f:
            resource = yaml.safe_load(f)
        if resource.get("type") == "Publication":
            publications.append(resource)
    return publications


def normalize_doi(doi: str) -> str:
    """Strip the resolver prefix from a DOI stored as a URL."""
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", doi.strip())


def strip_markup(text: str) -> str:
    """Remove HTML/JATS markup and collapse whitespace in abstract text."""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def epmc_search(query: str) -> dict | None:
    """Run a Europe PMC search and return the first result, or None."""
    params = urllib.parse.urlencode(
        {"query": query, "format": "json", "resultType": "core", "pageSize": 1}
    )
    url = f"{EPMC_BASE}/search?{params}"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  Warning: Europe PMC search failed ({query}): {e}", file=sys.stderr)
        return None
    results = data.get("resultList", {}).get("result", [])
    return results[0] if results else None


def lookup_publication(pub: dict) -> dict | None:
    """Find a publication in Europe PMC by pmid, falling back to doi."""
    pmid = pub.get("pmid")
    if pmid:
        result = epmc_search(f"EXT_ID:{pmid} AND SRC:MED")
        if result:
            return result
    doi = pub.get("doi")
    if doi:
        return epmc_search(f'DOI:"{normalize_doi(doi)}"')
    return None


def fetch_url(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
        return body or None
    except Exception:
        return None


def fetch_epmc_fulltext(pmcid: str) -> bytes | None:
    """Fetch full-text JATS XML from Europe PMC by PMC id (with 'PMC' prefix)."""
    return fetch_url(f"{EPMC_BASE}/{pmcid}/fullTextXML")


def fetch_publisher_fulltext(doi: str, cc_licensed: bool) -> bytes | None:
    """Fetch full-text XML via the publisher's Crossref-advertised text-mining
    link. Fetches only when the article is CC-licensed, per Europe PMC
    (cc_licensed) or the Crossref license field — Europe PMC sometimes lacks
    the license on records whose Crossref entry has one."""
    body = fetch_url(f"https://api.crossref.org/works/{urllib.parse.quote(doi)}")
    if not body:
        return None
    try:
        message = json.loads(body.decode("utf-8"))["message"]
    except Exception:
        return None
    if not cc_licensed and not any(
        "creativecommons.org" in (lic.get("URL") or "")
        for lic in message.get("license", [])
    ):
        return None
    for link in message.get("link", []):
        if (
            link.get("intended-application") == "text-mining"
            and link.get("content-type") == "application/xml"
        ):
            return fetch_url(link["URL"])
    return None


def main():
    force = "--force" in sys.argv[1:]
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resources_dir = os.path.join(repo_root, "data", "resources")
    cache_file = os.path.join(repo_root, "data", "paper-content-cache.json")
    fulltext_dir = os.path.join(repo_root, ".cache", "fulltext")

    publications = load_publications(resources_dir)
    print(f"Found {len(publications)} publications.", file=sys.stderr)

    cache = {}
    for pub in publications:
        resource_id = pub["id"]
        if not pub.get("pmid") and not pub.get("doi"):
            print(f"  Skipping {resource_id}: no pmid or doi.", file=sys.stderr)
            continue

        print(f"  Fetching {resource_id}...", file=sys.stderr)
        result = lookup_publication(pub)
        if not result:
            print(f"  Warning: {resource_id} not found in Europe PMC.", file=sys.stderr)
            continue

        source = result.get("source")
        ext_id = result.get("id")
        pmcid = result.get("pmcid")
        entry = {
            "epmcSource": source,
            "epmcId": ext_id,
            "pmcid": pmcid,
            "doi": result.get("doi"),
            "isOpenAccess": result.get("isOpenAccess") == "Y",
            "license": result.get("license"),
            "retrieved": date.today().isoformat(),
        }

        abstract = result.get("abstractText")
        if abstract:
            entry["abstract"] = strip_markup(abstract)
        else:
            print(f"  Warning: no abstract for {resource_id}.", file=sys.stderr)

        # Full text: Europe PMC's open-access copy when it has one, otherwise
        # the publisher's Crossref-advertised text-mining XML for CC-licensed
        # articles (covers Wellcome Open Research, which Europe PMC indexes as
        # preprint records without full text).
        entry["fullTextCached"] = False
        in_epmc = pmcid and (entry["isOpenAccess"] or result.get("inEPMC") == "Y")
        cc_licensed = (result.get("license") or "").lower().startswith("cc")
        if in_epmc or result.get("doi"):
            os.makedirs(fulltext_dir, exist_ok=True)
            xml_file = os.path.join(fulltext_dir, f"{resource_id}.xml")
            if os.path.exists(xml_file) and not force:
                entry["fullTextCached"] = True
            else:
                body = fetch_epmc_fulltext(pmcid) if in_epmc else None
                if body:
                    entry["fullTextSource"] = "europepmc"
                elif result.get("doi"):
                    body = fetch_publisher_fulltext(result["doi"], cc_licensed)
                    if body:
                        entry["fullTextSource"] = "publisher"
                if body:
                    with open(xml_file, "wb") as f:
                        f.write(body)
                    entry["fullTextCached"] = True
                else:
                    print(f"  Warning: no openly licensed full text for {resource_id}.", file=sys.stderr)

        cache[resource_id] = entry

    with open(cache_file, "w") as f:
        json.dump(cache, f, indent=2)

    with_abstract = sum(1 for e in cache.values() if e.get("abstract"))
    with_fulltext = sum(1 for e in cache.values() if e["fullTextCached"])
    print(
        f"Wrote {len(cache)} entries to {os.path.relpath(cache_file, repo_root)} "
        f"({with_abstract} with abstracts, {with_fulltext} with cached full text).",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
