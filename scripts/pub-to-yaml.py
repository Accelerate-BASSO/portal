#!/usr/bin/env python3
"""
Generates a portal resource YAML file for a publication from BibTeX,
PubMed, or DOI.

Usage:
    # From BibTeX file
    python scripts/pub-to-yaml.py --bibtex paper.bib --projects APRICOT

    # From BibTeX on stdin
    cat paper.bib | python scripts/pub-to-yaml.py --bibtex - --projects APRICOT

    # From PubMed ID or URL
    python scripts/pub-to-yaml.py --pmid 41001555 --projects PHASES
    python scripts/pub-to-yaml.py --pmid https://pubmed.ncbi.nlm.nih.gov/41001555/ --projects PHASES

    # From DOI
    python scripts/pub-to-yaml.py --doi 10.12688/wellcomeopenres.23520.1 --projects APRICOT
    python scripts/pub-to-yaml.py --doi https://doi.org/10.12688/wellcomeopenres.23520.1 --projects APRICOT

Options:
    --bibtex        BibTeX file path, or - for stdin
    --pmid          PubMed ID (numeric) or PubMed URL
    --doi           DOI string or DOI URL
    --projects      Project names (e.g. APRICOT PHASES)
    --link          Additional link as "Label - URL" (can be repeated)
    --description   Override the generated description
    --output        Output file path (default: prints to stdout)

Requirements:
    pip install bibtexparser pyyaml requests
"""

import argparse
import json
import re
import sys
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import date

try:
    import yaml
except ImportError:
    print("Error: pyyaml is required. Install it with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


MONTH_MAP = {
    "jan": "01", "january": "01", "1": "01",
    "feb": "02", "february": "02", "2": "02",
    "mar": "03", "march": "03", "3": "03",
    "apr": "04", "april": "04", "4": "04",
    "may": "05", "5": "05",
    "jun": "06", "june": "06", "6": "06",
    "jul": "07", "july": "07", "7": "07",
    "aug": "08", "august": "08", "8": "08",
    "sep": "09", "september": "09", "9": "09",
    "oct": "10", "october": "10", "10": "10",
    "nov": "11", "november": "11", "11": "11",
    "dec": "12", "december": "12", "12": "12",
}


def parse_month(month_str: str) -> str | None:
    if not month_str:
        return None
    m = month_str.strip().lower()
    if m.isdigit():
        return m.zfill(2)
    return MONTH_MAP.get(m)


def clean_latex(text: str) -> str:
    text = re.sub(r"[{}]", "", text)
    text = text.replace("\\&", "&")
    text = text.replace("\\textendash", "\u2013")
    text = text.replace("\\textemdash", "\u2014")
    text = text.replace("~", " ")
    text = re.sub(r"\\[a-zA-Z]+\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def make_id(key: str, title: str) -> str:
    base = key if key else title
    slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")[:60]
    return f"pub-{slug}"


# --- BibTeX source ---

def fetch_from_bibtex(bibtex_str: str) -> dict:
    try:
        import bibtexparser
    except ImportError:
        print("Error: bibtexparser is required for BibTeX input. Install with: pip install bibtexparser", file=sys.stderr)
        sys.exit(1)

    parser = bibtexparser.bparser.BibTexParser(common_strings=True)
    library = bibtexparser.loads(bibtex_str, parser=parser)
    if not library.entries:
        print("Error: No BibTeX entries found in input.", file=sys.stderr)
        sys.exit(1)

    entry = library.entries[0]
    month_str = entry.get("month")

    data = {
        "title": clean_latex(entry.get("title", "Untitled")),
        "key": entry.get("ID", ""),
        "year": int(entry["year"]) if entry.get("year") else None,
        "month": int(parse_month(month_str)) if month_str and parse_month(month_str) else None,
        "doi": None,
        "venue": None,
        "abstract": None,
        "pmid": None,
    }

    if "doi" in entry:
        doi_val = entry["doi"].strip()
        data["doi"] = doi_val if doi_val.startswith("http") else f"https://doi.org/{doi_val}"

    for key in ("journal", "booktitle", "publisher", "howpublished"):
        if key in entry:
            data["venue"] = clean_latex(entry[key])
            break

    if "abstract" in entry:
        data["abstract"] = clean_latex(entry["abstract"])

    # Keywords — BibTeX uses "keywords" field, usually comma or semicolon separated
    keywords = []
    if "keywords" in entry:
        raw = clean_latex(entry["keywords"])
        keywords = [kw.strip() for kw in re.split(r"[;,]", raw) if kw.strip()]
    data["keywords"] = keywords

    # Contributors — BibTeX "author" field, typically "Last, First and Last, First"
    contributors = []
    if "author" in entry:
        raw_authors = clean_latex(entry["author"])
        for author_str in re.split(r"\s+and\s+", raw_authors):
            author_str = author_str.strip()
            if not author_str:
                continue
            if "," in author_str:
                parts = author_str.split(",", 1)
                name = f"{parts[1].strip()} {parts[0].strip()}"
            else:
                name = author_str
            contributors.append({"name": name})
    data["contributors"] = contributors

    return data


# --- PubMed source ---

def extract_pmcid(input_str: str) -> str | None:
    """Extract a PMC ID (e.g. PMC10396962) from a URL or string. Returns None if not a PMC reference."""
    match = re.search(r"PMC(\d+)", input_str, re.IGNORECASE)
    if match:
        return f"PMC{match.group(1)}"
    return None


def pmcid_to_pmid(pmcid: str) -> str:
    """Convert a PMC ID to a PMID using the NCBI ID converter API."""
    url = f"https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids={pmcid}&format=json"
    print(f"Converting {pmcid} to PMID...", file=sys.stderr)

    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error converting PMC ID: {e}", file=sys.stderr)
        sys.exit(1)

    records = data.get("records", [])
    if not records or "pmid" not in records[0]:
        print(f"Error: Could not find a PMID for {pmcid}. The article may only have a PMC ID.", file=sys.stderr)
        # Try fetching directly from PMC instead
        return None

    pmid = records[0]["pmid"]
    print(f"Resolved {pmcid} -> PMID {pmid}", file=sys.stderr)
    return pmid


def extract_pmid(pmid_input: str) -> str:
    """Extract numeric PMID from a URL or plain number.
    Also handles PMC URLs/IDs by converting them to PMIDs."""
    # Check if this is a PMC reference first
    pmcid = extract_pmcid(pmid_input)
    if pmcid:
        pmid = pmcid_to_pmid(pmcid)
        if pmid:
            return pmid
        print(f"Error: Could not resolve {pmcid} to a PMID.", file=sys.stderr)
        sys.exit(1)

    # Regular PMID extraction (from pubmed.ncbi.nlm.nih.gov URLs or plain numbers)
    # Match PubMed URLs specifically to avoid grabbing wrong numbers
    pubmed_match = re.search(r"pubmed\.ncbi\.nlm\.nih\.gov/(\d+)", pmid_input)
    if pubmed_match:
        return pubmed_match.group(1)

    # Plain numeric input
    if pmid_input.strip().isdigit():
        return pmid_input.strip()

    print(f"Error: Could not extract a PMID from '{pmid_input}'", file=sys.stderr)
    sys.exit(1)


def fetch_from_pubmed(pmid: str) -> dict:
    """Fetch publication metadata from PubMed E-utilities."""
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pmid}&retmode=xml"
    print(f"Fetching from PubMed: PMID {pmid}...", file=sys.stderr)

    try:
        with urllib.request.urlopen(url) as response:
            xml_str = response.read().decode("utf-8")
    except Exception as e:
        print(f"Error fetching from PubMed: {e}", file=sys.stderr)
        sys.exit(1)

    root = ET.fromstring(xml_str)
    article = root.find(".//PubmedArticle")
    if article is None:
        print(f"Error: No article found for PMID {pmid}", file=sys.stderr)
        sys.exit(1)

    # Title
    title_el = article.find(".//ArticleTitle")
    title = title_el.text.strip() if title_el is not None and title_el.text else "Untitled"

    # Journal
    journal_el = article.find(".//Journal/Title")
    venue = journal_el.text.strip() if journal_el is not None and journal_el.text else None

    # Date
    year = None
    month = None
    pub_date = article.find(".//PubDate")
    if pub_date is not None:
        year_el = pub_date.find("Year")
        month_el = pub_date.find("Month")
        if year_el is not None and year_el.text:
            year = int(year_el.text)
        if month_el is not None and month_el.text:
            m = parse_month(month_el.text)
            if m:
                month = int(m)

    # DOI
    doi = None
    for id_el in article.findall(".//ArticleIdList/ArticleId"):
        if id_el.get("IdType") == "doi" and id_el.text:
            doi = f"https://doi.org/{id_el.text.strip()}"
            break

    # Abstract
    abstract = None
    abstract_el = article.find(".//AbstractText")
    if abstract_el is not None:
        # Handle mixed content (text + child elements)
        abstract = "".join(abstract_el.itertext()).strip()

    # Keywords — from MeSH headings and author keywords
    keywords = []
    for kw_el in article.findall(".//KeywordList/Keyword"):
        if kw_el.text:
            keywords.append(kw_el.text.strip())
    for mesh_el in article.findall(".//MeshHeadingList/MeshHeading/DescriptorName"):
        if mesh_el.text:
            keywords.append(mesh_el.text.strip())

    # Deduplicate (case-insensitive) while preserving order
    seen = set()
    unique_keywords = []
    for kw in keywords:
        if kw.lower() not in seen:
            seen.add(kw.lower())
            unique_keywords.append(kw)

    # Contributors
    contributors = []
    for author_el in article.findall(".//AuthorList/Author"):
        last = author_el.find("LastName")
        fore = author_el.find("ForeName")
        if last is not None and last.text:
            name = f"{fore.text} {last.text}" if fore is not None and fore.text else last.text
            contributor = {"name": name}
            orcid_el = author_el.find("Identifier[@Source='ORCID']")
            if orcid_el is not None and orcid_el.text:
                # Normalize ORCID — strip URL prefix if present
                orcid = orcid_el.text.strip().replace("https://orcid.org/", "").replace("http://orcid.org/", "")
                contributor["orcid"] = orcid
            contributors.append(contributor)

    return {
        "title": title,
        "key": f"pmid{pmid}",
        "year": year,
        "month": month,
        "doi": doi,
        "venue": venue,
        "abstract": abstract,
        "keywords": unique_keywords,
        "contributors": contributors,
        "pmid": pmid,
    }


# --- CrossRef / DOI source ---

def extract_doi(doi_input: str) -> str:
    """Extract DOI from a URL or plain DOI string."""
    doi_input = doi_input.strip()
    match = re.search(r"(10\.\d{4,}/[^\s]+)", doi_input)
    if match:
        return match.group(1)
    print(f"Error: Could not extract a DOI from '{doi_input}'", file=sys.stderr)
    sys.exit(1)


def fetch_from_crossref(doi: str) -> dict:
    """Fetch publication metadata from CrossRef API."""
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi, safe='')}"
    print(f"Fetching from CrossRef: {doi}...", file=sys.stderr)

    req = urllib.request.Request(url, headers={
        "User-Agent": "AccelerateBASSOPortal/1.0 (mailto:portal@accelerate-basso.regenstrief.org)",
        "Accept": "application/json",
    })

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching from CrossRef: {e}", file=sys.stderr)
        sys.exit(1)

    work = data.get("message", {})

    # Title
    titles = work.get("title", [])
    title = titles[0] if titles else "Untitled"

    # Venue
    containers = work.get("container-title", [])
    venue = containers[0] if containers else None

    # Date
    year = None
    month = None
    date_parts = None
    for date_field in ("published-print", "published-online", "published"):
        if date_field in work and "date-parts" in work[date_field]:
            date_parts = work[date_field]["date-parts"][0]
            break

    if date_parts:
        if len(date_parts) >= 1:
            year = date_parts[0]
        if len(date_parts) >= 2:
            month = date_parts[1]

    # Abstract
    abstract = work.get("abstract")
    if abstract:
        # CrossRef abstracts often have JATS XML tags
        abstract = re.sub(r"<[^>]+>", "", abstract).strip()

    # Keywords — CrossRef uses "subject" field
    keywords = work.get("subject", [])

    # Contributors
    contributors = []
    for author in work.get("author", []):
        given = author.get("given", "")
        family = author.get("family", "")
        if family:
            name = f"{given} {family}".strip()
            contributor = {"name": name}
            orcid_url = author.get("ORCID")
            if orcid_url:
                contributor["orcid"] = orcid_url.replace("https://orcid.org/", "").replace("http://orcid.org/", "")
            contributors.append(contributor)

    return {
        "title": title,
        "key": re.sub(r"[^a-z0-9]+", "", doi.lower())[:30],
        "year": year,
        "month": month,
        "doi": f"https://doi.org/{doi}",
        "venue": venue,
        "abstract": abstract,
        "keywords": keywords,
        "contributors": contributors,
        "pmid": None,
    }


# --- arXiv source ---

def extract_arxiv_id(arxiv_input: str) -> str:
    """Extract arXiv ID from a URL or plain ID string."""
    arxiv_input = arxiv_input.strip()
    # Match URLs like https://arxiv.org/abs/2301.12345 or https://arxiv.org/pdf/2301.12345
    match = re.search(r"arxiv\.org/(?:abs|pdf)/(\S+?)(?:\.pdf)?$", arxiv_input)
    if match:
        return match.group(1)
    # Plain ID like 2301.12345 or cs/0123456
    match = re.match(r"^[\w\-./]+$", arxiv_input)
    if match:
        return arxiv_input
    print(f"Error: Could not extract an arXiv ID from '{arxiv_input}'", file=sys.stderr)
    sys.exit(1)


def fetch_from_arxiv(arxiv_id: str) -> dict:
    """Fetch publication metadata from the arXiv API."""
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
    print(f"Fetching from arXiv: {arxiv_id}...", file=sys.stderr)

    try:
        with urllib.request.urlopen(url) as response:
            xml_str = response.read().decode("utf-8")
    except Exception as e:
        print(f"Error fetching from arXiv: {e}", file=sys.stderr)
        sys.exit(1)

    # arXiv API uses Atom namespace
    ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
    root = ET.fromstring(xml_str)
    entry = root.find("atom:entry", ns)
    if entry is None:
        print(f"Error: No entry found for arXiv ID {arxiv_id}", file=sys.stderr)
        sys.exit(1)

    # Title
    title_el = entry.find("atom:title", ns)
    title = title_el.text.strip().replace("\n", " ") if title_el is not None and title_el.text else "Untitled"
    title = re.sub(r"\s+", " ", title)

    # Published date
    published_el = entry.find("atom:published", ns)
    year = None
    month = None
    if published_el is not None and published_el.text:
        date_match = re.match(r"(\d{4})-(\d{2})", published_el.text)
        if date_match:
            year = int(date_match.group(1))
            month = int(date_match.group(2))

    # Abstract
    summary_el = entry.find("atom:summary", ns)
    abstract = None
    if summary_el is not None and summary_el.text:
        abstract = summary_el.text.strip().replace("\n", " ")
        abstract = re.sub(r"\s+", " ", abstract)

    # DOI (if linked)
    doi = None
    doi_el = entry.find("arxiv:doi", ns)
    if doi_el is not None and doi_el.text:
        doi = f"https://doi.org/{doi_el.text.strip()}"

    # Categories as keywords
    keywords = []
    for cat_el in entry.findall("atom:category", ns):
        term = cat_el.get("term")
        if term:
            keywords.append(term)

    # Contributors
    contributors = []
    for author_el in entry.findall("atom:author", ns):
        name_el = author_el.find("atom:name", ns)
        if name_el is not None and name_el.text:
            contributors.append({"name": name_el.text.strip()})

    return {
        "title": title,
        "key": f"arxiv-{arxiv_id.replace('/', '-')}",
        "year": year,
        "month": month,
        "doi": doi,
        "venue": "arXiv",
        "abstract": abstract,
        "keywords": keywords,
        "contributors": contributors,
        "pmid": None,
        "arxiv_id": arxiv_id,
    }


# --- OSF Preprints source (PsyArXiv, SocArXiv, etc.) ---

def extract_osf_id(osf_input: str) -> str:
    """Extract OSF preprint ID from a URL or plain ID."""
    osf_input = osf_input.strip()
    # Match URLs like https://osf.io/preprints/psyarxiv/abc12 or https://psyarxiv.com/abc12
    match = re.search(r"(?:osf\.io/(?:preprints/\w+/|))([a-z0-9]{3,})", osf_input)
    if match:
        return match.group(1)
    # Match psyarxiv.com/ID or socarxiv.org/ID style
    match = re.search(r"(?:psyarxiv|socarxiv)\.\w+/([a-z0-9]{3,})", osf_input)
    if match:
        return match.group(1)
    # Plain ID
    if re.match(r"^[a-z0-9]{3,}$", osf_input):
        return osf_input
    print(f"Error: Could not extract an OSF preprint ID from '{osf_input}'", file=sys.stderr)
    sys.exit(1)


def fetch_from_osf(osf_id: str) -> dict:
    """Fetch publication metadata from the OSF Preprints API."""
    url = f"https://api.osf.io/v2/preprints/{osf_id}/"
    print(f"Fetching from OSF Preprints: {osf_id}...", file=sys.stderr)

    req = urllib.request.Request(url, headers={"Accept": "application/json"})

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching from OSF: {e}", file=sys.stderr)
        sys.exit(1)

    attrs = data.get("data", {}).get("attributes", {})

    # Title
    title = attrs.get("title", "Untitled").strip()

    # Date
    year = None
    month = None
    date_published = attrs.get("date_published") or attrs.get("date_created")
    if date_published:
        date_match = re.match(r"(\d{4})-(\d{2})", date_published)
        if date_match:
            year = int(date_match.group(1))
            month = int(date_match.group(2))

    # DOI
    doi = attrs.get("doi")
    if doi and not doi.startswith("http"):
        doi = f"https://doi.org/{doi}"

    # Abstract
    abstract = attrs.get("description")
    if abstract:
        # OSF may return HTML
        abstract = re.sub(r"<[^>]+>", "", abstract).strip()

    # Tags/keywords
    keywords = attrs.get("tags", [])

    # Contributors — need a separate API call
    contributors = []
    contribs_link = data.get("data", {}).get("relationships", {}).get("contributors", {}).get("links", {}).get("related", {}).get("href")
    if contribs_link:
        try:
            req2 = urllib.request.Request(contribs_link, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req2) as response2:
                contribs_data = json.loads(response2.read().decode("utf-8"))
            for contrib in contribs_data.get("data", []):
                users_link = contrib.get("relationships", {}).get("users", {}).get("links", {}).get("related", {}).get("href")
                if users_link:
                    try:
                        req3 = urllib.request.Request(users_link, headers={"Accept": "application/json"})
                        with urllib.request.urlopen(req3) as response3:
                            user_data = json.loads(response3.read().decode("utf-8"))
                        user_attrs = user_data.get("data", {}).get("attributes", {})
                        full_name = user_attrs.get("full_name", "").strip()
                        if full_name:
                            contributor = {"name": full_name}
                            # OSF doesn't directly expose ORCID in this endpoint
                            contributors.append(contributor)
                    except Exception:
                        pass
        except Exception:
            pass

    # Determine venue from provider
    provider = attrs.get("reviews_state", "")
    provider_link = data.get("data", {}).get("relationships", {}).get("provider", {}).get("links", {}).get("related", {}).get("href", "")
    venue = "OSF Preprints"
    if "psyarxiv" in provider_link.lower() or "psyarxiv" in str(data):
        venue = "PsyArXiv"
    elif "socarxiv" in provider_link.lower() or "socarxiv" in str(data):
        venue = "SocArXiv"

    return {
        "title": title,
        "key": f"osf-{osf_id}",
        "year": year,
        "month": month,
        "doi": doi,
        "venue": venue,
        "abstract": abstract,
        "keywords": keywords,
        "contributors": contributors,
        "pmid": None,
        "osf_id": osf_id,
    }


# --- Auto-detect source from input ---

def detect_and_fetch(source_input: str) -> tuple[dict, str]:
    """Auto-detect the source type from the input and fetch metadata.
    Returns (data_dict, source_label)."""
    source = source_input.strip()

    # BibTeX — starts with @
    if source.startswith("@"):
        data = fetch_from_bibtex(source)
        return data, "BibTeX entry"

    # PubMed URL
    if "pubmed.ncbi.nlm.nih.gov" in source:
        pmid = extract_pmid(source)
        data = fetch_from_pubmed(pmid)
        return data, f"PubMed ({pmid})"

    # PMC URL
    if "pmc.ncbi.nlm.nih.gov" in source or re.search(r"PMC\d+", source, re.IGNORECASE):
        pmid = extract_pmid(source)
        data = fetch_from_pubmed(pmid)
        return data, f"PubMed (via PMC, PMID {pmid})"

    # arXiv URL or ID
    if "arxiv.org" in source:
        arxiv_id = extract_arxiv_id(source)
        data = fetch_from_arxiv(arxiv_id)
        return data, f"arXiv ({arxiv_id})"

    # OSF / PsyArXiv / SocArXiv
    if any(domain in source for domain in ["osf.io", "psyarxiv.com", "socarxiv.org"]):
        osf_id = extract_osf_id(source)
        data = fetch_from_osf(osf_id)
        return data, f"OSF Preprints ({osf_id})"

    # DOI URL
    if "doi.org/" in source:
        doi = extract_doi(source)
        data = fetch_from_crossref(doi)
        return data, f"DOI ({doi})"

    # Bare DOI — starts with 10.
    if re.match(r"^10\.\d{4,}/", source):
        doi = extract_doi(source)
        data = fetch_from_crossref(doi)
        return data, f"DOI ({doi})"

    # Bare number — assume PMID
    if source.isdigit() and len(source) >= 5:
        data = fetch_from_pubmed(source)
        return data, f"PubMed ({source})"

    # arXiv-style ID (e.g. 2301.12345)
    if re.match(r"^\d{4}\.\d{4,}", source):
        arxiv_id = extract_arxiv_id(source)
        data = fetch_from_arxiv(arxiv_id)
        return data, f"arXiv ({arxiv_id})"

    print(f"Error: Could not detect source type from '{source}'.", file=sys.stderr)
    print("Supported inputs: PubMed URL/PMID, PMC URL, DOI, arXiv URL/ID, OSF/PsyArXiv/SocArXiv URL, or BibTeX.", file=sys.stderr)
    sys.exit(1)


# --- Build resource from normalized data ---

def build_resource(data: dict, args) -> dict:
    title = data["title"]
    resource_id = make_id(data.get("key", ""), title)

    pub_year = data.get("year")
    pub_month = data.get("month")

    # Description — use full abstract if available
    if args.description:
        description = args.description
    elif data.get("abstract"):
        description = data["abstract"]
    elif data.get("venue"):
        description = f"{title[:100]}. Published in {data['venue']}."
    else:
        description = title

    # Links
    links = []
    if data.get("doi"):
        links.append({"label": "DOI", "url": data["doi"], "platform": "Website"})
    if data.get("pmid"):
        links.append({"label": "PubMed", "url": f"https://pubmed.ncbi.nlm.nih.gov/{data['pmid']}/", "platform": "Website"})
    if args.pubmed and not data.get("pmid"):
        pmid = extract_pmid(args.pubmed)
        links.append({"label": "PubMed", "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/", "platform": "Website"})
    if data.get("arxiv_id"):
        links.append({"label": "arXiv", "url": f"https://arxiv.org/abs/{data['arxiv_id']}", "platform": "Website"})
    if data.get("osf_id"):
        links.append({"label": data.get("venue", "OSF"), "url": f"https://osf.io/{data['osf_id']}", "platform": "Website"})
    for extra in (args.link or []):
        parts = extra.split(" - ", 1)
        if len(parts) == 2:
            links.append({"label": parts[0].strip(), "url": parts[1].strip(), "platform": "Website"})

    # Tags
    tags = ["paper"]
    if data.get("venue"):
        venue_tag = re.sub(r"[^a-z0-9]+", "-", data["venue"].lower()).strip("-")
        tags.append(venue_tag)

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
    if data.get("doi"):
        resource["doi"] = data["doi"]
    resource["producedByProjects"] = projects if projects else []
    resource["usedByProjects"] = []
    resource["links"] = links if links else []
    resource["keywords"] = data.get("keywords", [])
    resource["contributors"] = data.get("contributors", [])
    resource["tags"] = tags
    resource["status"] = "Active"
    resource["lastUpdated"] = date.today().isoformat()

    return resource


def resource_to_yaml(resource: dict) -> str:
    field_order = [
        "id", "name", "type", "publishedYear", "publishedMonth",
        "doi", "description", "keywords", "contributors",
        "producedByProjects", "usedByProjects", "links", "tags",
        "status", "lastUpdated",
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
        elif isinstance(value, list) and key == "contributors":
            lines.append(f"{key}:")
            for c in value:
                lines.append(f"  - name: {c['name']}")
                if c.get("orcid"):
                    lines.append(f"    orcid: \"{c['orcid']}\"")
        elif isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {item}")
        elif isinstance(value, str) and (len(value) > 120 or "\n" in value):
            # Use folded block scalar for long text (wraps but preserves paragraphs)
            lines.append(f"{key}: >-")
            # Wrap at ~76 chars for readability
            words = value.split()
            line = "  "
            for word in words:
                if len(line) + len(word) + 1 > 78:
                    lines.append(line)
                    line = "  " + word
                else:
                    line = line + " " + word if line.strip() else "  " + word
            if line.strip():
                lines.append(line)
        elif isinstance(value, str) and any(c in value for c in ":\"'#[]{}&*!|>%@`"):
            lines.append(f'{key}: "{value}"')
        else:
            lines.append(f"{key}: {value}")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(
        description="Generate a portal resource YAML file for a publication.",
        epilog="You can also use --source to auto-detect the input type."
    )

    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--source", help="Auto-detect: paste a URL, ID, or BibTeX and the script figures out the source")
    source.add_argument("--bibtex", help="BibTeX file path, or - for stdin")
    source.add_argument("--pmid", help="PubMed ID (numeric) or PubMed URL")
    source.add_argument("--doi", help="DOI string or DOI URL")
    source.add_argument("--arxiv", help="arXiv ID or URL")
    source.add_argument("--osf", help="OSF/PsyArXiv/SocArXiv preprint ID or URL")

    parser.add_argument("--projects", nargs="+", help="Project names (e.g. APRICOT PHASES)")
    parser.add_argument("--pubmed", help="PubMed URL (to add as a link, when using --bibtex or --doi)")
    parser.add_argument("--link", action="append", help='Additional link as "Label - URL"')
    parser.add_argument("--description", help="Override the generated description")
    parser.add_argument("--output", help="Output file path")

    args = parser.parse_args()

    # Fetch metadata from the appropriate source
    if args.source:
        data, source_label = detect_and_fetch(args.source)
        print(f"Detected source: {source_label}", file=sys.stderr)

    elif args.bibtex:
        if args.bibtex == "-":
            if sys.stdin.isatty():
                print("Error: No BibTeX data on stdin.", file=sys.stderr)
                sys.exit(1)
            bibtex_str = sys.stdin.read()
        else:
            with open(args.bibtex) as f:
                bibtex_str = f.read()
        data = fetch_from_bibtex(bibtex_str)

    elif args.pmid:
        pmid = extract_pmid(args.pmid)
        data = fetch_from_pubmed(pmid)

    elif args.doi:
        doi = extract_doi(args.doi)
        data = fetch_from_crossref(doi)

    elif args.arxiv:
        arxiv_id = extract_arxiv_id(args.arxiv)
        data = fetch_from_arxiv(arxiv_id)

    elif args.osf:
        osf_id = extract_osf_id(args.osf)
        data = fetch_from_osf(osf_id)

    resource = build_resource(data, args)
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
