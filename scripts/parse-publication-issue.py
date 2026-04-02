#!/usr/bin/env python3
"""
Parses a GitHub issue body (from the add-publication template) and
invokes pub-to-yaml.py to generate the resource YAML.

Detects whether the submitter provided a PubMed ID/URL, a DOI, or
a BibTeX entry, and uses the appropriate source.

Usage:
    python scripts/parse-publication-issue.py --issue-body "$BODY" --output data/resources/pub-example.yaml
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile


def extract_section(body: str, heading: str) -> str:
    """Extract content under a ### heading, up to the next heading or end."""
    pattern = rf"###\s*{re.escape(heading)}\s*\n(.*?)(?=\n###\s|\Z)"
    match = re.search(pattern, body, re.DOTALL)
    if not match:
        return ""
    return match.group(1).strip()


def extract_bibtex(body: str) -> str:
    """Extract BibTeX from a fenced code block."""
    match = re.search(r"```(?:bibtex)?\s*\n(.*?)```", body, re.DOTALL)
    if match:
        return match.group(1).strip()
    match = re.search(r"(@\w+\{.*?\n\})", body, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def extract_checked_items(text: str) -> list[str]:
    """Extract checked checkbox items from markdown."""
    return re.findall(r"-\s*\[[xX]\]\s*(.+)", text)


def extract_field(body: str, heading: str) -> str:
    """Extract a simple text field value under a heading."""
    content = extract_section(body, heading)
    if not content or content.lower() == "_no response_":
        return ""
    return content.strip()


def generate_summary(yaml_content: str, source_label: str) -> str:
    """Generate a markdown summary of the extracted fields."""
    import yaml as pyyaml
    resource = pyyaml.safe_load(yaml_content)

    lines = []
    lines.append("## Extracted Publication Details\n")
    lines.append(f"The following fields were extracted from **{source_label}**:\n")
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| **Title** | {resource.get('name', '—')} |")

    year = resource.get("publishedYear", "")
    month = resource.get("publishedMonth", "")
    if year and month:
        date_str = f"{year}-{str(month).zfill(2)}"
    elif year:
        date_str = str(year)
    else:
        date_str = "—"
    lines.append(f"| **Published** | {date_str} |")
    lines.append(f"| **Description** | {resource.get('description', '—')} |")

    dev = resource.get("developedByProjects", [])
    lines.append(f"| **Project(s)** | {', '.join(dev) if dev else '—'} |")

    links = resource.get("links", [])
    if links:
        link_strs = [f"[{l['label']}]({l['url']})" for l in links]
        lines.append(f"| **Links** | {', '.join(link_strs)} |")
    else:
        lines.append("| **Links** | — |")

    lines.append(f"| **Status** | {resource.get('status', '—')} |")
    lines.append("")
    lines.append("### Generated YAML\n")
    lines.append("```yaml")
    lines.append(yaml_content.strip())
    lines.append("```")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Parse a publication issue and generate resource YAML."
    )
    parser.add_argument("--issue-body", required=True, help="The issue body text")
    parser.add_argument("--output", required=True, help="Output YAML file path")
    parser.add_argument("--summary", help="Write a markdown summary to this file")
    args = parser.parse_args()

    body = args.issue_body
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pub_script = os.path.join(script_dir, "pub-to-yaml.py")

    # Extract fields from issue body
    pubmed = extract_field(body, "PubMed URL or PMID")
    doi = extract_field(body, "DOI")
    bibtex = extract_bibtex(body)

    projects_section = extract_section(body, "Project(s)")
    projects = extract_checked_items(projects_section)

    description = extract_field(body, "Description (optional)")
    published_year = extract_field(body, "Published year (optional)")
    published_month = extract_field(body, "Published month (optional)")
    other_link = extract_field(body, "Other link")

    # Determine source — prefer PubMed > DOI > BibTeX
    cmd = [sys.executable, pub_script]
    source_label = ""

    if pubmed:
        cmd.extend(["--pmid", pubmed])
        source_label = f"PubMed ({pubmed})"
    elif doi:
        cmd.extend(["--doi", doi])
        source_label = f"DOI ({doi})"
    elif bibtex:
        bib_file = tempfile.NamedTemporaryFile(mode="w", suffix=".bib", delete=False)
        bib_file.write(bibtex)
        bib_file.close()
        cmd.extend(["--bibtex", bib_file.name])
        source_label = "BibTeX entry"
    else:
        print("Error: No PubMed ID, DOI, or BibTeX entry found in issue body.", file=sys.stderr)
        sys.exit(1)

    cmd.extend(["--output", args.output])

    if projects:
        cmd.extend(["--projects"] + projects)
    if description:
        cmd.extend(["--description", description])
    if other_link:
        cmd.extend(["--link", f"Link - {other_link}"])

    # Run the converter
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error running pub-to-yaml.py:\n{result.stderr}", file=sys.stderr)
            sys.exit(1)
        if result.stderr:
            print(result.stderr, file=sys.stderr, end="")
    finally:
        if bibtex and not pubmed and not doi:
            os.unlink(bib_file.name)

    # Patch in manual overrides if provided
    if os.path.exists(args.output):
        with open(args.output) as f:
            content = f.read()
        patched = False

        if published_year and "publishedYear:" not in content:
            content = content.replace(
                "type: Publication",
                f"type: Publication\npublishedYear: {published_year}"
            )
            patched = True

        if published_month and "publishedMonth:" not in content:
            if "publishedYear:" in content:
                yr = published_year or ""
                # Find the publishedYear line and add month after it
                content = re.sub(
                    r"(publishedYear: \d+)",
                    rf"\1\npublishedMonth: {published_month}",
                    content
                )
            else:
                content = content.replace(
                    "type: Publication",
                    f"type: Publication\npublishedMonth: {published_month}"
                )
            patched = True

        if patched:
            with open(args.output, "w") as f:
                f.write(content)

    # Output
    print(f"Generated: {args.output}", file=sys.stderr)
    with open(args.output) as f:
        yaml_content = f.read()
        print(yaml_content)

    if args.summary:
        summary = generate_summary(yaml_content, source_label)
        with open(args.summary, "w") as f:
            f.write(summary)
        print(f"Summary written to {args.summary}", file=sys.stderr)


if __name__ == "__main__":
    main()
