#!/usr/bin/env python3
"""
Validate data/network-members.yaml.

Checks that the file is well-formed: parses as YAML, has the expected shape,
uses only known project ids and roles, and has no duplicate names (which would
silently break name->ORCID resolution).

Usage:
    python scripts/validate-network-members.py

Exits 0 if valid, 1 (printing the problems) if not.
"""
import os
import re
import sys

import yaml

ALLOWED_PROJECTS = {"BSO-AD", "APRICOT", "ODFA", "PHASES", "DCC"}
ALLOWED_ROLES = {
    "Contact PI", "Multiple PI", "Co-I", "Expert Consultant", "Consultant",
    "Project Manager", "Administrator", "Researcher", "Postdoc",
    "Program Officer", "Project Scientist",
}
ORCID_RE = re.compile(r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$")
ROR_RE = re.compile(r"^https://ror\.org/[0-9a-z]{9}$")
URL_RE = re.compile(r"^https?://", re.IGNORECASE)
LINKEDIN_RE = re.compile(r"^https?://([a-z]{2,3}\.)?linkedin\.com/", re.IGNORECASE)


def main() -> int:
    path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data", "network-members.yaml",
    )
    errors: list[str] = []

    try:
        with open(path) as f:
            data = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"ERROR: {path} not found.", file=sys.stderr)
        return 1
    except yaml.YAMLError as e:
        print(f"ERROR: {path} is not valid YAML:\n{e}", file=sys.stderr)
        return 1

    if not isinstance(data, dict) or not isinstance(data.get("members"), list):
        print("ERROR: file must have a top-level `members` list.", file=sys.stderr)
        return 1

    members = data["members"]
    seen_names: dict[str, int] = {}

    for i, entry in enumerate(members):
        where = f"member[{i}]"
        if not isinstance(entry, dict):
            errors.append(f"{where}: entry is not a mapping.")
            continue

        names = entry.get("names")
        if not isinstance(names, list) or not names or not all(
            isinstance(n, str) and n.strip() for n in names
        ):
            errors.append(f"{where}: `names` must be a non-empty list of strings.")
            names = names if isinstance(names, list) else []
        label = names[0] if names else where

        for n in names:
            key = n.strip().lower()
            if key in seen_names:
                errors.append(
                    f"{where} ({label}): duplicate name {n!r} "
                    f"(also in member[{seen_names[key]}])."
                )
            else:
                seen_names[key] = i

        orcid = entry.get("orcid")
        if orcid is not None and not ORCID_RE.match(str(orcid)):
            errors.append(f"{where} ({label}): invalid ORCID {orcid!r}.")

        ror = entry.get("ror")
        if ror is not None and not ROR_RE.match(str(ror)):
            errors.append(f"{where} ({label}): invalid ROR {ror!r} "
                          f"(expected https://ror.org/<9-char-id>).")

        homepage = entry.get("homepage")
        if homepage is not None and not URL_RE.match(str(homepage)):
            errors.append(f"{where} ({label}): invalid homepage {homepage!r} "
                          f"(expected an http(s) URL).")

        linkedin = entry.get("linkedin")
        if linkedin is not None and not LINKEDIN_RE.match(str(linkedin)):
            errors.append(f"{where} ({label}): invalid linkedin {linkedin!r} "
                          f"(expected a linkedin.com URL).")

        projects = entry.get("projects")
        if projects is not None:
            if not isinstance(projects, list):
                errors.append(f"{where} ({label}): `projects` must be a list.")
            else:
                for p in projects:
                    if not isinstance(p, dict) or "id" not in p:
                        errors.append(f"{where} ({label}): each project needs an `id`.")
                        continue
                    if p["id"] not in ALLOWED_PROJECTS:
                        errors.append(
                            f"{where} ({label}): unknown project id {p['id']!r} "
                            f"(allowed: {', '.join(sorted(ALLOWED_PROJECTS))})."
                        )
                    role = p.get("role")
                    if role is not None and role not in ALLOWED_ROLES:
                        errors.append(
                            f"{where} ({label}): unknown role {role!r} "
                            f"(allowed: {', '.join(sorted(ALLOWED_ROLES))})."
                        )

    if errors:
        print(f"network-members.yaml has {len(errors)} problem(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(f"network-members.yaml OK — {len(members)} members, no problems.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
