# Accelerate BASSO Portal

A curated discovery portal for resources produced by the [Accelerate BASSO Network](https://accelerate-basso.regenstrief.org) — ontologies, publications, tools, datasets, and communities for the behavioral and social sciences.

Supported by the National Institute of Aging (NIA) U24AG088019.

## Adding a New Resource

There are two ways to add a resource to the portal:

### Option 1: Submit an Issue (no coding required)

Go to the [New Issue](../../issues/new/choose) page and pick the template that matches your resource type:

- **Add an ontology**
- **Add a publication**
- **Add a repository**
- **Add a website**
- **Add a community**
- **Add a tool, registry, or dataset**

Fill out the form and submit. A portal maintainer will create the resource file from your submission.

### Option 2: Add a YAML File Directly

Each resource is a single YAML file in the `data/resources/` directory. To add one:

1. Create a new `.yaml` file in `data/resources/` (use a kebab-case filename, e.g. `my-ontology.yaml`)
2. Follow the schema below
3. Submit a pull request

That's it — the portal picks up new files automatically on the next build.

---

## Resource YAML Schema

Every resource file has these fields:

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier, kebab-case (e.g. `bcio`, `nas-report-2022`) |
| `name` | Yes | Display name |
| `type` | Yes | One of: `Ontology`, `Publication`, `Repository`, `Website`, `Registry`, `Community`, `Tool`, `Dataset` |
| `description` | Yes | 1-3 sentence summary |
| `developedByProjects` | Yes | List of projects that develop/maintain this resource |
| `usedByProjects` | Yes | List of projects that use this resource |
| `links` | Yes | List of links (see below) |
| `status` | Yes | One of: `Active`, `In Development`, `Archived` |
| `tags` | Yes | List of searchable keywords |
| `lastUpdated` | Yes | Date the metadata was last reviewed (YYYY-MM-DD) |
| `bssoFoundry` | Ontologies only | `true` or `false` |
| `publishedDate` | Publications only | Publication date in YYYY-MM format |

**Project names** must be one of: `APRICOT`, `BSO-AD`, `ODFA`, `PHASES`, `DCC`

**Links** are a list of objects with:
- `label` — display text (e.g. `GitHub`, `DOI`, `PubMed`)
- `url` — the full URL
- `platform` — one of: `GitHub`, `BioPortal`, `OLS`, `Ontobee`, `Zenodo`, `OSF`, `Website`, `Discourse`, `Other`

Use `developedByProjects: []` or `usedByProjects: []` if a field doesn't apply.

---

## Examples

### Ontology

```yaml
id: bcio
name: Behaviour Change Intervention Ontology (BCIO)
type: Ontology
description: An ontology for annotating and synthesising evidence about behaviour change interventions.
developedByProjects:
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
status: Active
lastUpdated: "2026-04-01"
```

### Publication

```yaml
id: pub-apricot-hbcp-phase2
name: "The Human Behaviour-Change Project Phase 2: Advancing behavioural and social sciences through ontology tools"
type: Publication
publishedDate: "2024-12"
description: Describes the second phase of the Human Behaviour-Change Project. Published in Wellcome Open Research.
developedByProjects:
  - APRICOT
usedByProjects: []
links:
  - label: DOI
    url: https://doi.org/10.12688/wellcomeopenres.23520.1
    platform: Website
tags:
  - paper
  - behaviour-change
  - ontology-tools
status: Active
lastUpdated: "2026-04-01"
```

### Website

```yaml
id: apricot-website
name: APRICOT Project Website
type: Website
description: Project website for APRICOT, which develops ontologies to standardize behavioral science constructs in cancer prevention research.
developedByProjects:
  - APRICOT
usedByProjects: []
links:
  - label: Website
    url: https://accelerate-basso.regenstrief.org/pages/apricot.html
    platform: Website
tags:
  - website
  - cancer-prevention
status: Active
lastUpdated: "2026-04-01"
```

---

## Updating an Existing Resource

To suggest changes to an existing resource, [open an Update Resource issue](../../issues/new?template=update-resource.yml).

Or edit the YAML file directly and submit a pull request.

---

## Adding Publications from BibTeX

You can generate a publication YAML file from a BibTeX entry:

```bash
# From a file
node scripts/bibtex-to-yaml.js paper.bib --projects APRICOT

# From clipboard / stdin
pbpaste | node scripts/bibtex-to-yaml.js --projects APRICOT --pubmed https://pubmed.ncbi.nlm.nih.gov/12345/

# Write directly to a file
node scripts/bibtex-to-yaml.js paper.bib --projects PHASES --output data/resources/pub-my-paper.yaml
```

Options:
- `--projects` — comma-separated project names (e.g. `APRICOT,PHASES`)
- `--pubmed` — PubMed URL
- `--link` — additional link in `"Label - URL"` format
- `--description` — override the generated description
- `--output` — write to a file instead of stdout

---

## Running the Portal Locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Built With

- [Next.js](https://nextjs.org) + TypeScript + Tailwind CSS
- Resource metadata stored as YAML files in Git
