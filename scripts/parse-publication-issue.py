#!/usr/bin/env python3
"""
Parses a GitHub issue body (from the add-publication template) and
invokes bibtex-to-yaml.py to generate the resource YAML.

Usage:
    python scripts/parse-publication-issue.py --issue-body "$BODY" --output data/resources/pub-example.yaml

The issue body is expected to contain markdown sections from the GitHub
issue form template, including:
  - BibTeX entry (in a code block)
  - Project(s) (checkboxes)
  - Description, Published date, DOI URL, PubMed URL, Other link
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
    # Try bibtex-tagged block first
    match = re.search(r"```(?:bibtex)?\s*\n(.*?)```", body, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Fallback: look for @article/@inproceedings/etc pattern
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
    # Strip _No response_ placeholder
    if not content or content.lower() == "_no response_":
        return ""
    return content.strip()


def main():
    parser = argparse.ArgumentParser(
        description="Parse a publication issue and generate resource YAML."
    )
    parser.add_argument("--issue-body", required=True, help="The issue body text")
    parser.add_argument("--output", required=True, help="Output YAML file path")
    args = parser.parse_args()

    body = args.issue_body

    # Extract BibTeX
    bibtex = extract_bibtex(body)
    if not bibtex:
        print("Error: No BibTeX entry found in issue body.", file=sys.stderr)
        sys.exit(1)

    # Extract projects
    projects_section = extract_section(body, "Project(s)")
    projects = extract_checked_items(projects_section)

    # Extract optional manual fields
    description = extract_field(body, "Description (optional if BibTeX provided)")
    published_date = extract_field(body, "Published date (optional if BibTeX provided)")
    doi = extract_field(body, "DOI URL (optional if BibTeX provided)")
    pubmed = extract_field(body, "PubMed URL")
    other_link = extract_field(body, "Other link")

    # Write BibTeX to temp file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".bib", delete=False) as f:
        f.write(bibtex)
        bib_path = f.name

    try:
        # Build command
        script_dir = os.path.dirname(os.path.abspath(__file__))
        cmd = [
            sys.executable,
            os.path.join(script_dir, "bibtex-to-yaml.py"),
            bib_path,
            "--output", args.output,
        ]

        if projects:
            cmd.extend(["--projects"] + projects)
        if description:
            cmd.extend(["--description", description])
        if pubmed:
            cmd.extend(["--pubmed", pubmed])
        if other_link:
            cmd.extend(["--link", f"Link - {other_link}"])

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"Error running bibtex-to-yaml.py:\n{result.stderr}", file=sys.stderr)
            sys.exit(1)

        # If DOI was provided manually and not in BibTeX, patch the file
        if doi and os.path.exists(args.output):
            with open(args.output) as f:
                content = f.read()
            if "doi" not in content.lower() or doi not in content:
                # Add DOI link if not already present
                if "links: []" in content:
                    content = content.replace(
                        "links: []",
                        f"links:\n  - label: DOI\n    url: {doi}\n    platform: Website"
                    )
                elif "links:" in content and doi not in content:
                    content = content.replace(
                        "links:",
                        f"links:\n  - label: DOI\n    url: {doi}\n    platform: Website"
                    )
                with open(args.output, "w") as f:
                    f.write(content)

        # If published date was provided manually, patch the file
        if published_date and os.path.exists(args.output):
            with open(args.output) as f:
                content = f.read()
            if "publishedDate:" not in content:
                content = content.replace(
                    "type: Publication",
                    f"type: Publication\npublishedDate: {published_date}"
                )
            with open(args.output, "w") as f:
                f.write(content)

        print(f"Generated: {args.output}", file=sys.stderr)

        # Print the generated file for the action log
        with open(args.output) as f:
            print(f.read())

    finally:
        os.unlink(bib_path)


if __name__ == "__main__":
    main()
