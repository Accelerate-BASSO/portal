#!/usr/bin/env python3
"""
Converts a BibTeX entry to a portal resource YAML file.

Usage:
    python scripts/bibtex-to-yaml.py input.bib --projects APRICOT PHASES
    cat input.bib | python scripts/bibtex-to-yaml.py --projects APRICOT
    python scripts/bibtex-to-yaml.py input.bib --projects ODFA --pubmed https://pubmed.ncbi.nlm.nih.gov/12345/ --output data/resources/pub-example.yaml

Options:
    --projects      Project names (e.g. APRICOT PHASES)
    --pubmed        PubMed URL
    --link          Additional link as "Label - URL" (can be repeated)
    --description   Override the generated description
    --output        Output file path (default: prints to stdout)

Requirements:
    pip install bibtexparser pyyaml
"""

import argparse
import re
import sys
from datetime import date

try:
    import bibtexparser
except ImportError:
    print("Error: bibtexparser is required. Install it with: pip install bibtexparser", file=sys.stderr)
    sys.exit(1)

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required. Install it with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


MONTH_MAP = {
    "jan": "01", "january": "01",
    "feb": "02", "february": "02",
    "mar": "03", "march": "03",
    "apr": "04", "april": "04",
    "may": "05",
    "jun": "06", "june": "06",
    "jul": "07", "july": "07",
    "aug": "08", "august": "08",
    "sep": "09", "september": "09",
    "oct": "10", "october": "10",
    "nov": "11", "november": "11",
    "dec": "12", "december": "12",
}


def parse_month(month_str: str) -> str | None:
    if not month_str:
        return None
    m = month_str.strip().lower()
    if m.isdigit():
        return m.zfill(2)
    return MONTH_MAP.get(m)


def clean_latex(text: str) -> str:
    """Remove common LaTeX artifacts from a string."""
    text = re.sub(r"[{}]", "", text)
    text = text.replace("\\&", "&")
    text = text.replace("\\textendash", "\u2013")
    text = text.replace("\\textemdash", "\u2014")
    text = text.replace("~", " ")
    text = re.sub(r"\\[a-zA-Z]+\s*", "", text)  # strip remaining commands
    text = re.sub(r"\s+", " ", text).strip()
    return text


def make_id(key: str, title: str) -> str:
    base = key if key else title
    slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")[:60]
    return f"pub-{slug}"


def extract_entry(bibtex_str: str) -> dict:
    parser = bibtexparser.bparser.BibTexParser(common_strings=True)
    library = bibtexparser.loads(bibtex_str, parser=parser)
    if not library.entries:
        print("Error: No BibTeX entries found in input.", file=sys.stderr)
        sys.exit(1)
    return library.entries[0]


def build_resource(entry: dict, args) -> dict:
    title = clean_latex(entry.get("title", "Untitled"))
    entry_key = entry.get("ID", "")
    resource_id = make_id(entry_key, title)

    # Date
    year = entry.get("year")
    month_str = entry.get("month")
    pub_year = int(year) if year else None
    pub_month = None
    if month_str:
        m = parse_month(month_str)
        if m:
            pub_month = int(m)

    # DOI
    doi = None
    if "doi" in entry:
        doi_val = entry["doi"].strip()
        doi = doi_val if doi_val.startswith("http") else f"https://doi.org/{doi_val}"

    # Venue
    venue = None
    for key in ("journal", "booktitle", "publisher", "howpublished"):
        if key in entry:
            venue = clean_latex(entry[key])
            break

    # Description
    if args.description:
        description = args.description
    elif "abstract" in entry:
        abstract = clean_latex(entry["abstract"])
        first_sentence = re.match(r"^[^.!?]+[.!?]", abstract)
        description = first_sentence.group(0) if first_sentence else abstract[:200] + "..."
    elif venue:
        description = f"{title[:100]}. Published in {venue}."
    else:
        description = title

    # Links
    links = []
    if doi:
        links.append({"label": "DOI", "url": doi, "platform": "Website"})
    if args.pubmed:
        links.append({"label": "PubMed", "url": args.pubmed, "platform": "Website"})
    for extra in (args.link or []):
        parts = extra.split(" - ", 1)
        if len(parts) == 2:
            links.append({"label": parts[0].strip(), "url": parts[1].strip(), "platform": "Website"})

    # Tags
    tags = ["paper"]
    if venue:
        venue_tag = re.sub(r"[^a-z0-9]+", "-", venue.lower()).strip("-")[:30]
        tags.append(venue_tag)

    # Projects
    projects = args.projects or []

    resource = {
        "id": resource_id,
        "name": title,
        "type": "Publication",
    }
    if pub_year:
        resource["publishedYear"] = pub_year
    if pub_month:
        resource["publishedMonth"] = pub_month
    resource["description"] = description
    resource["developedByProjects"] = projects if projects else []
    resource["usedByProjects"] = []
    resource["links"] = links if links else []
    resource["tags"] = tags
    resource["status"] = "Active"
    resource["lastUpdated"] = date.today().isoformat()

    return resource


def resource_to_yaml(resource: dict) -> str:
    """Produce clean YAML output with controlled field order."""
    field_order = [
        "id", "name", "type", "publishedYear", "publishedMonth",
        "description", "developedByProjects", "usedByProjects", "links",
        "tags", "status", "lastUpdated",
    ]

    lines = []
    for key in field_order:
        if key not in resource:
            continue
        value = resource[key]

        if isinstance(value, list) and len(value) == 0:
            lines.append(f"{key}: []")
        elif isinstance(value, list) and key == "links":
            lines.append(f"{key}:")
            for link in value:
                lines.append(f"  - label: {link['label']}")
                lines.append(f"    url: {link['url']}")
                lines.append(f"    platform: {link['platform']}")
        elif isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {item}")
        elif isinstance(value, str) and any(c in value for c in ":\"'#[]{}&*!|>%@`"):
            lines.append(f'{key}: "{value}"')
        else:
            lines.append(f"{key}: {value}")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(
        description="Convert a BibTeX entry to a portal resource YAML file."
    )
    parser.add_argument("input", nargs="?", help="BibTeX input file (reads stdin if omitted)")
    parser.add_argument("--projects", nargs="+", help="Project names (e.g. APRICOT PHASES)")
    parser.add_argument("--pubmed", help="PubMed URL")
    parser.add_argument("--link", action="append", help='Additional link as "Label - URL"')
    parser.add_argument("--description", help="Override the generated description")
    parser.add_argument("--output", help="Output file path")

    args = parser.parse_args()

    if args.input:
        with open(args.input) as f:
            bibtex_str = f.read()
    elif not sys.stdin.isatty():
        bibtex_str = sys.stdin.read()
    else:
        parser.print_help()
        sys.exit(1)

    entry = extract_entry(bibtex_str)
    resource = build_resource(entry, args)
    yaml_str = resource_to_yaml(resource)

    if args.output:
        with open(args.output, "w") as f:
            f.write(yaml_str)
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(yaml_str)
        suggested = f"data/resources/{resource['id']}.yaml"
        print(f"\nSuggested file: {suggested}", file=sys.stderr)


if __name__ == "__main__":
    main()
