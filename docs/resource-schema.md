# Resource Schema

This is the reference for the resource metadata files under `data/resources/`.

## Resource types

| Type | Description |
|---|---|
| `Ontology` | A behavioural/social science ontology. |
| `Publication` | A paper, report, or article. |
| `Website` | A project or network website. |
| `Repository` | A code or data repository. |
| `Registry` | A standards or ontology registry. |
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

Use a kebab-case filename (e.g. `bcio.yaml`, `nas-report-2022.yaml`). The portal
picks up new files automatically on the next build. Every file is checked in CI
by `scripts/validate-resources.py`; run it locally with
`python scripts/validate-resources.py`.

## Common fields (every resource)

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | Yes | string | Unique identifier, kebab-case. Must be unique across all resources. |
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

## Ontology

Extra field: `bssoFoundry` (boolean, required for ontologies) — whether the
ontology is part of the BSSO Foundry.

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
tags:
  - ontology
  - behaviour-change
  - interventions
lastUpdated: 2026-04-01
```

## Publication

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

No extra fields beyond the common set.

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

No extra fields beyond the common set. Use for code or data repositories.

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

No extra fields beyond the common set. Use for standards/ontology registries.

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

No extra fields beyond the common set. Use for forums and communities of practice.

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

No extra fields beyond the common set. Use for software tools and platforms.

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
tags:
  - tool
  - annotation
lastUpdated: 2026-04-01
```

## Dataset

No extra fields beyond the common set. (Supported but none exist yet.)

```yaml
id: example-dataset
name: Example Dataset
type: Dataset
description: A dataset produced by the network.
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
