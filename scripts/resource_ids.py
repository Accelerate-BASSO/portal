"""Shared helpers for stable, type-prefixed portal resource identifiers."""

from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parent.parent
VENUE_IDENTIFIERS = ROOT / "data" / "venue-identifiers.yaml"


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def load_venue_identifiers() -> dict[str, str]:
    document = yaml.safe_load(VENUE_IDENTIFIERS.read_text()) or {}
    identifiers: dict[str, str] = {}
    for venue in document.get("venues", []):
        venue_id = venue.get("id")
        for name in venue.get("names", []):
            if venue_id and name:
                identifiers[name.casefold()] = venue_id
    return identifiers


def venue_identifier(venue: str) -> str:
    if not isinstance(venue, str) or not venue.strip():
        raise ValueError("Publication venue is required for its resource identifier.")
    identifiers = load_venue_identifiers()
    venue_id = identifiers.get(venue.casefold())
    if venue_id is None:
        raise ValueError(
            f"Venue {venue!r} has no identifier in "
            f"{VENUE_IDENTIFIERS.relative_to(ROOT)}."
        )
    return venue_id


def make_publication_id(
    title: str,
    projects: list[str],
    year: int | None,
    venue: str,
) -> str:
    """Build publication-[project]-year-venue-topic or publication-venue-year-topic."""
    topic = slugify(title)[:60].rstrip("-")
    venue_id = venue_identifier(venue)
    parts = ["publication"]
    if projects:
        parts.append(slugify(projects[0]))
        if year:
            parts.append(str(year))
        parts.append(venue_id)
    else:
        parts.append(venue_id)
        if year:
            parts.append(str(year))
    parts.append(topic)
    return "-".join(parts)
