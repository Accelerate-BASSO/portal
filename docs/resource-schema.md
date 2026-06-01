# Resource Schema

This is the reference for the resource metadata files under `data/resources/`.

## Resource types

| Type | Description |
|---|---|
| `Ontology` | A behavioural/social science ontology. |
| `Publication` | A paper, report, or article. |
| `Website` | A project or network website. |
| `Repository` | A code or data repository. |
| `Registry` | A standards or ontology registry (e.g. BioPortal BSSO Slice, BSSO Foundry). |
| `Community` | A forum or community of practice. |
| `Tool` | A software tool or platform. |
| `Dataset` | A dataset produced by the network. |

Each resource is a single YAML file in a subdirectory named for its type:

```
data/resources/
  ontologies/     # Ontology
  publications/   # Publication
  websites/       # Website
  repositories/   # Repository
  registries/     # Registry
  communities/    # Community
  tools/          # Tool
  (datasets/)     # Dataset — supported, none yet
```

By convention, name the file in kebab-case, often matching the resource `id`
(e.g. `bcio.yaml`, `nas-report-2022.yaml`) — but the loader ignores the
filename, so only the `.yaml` extension, the type subdirectory, and a
kebab-case `id` field actually matter. The portal picks up new files
automatically on the next build. Every file is checked in CI by
`scripts/validate-resources.py`; run it locally with
`python scripts/validate-resources.py`.

## Common fields (every resource)

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | Yes | string | Stable unique identifier across all resources. Kebab-case — for consistency, to keep cache keys clean, and so ids stay URL-safe if per-resource detail pages are added later. |
| `name` | Yes | string | Display name. Quote it if it contains a colon. |
| `type` | Yes | enum | One of `Ontology`, `Publication`, `Website`, `Repository`, `Registry`, `Community`, `Tool`, `Dataset`. Must match the file's subdirectory (which is the pluralized type, e.g. `Ontology` → `ontologies/`). |
| `description` | Yes | string | 1–3 sentence plain-language summary. Use `>-` for multi-line. |
| `producedByProjects` | Yes | list | Projects that produced the resource — any of `APRICOT`, `BSO-AD`, `ODFA`, `PHASES`, `DCC` (see vocab below for full names). May be empty (`[]`). |
| `usedByProjects` | Yes | list | Projects that use the resource — same allowed values as `producedByProjects`. May be empty (`[]`). |
| `links` | Yes | list | Links to where the resource lives (see below). At least one is required. |
| `tags` | Yes | list | Searchable keywords (kebab-case). May be empty (`[]`). |
| `lastUpdated` | Yes | date | `YYYY-MM-DD` — when the metadata was last reviewed. |

### Controlled vocabularies

- **Projects** (`producedByProjects`, `usedByProjects`):
  - `APRICOT` — Advancing Prevention Research in Cancer through Ontology Tools
  - `BSO-AD` — Behavioral and Social factors in Alzheimer's Disease
  - `ODFA` — Ontology of Dental care-related Fear and Anxiety
  - `PHASES` — Promoting Healthy Aging through Semantic Enrichment of Solitude research
  - `DCC` — Data Coordinating Center (the U24 team)
- **Link `platform`**: `GitHub`, `BioPortal`, `OLS`, `Ontobee`, `Zenodo`, `OSF`, `Website`, `Discourse`, `Other`

### Links

Each item in `links` is an object:

```yaml
links:
  - label: GitHub            # display text, e.g. GitHub, DOI, PubMed, BioPortal
    url: https://...         # full URL
    platform: GitHub         # one of the platforms above
```

### Build-injected fields (do not author these)

Some fields are filled in automatically at build time from cached external
metadata, keyed by `id` — do not add them to resource files:

- `bioportal` — class/property counts etc. from `data/bioportal-cache.json`
- `githubRelease` — latest release version/date from `data/github-releases-cache.json`

---

Each resource type is listed below with the extra fields it allows. **Type-specific
fields may only appear on resources of their type** — e.g. `bssoFoundry` only on
ontologies, `publishedYear`/`venue`/`contributors` only on publications. The
validator rejects misplaced fields.

Where a `license` field appears, use an [SPDX license identifier](https://spdx.org/licenses/)
(e.g. `CC-BY-4.0`, `MIT`, `Apache-2.0`) where one applies.

## Ontology

A formal vocabulary of classes and relationships for a behavioural or social
science domain, such as the BCIO, ADDICTO, or MFOEM. Ontologies are the
network's core product; most are part of the BSSO Foundry and are hosted on
platforms like BioPortal, Ontobee, or OLS. The portal links to where each
ontology can be browsed or downloaded rather than hosting it.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `bssoFoundry` | Yes | boolean | Whether the ontology is part of the BSSO Foundry. |
| `license` | No | string | License (SPDX id or short name, e.g. `CC-BY-4.0`). |

```yaml
id: bcio
name: Behaviour Change Intervention Ontology (BCIO)
type: Ontology
description: An ontology for annotating and synthesising evidence about behaviour change interventions.
producedByProjects:
  - APRICOT
usedByProjects:
  - PHASES
links:
  - label: BioPortal
    url: https://bioportal.bioontology.org/ontologies/BCIO
    platform: BioPortal
  - label: GitHub
    url: https://github.com/HumanBehaviourChangeProject/ontologies
    platform: GitHub
  - label: OLS
    url: https://www.ebi.ac.uk/ols4/ontologies/bcio
    platform: OLS
bssoFoundry: true
license: CC-BY-4.0
tags:
  - ontology
  - behaviour-change
  - interventions
lastUpdated: 2026-04-01
```

## Publication

A peer-reviewed paper, preprint, report, or article produced by or directly
relevant to the network — for example journal articles, conference papers, and
foundational reports. Publications carry bibliographic metadata (year, venue,
DOI, authors) and link out to the DOI or landing page; author ORCIDs are
resolved from `network-members.yaml`.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `publishedYear` | Yes | number | Four-digit year. |
| `publishedMonth` | No | number | 1–12. |
| `publishedDay` | No | number | 1–31. |
| `venue` | Yes | string | Journal, conference, or publisher. |
| `doi` | No | string | DOI (URL or bare). |
| `pmid` | No | string | PubMed ID. |
| `keywords` | Yes | list | Author/topic keywords. May be empty (`[]`). |
| `contributors` | Yes | list | Authors — each `{name, orcid?}`. ORCIDs are auto-resolved from `network-members.yaml`; see [network members](#). |

```yaml
id: pub-apricot-hbcp-phase2
name: "The Human Behaviour-Change Project Phase 2: Advancing behavioural and social sciences through ontology tools"
type: Publication
publishedYear: 2024
publishedMonth: 12
doi: "https://doi.org/10.12688/wellcomeopenres.23520.1"
venue: Wellcome Open Research
description: >-
  Describes the second phase of the Human Behaviour-Change Project, which
  extends an ontology of behaviour change interventions with health-related
  behaviours, a community of practice, and tooling.
keywords: []
contributors:
  - name: Susan Michie
    orcid: "0000-0003-0063-6378"
  - name: Robert West
    orcid: "0000-0001-6398-0921"
producedByProjects:
  - APRICOT
usedByProjects: []
links:
  - label: DOI
    url: https://doi.org/10.12688/wellcomeopenres.23520.1
    platform: Website
tags:
  - paper
  - wellcome-open-research
lastUpdated: 2026-04-03
```

## Website

A public-facing website for the network or one of its projects, such as a
project's landing page or the main Accelerate BASSO site. Use this type for
informational sites that orient visitors, as distinct from a code repository or
an ontology browser.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| _none_ | | | No fields beyond the common set. |

```yaml
id: apricot-website
name: APRICOT Project Website
type: Website
description: Project website for APRICOT, which develops ontologies to standardize behavioral science constructs in cancer prevention research.
producedByProjects:
  - APRICOT
usedByProjects: []
links:
  - label: Website
    url: https://accelerate-basso.regenstrief.org/pages/apricot.html
    platform: Website
tags:
  - website
  - cancer-prevention
lastUpdated: 2026-04-01
```

## Repository

A version-controlled or curated store of source artifacts — for example a
GitHub repository holding ontology source files and tooling, or a curated slice
of an ontology repository like the BSSO BioPortal Slice. Use this type for the
place the source lives, as opposed to a published release or a browsable
registry.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `license` | No | string | License (SPDX id or short name, e.g. `Apache-2.0`). |

```yaml
id: phases-github
name: PHASES GitHub Organization
type: Repository
description: GitHub organization hosting the ontology sources and tooling for the PHASES project.
producedByProjects:
  - PHASES
usedByProjects: []
links:
  - label: GitHub
    url: https://github.com/PHASES-project
    platform: GitHub
tags:
  - repository
  - solitude
lastUpdated: 2026-04-01
```

## Registry

A coordinated collection that catalogues and curates many ontologies or
standards, such as the BSSO Foundry. A registry is about the curated collection
itself — its interoperability conventions and membership — rather than any
single ontology within it.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| _none_ | | | No fields beyond the common set. |

```yaml
id: bsso-foundry
name: BSSO Foundry
type: Registry
description: A coordinated registry of interoperable behavioural and social science ontologies.
producedByProjects:
  - DCC
usedByProjects: []
links:
  - label: Website
    url: https://bssofoundry.org
    platform: Website
tags:
  - registry
  - foundry
lastUpdated: 2026-04-01
```

## Community

A forum or community of practice where people discuss and share knowledge
around the network's work — for example the APRICOT Discourse community. Use
this type for ongoing discussion spaces, typically linked via their forum or
platform URL.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| _none_ | | | No fields beyond the common set. |

```yaml
id: apricot-community
name: APRICOT Community of Practice
type: Community
description: A community of practice for ontologies in the social and behavioural sciences.
producedByProjects:
  - APRICOT
usedByProjects: []
links:
  - label: Discourse
    url: https://example.discourse.group
    platform: Discourse
tags:
  - community
  - community-of-practice
lastUpdated: 2026-04-01
```

## Tool

A piece of software or an interactive platform produced by network members —
for example an ontology editor (onto-spread-ed), a theory-and-techniques tool
(TaTT), or a searchable theory database. This type is for the network's own
tools, not third-party software the network merely uses. Tools may be hosted
web applications or installable software; the portal links to where each can be
used or obtained.

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `license` | No | string | License (SPDX id or short name, e.g. `MIT`). |

```yaml
id: tatt
name: Text Annotation Training Tool (TATT)
type: Tool
description: A tool supporting the annotation of behavioural science texts against ontologies.
producedByProjects:
  - APRICOT
usedByProjects: []
links:
  - label: GitHub
    url: https://github.com/example/tatt
    platform: GitHub
license: MIT
tags:
  - tool
  - annotation
lastUpdated: 2026-04-01
```

## Dataset

A structured collection of data produced or curated by the network, typically
deposited in an archive such as Zenodo or OSF with a DOI. Datasets carry an
optional DOI and license/access terms, and link to the archive record. (This
type is supported but no datasets are listed yet.)

Extra fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `doi` | No | string | Dataset DOI (URL or bare). |
| `license` | No | string | License or access terms (e.g. `CC-BY-4.0`). |

```yaml
id: example-dataset
name: Example Dataset
type: Dataset
description: A dataset produced by the network.
doi: "https://doi.org/10.5281/zenodo.0000000"
license: CC-BY-4.0
producedByProjects:
  - PHASES
usedByProjects: []
links:
  - label: Zenodo
    url: https://zenodo.org/records/0000000
    platform: Zenodo
tags:
  - dataset
lastUpdated: 2026-04-01
```
