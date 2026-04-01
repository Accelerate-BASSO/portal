# Accelerate BASSO Portal --- Design Document

**Version:** 0.1 (Draft)
**Date:** April 2026
**Network:** Accelerate BASSO (U24AG088019)
**URL:** [https://accelerate-basso.regenstrief.org](https://accelerate-basso.regenstrief.org)

---

## 1. Purpose and Scope

The Accelerate BASSO Network --- "Accelerating Behavioral and Social Science through Ontology Development and Use" --- is a U01 Network Center funded by the National Institute on Aging (NIA) under award U24AG088019. The network produces a wide range of resources --- ontologies, publications, datasets, tools, and communities --- that are scattered across multiple platforms including GitHub, BioPortal, OSF, Zenodo, the BSSO Foundry, Discourse, and individual project websites.

The **Accelerate BASSO Portal** is a **curated discovery layer** that aggregates metadata about these resources and links out to where they actually live. It is explicitly **not** a content repository; it does not host ontology files, store datasets, or mirror publications. Instead, it provides a single point of entry for finding, understanding, and navigating to Network resources.

The portal is mandated by two of the Network's stated aims:

- **Aim 1** calls for a FAIR-compliant, public-facing portal that makes Network outputs discoverable and accessible.
- **Aim 3** calls for a resource "toolbox" that organizes tools, ontologies, and supporting materials for the broader research community.

**In scope:**

- Aggregating lightweight metadata about Network resources
- Providing search, filtering, and browsing capabilities
- Linking out to authoritative source locations
- Presenting a clear overview of the Network's outputs

**Out of scope (for now):**

- Hosting or duplicating resource content
- Providing ontology browsing or querying capabilities (deferred to BioPortal)
- User accounts or authentication
- Automated ingestion pipelines

---

## 2. Target Audiences

The portal serves three distinct audiences, each with different needs and expectations.

| Audience | Needs | Portal Response |
|---|---|---|
| **Beginners** | Guided discovery. "I don't know what I don't know." They may be new to behavioral/social science ontologies and need orientation. | Curated pathways, plain-language descriptions, project-based grouping, and a welcoming landing page that explains what the Network produces and why it matters. |
| **Advanced users** | Efficient, direct access. They already know what they are looking for and want to find it quickly without clicking through multiple websites. | Search with type-ahead, filtering by resource type / project / tags / foundry membership, and direct links to GitHub repos, BioPortal entries, and publications. |
| **Funders and stakeholders** | High-level visibility and metrics. They want to see the breadth and impact of Network outputs at a glance. | Overview statistics on the landing page (resource counts by type and project), a clear presentation of the Network's scope, and a foundation for future metrics dashboards. |

---

## 3. Resource Model

Each resource indexed by the portal is described by a lightweight metadata schema. The schema is intentionally minimal: it captures just enough information to enable discovery and navigation without imposing a heavy curation burden on Network members.

### Schema Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier (slug), e.g. `bcio`, `nas-report-2022` |
| `name` | string | Yes | Human-readable display name |
| `type` | enum | Yes | One of: `Ontology`, `Publication`, `Dataset`, `Tool`, `Community`, `Repository` |
| `description` | string | Yes | Brief plain-language description (1--3 sentences) |
| `projectAffiliation` | enum | Yes | One of: `PHASES`, `BSO-AD`, `APRICOT`, `ODFA`, `Cross-cutting`, `DCC` |
| `links` | array | Yes | One or more links, each with `label`, `url`, and `platform` |
| `links[].platform` | enum | --- | One of: `GitHub`, `BioPortal`, `Zenodo`, `OSF`, `Website`, `Discourse`, `Other` |
| `bssoFoundry` | boolean | No | Whether the resource is part of the BSSO Foundry (applies to ontologies) |
| `tags` | array | No | Free-text tags for additional discoverability |
| `status` | enum | No | One of: `Active`, `In Development`, `Archived`. Defaults to `Active` |
| `lastUpdated` | date | No | Date the resource metadata was last reviewed or updated |

### Example Resource (YAML)

```yaml
id: bcio
name: Behaviour Change Intervention Ontology (BCIO)
type: Ontology
description: >
  An ontology for describing behaviour change interventions, their components,
  and mechanisms of action.
projectAffiliation: Cross-cutting
links:
  - label: GitHub Repository
    url: https://github.com/HumanBehaviourChangeProject/ontologies
    platform: GitHub
  - label: BioPortal
    url: https://bioportal.bioontology.org/ontologies/BCIO
    platform: BioPortal
bssoFoundry: true
tags:
  - behaviour change
  - interventions
status: Active
lastUpdated: 2026-03-15
```

### Why This Schema

- **Lightweight:** Each resource can be described in under 20 lines of YAML. This keeps the curation cost low and encourages inclusion rather than perfectionism.
- **FAIR-aligned:** Resources have persistent identifiers, structured metadata, and explicit links to accessible locations --- satisfying the spirit of Findable, Accessible, Interoperable, and Reusable principles without requiring full FAIR compliance at the metadata level.
- **Easy to maintain:** YAML files in a Git repository can be edited by anyone with a text editor and a GitHub account. No database migrations, no admin panels, no special tooling required.
- **Extensible:** Additional fields (e.g., license, contributors, DOI) can be added later without breaking existing resource files.

---

## 4. Inclusion Criteria

Not everything related to behavioral and social science ontologies belongs in the portal. The following criteria govern what is included.

### Requirements for Inclusion

1. **Network product or direct relevance.** The resource must be a product of an Accelerate BASSO Network project, or must be directly relevant to the Network's mission (e.g., a foundational publication that the Network builds upon).
2. **At least one accessible public link.** The resource must be reachable on the public internet. Resources behind institutional paywalls are acceptable if a public landing page exists (e.g., a DOI link to a journal article).
3. **Vouched for by a Network member.** A member of the Network must confirm that the resource is appropriate for inclusion. This prevents the portal from becoming a general-purpose directory.

### Curation Process

- **Initially:** The Data Coordinating Center (DCC) curates the resource list, adding resources as they are identified through Network activities.
- **Later:** Network members can submit resources via pull request to the data repository or through a web-based submission form. Submissions are reviewed by the DCC before inclusion.

### Important Note on Status

Resources with a status of **"In Development"** are welcome in the portal. Inclusion is not an endorsement of completeness or production-readiness. The portal is a discovery tool, not a certification authority. Marking a resource as "In Development" sets appropriate expectations while still making the resource findable.

---

## 5. Information Architecture

The portal is organized around three primary views, designed to serve the three target audiences.

### Site Map

```
/                          Landing page
/resources                 Resource browser (search, filter, browse)
/resources/[id]            Resource detail view (optional; may link out directly)
/about                     About the portal and the Network
```

### Landing Page (`/`)

The landing page serves as the front door for all three audiences.

- **Hero section:** Network name, tagline, and a brief explanation of what the portal offers.
- **Overview statistics:** Resource counts by type (e.g., "8 Ontologies, 1 Publication, 2 Tools...") presented as simple, scannable cards.
- **Audience pathways:** Three clearly labeled entry points:
  - "New to the Network?" leads to a guided introduction and curated starting points.
  - "Find a resource" leads directly to the resource browser with search focused.
  - "Network overview" leads to a summary view suitable for stakeholders.

### Resource Browser (`/resources`)

The primary working view of the portal.

- **Search bar:** Full-text search across resource names, descriptions, and tags.
- **Filters:** Faceted filtering by:
  - Resource type (Ontology, Publication, Dataset, Tool, Community, Repository)
  - Project affiliation (PHASES, BSO-AD, APRICOT, ODFA, Cross-cutting, DCC)
  - BSSO Foundry membership (Yes/No)
  - Status (Active, In Development, Archived)
  - Tags
- **Resource cards:** Each resource is displayed as a card showing name, type badge, description excerpt, project affiliation, and primary link. Cards are the main interaction element.

### Resource Detail (`/resources/[id]`)

An expanded view for a single resource, showing all metadata fields and all associated links. This view is optional in the initial release --- cards in the browser may simply link out to the resource's primary URL. The detail view becomes more valuable as resources accumulate richer metadata.

### Navigation

- **Top navigation bar:** Logo/site name, "Resources" link, "About" link.
- **Breadcrumbs:** Shown on detail pages (Home > Resources > Resource Name).
- **Footer:** Network name, funding acknowledgment (NIA U24AG088019), and link to the main Accelerate BASSO website.

---

## 6. Technical Architecture

### Technology Stack

| Component | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js (App Router) | React-based, supports static export, strong ecosystem, TypeScript-first |
| **Language** | TypeScript | Type safety for resource schema, better developer experience |
| **Styling** | Tailwind CSS | Utility-first, fast iteration, easy to match existing visual identity |
| **Data store** | YAML files in Git | No database needed; version-controlled; editable by non-developers |
| **Hosting** | Static export | Deployable anywhere: GitHub Pages, Vercel, Netlify, institutional hosting |

### Data Architecture

Resources are stored as individual YAML files in the repository:

```
data/
  resources/
    addicto.yaml
    bcio.yaml
    copper.yaml
    gmho.yaml
    mf.yaml
    mfoem.yaml
    omrse.yaml
    rbbo.yaml
    bsso-foundry.yaml
    bsso-bioportal-slice.yaml
    nas-report-2022.yaml
    apricot-community.yaml
    accelerate-basso-website.yaml
    odfa.yaml
```

At build time, Next.js reads all YAML files, validates them against the schema, and generates static pages. There is no runtime database and no backend server.

### Visual Design

The portal mirrors the visual identity of the existing Accelerate BASSO website at [accelerate-basso.regenstrief.org](https://accelerate-basso.regenstrief.org):

- **Font:** Roboto (consistent with the main site)
- **Accent color:** Green-200 palette
- **Layout:** Clean, minimal card-based design
- **Responsive:** Mobile-friendly from the outset

### Deployment

The portal is built as a static site using `next export`, producing plain HTML, CSS, and JavaScript files that can be served from any static hosting provider. No server-side rendering or API routes are required for the initial release.

### Future Evolution

- **Headless CMS:** A system like Decap CMS (formerly Netlify CMS) or Tina CMS can be layered on top of the YAML files to provide a web-based editing interface for non-technical Network members.
- **API integrations:** GitHub API and BioPortal API can be called at build time to automatically refresh metadata (e.g., last commit date, ontology version).
- **Search enhancement:** Client-side search libraries (e.g., Fuse.js, Lunr) can be added for more sophisticated full-text search as the resource count grows.

---

## 7. Design Principles

The following principles guide decisions about what the portal does and does not do.

1. **Link, don't duplicate.** The portal points to resources; it does not host copies. This avoids synchronization problems and respects the authority of source platforms.

2. **Curate, don't automate (initially).** Human curation ensures quality and relevance. Automation can be introduced later for metadata refresh, but the inclusion decision remains human.

3. **Lightweight inclusion over heavy onboarding.** Adding a resource to the portal should take minutes, not hours. A name, description, type, project, and one link are enough to start.

4. **FAIR-aligned metadata.** Resources have identifiers, structured descriptions, and explicit links. The portal itself contributes to making Network outputs more Findable and Accessible.

5. **Complement existing platforms, don't compete.** The portal does not replace BioPortal for ontology browsing, GitHub for code hosting, or Zenodo for archival. It sits alongside them as a discovery layer.

---

## 8. Relationship to Existing Website

The Accelerate BASSO Network already maintains a website at [accelerate-basso.regenstrief.org](https://accelerate-basso.regenstrief.org). The portal is a **complement**, not a replacement.

| Aspect | Main Website | Portal |
|---|---|---|
| **Purpose** | Network information, news, team, governance | Resource discovery and navigation |
| **Content** | Narrative pages, announcements, meeting info | Structured resource metadata |
| **Audience** | General public, prospective collaborators | Researchers, ontology users, funders |
| **Maintenance** | Content management by Network leadership | YAML file curation by DCC and contributors |

### Deployment Options

The portal can be deployed in several ways relative to the main website:

- **Subdomain:** `portal.accelerate-basso.regenstrief.org` (recommended for clarity)
- **Path-based:** `accelerate-basso.regenstrief.org/portal/` (requires coordination with main site hosting)
- **Separate domain:** Not recommended; fragments the Network's web presence

### Shared Visual Identity

Regardless of deployment approach, the portal shares the main website's visual identity (fonts, colors, logo) to present a unified face to users navigating between the two.

---

## 9. Initial Resource Set

The proof-of-concept launch includes approximately 14 resources representing the breadth of Network outputs.

### BSSO Foundry Ontologies (8)

| Resource | Type | Project | Status |
|---|---|---|---|
| ADDICTO (Addiction Ontology) | Ontology | Cross-cutting | Active |
| BCIO (Behaviour Change Intervention Ontology) | Ontology | Cross-cutting | Active |
| COPPER (Cognitive Process Ontology for Personality Research) | Ontology | Cross-cutting | Active |
| GMHO (Global Mental Health Ontology) | Ontology | Cross-cutting | Active |
| MF (Mental Functioning Ontology) | Ontology | Cross-cutting | Active |
| MFOEM (Mental Functioning Ontology for Emotion) | Ontology | Cross-cutting | Active |
| OMRSE (Ontology of Medically Related Social Entities) | Ontology | Cross-cutting | Active |
| RBBO (Relation Between Body and Behavior Ontology) | Ontology | Cross-cutting | Active |

### Tools and Platforms (3)

| Resource | Type | Project | Status |
|---|---|---|---|
| BSSO Foundry | Tool | DCC | Active |
| BSSO BioPortal Slice | Tool | DCC | Active |
| Accelerate BASSO Website | Tool | DCC | Active |

### Publications (1)

| Resource | Type | Project | Status |
|---|---|---|---|
| NAS Report 2022 (Ontologies in the Behavioral Sciences) | Publication | Cross-cutting | Active |

### Communities (1)

| Resource | Type | Project | Status |
|---|---|---|---|
| APRICOT Community of Practice | Community | APRICOT | Active |

### In Development (1)

| Resource | Type | Project | Status |
|---|---|---|---|
| ODFA (Ontology Design for Aging) | Ontology | ODFA | In Development |

**Total: 14 resources** across 4 resource types and 3 project affiliations.

---

## 10. Open Questions

The following questions remain open and should be discussed by the working group.

1. **Hosting location.** Should the portal be hosted on institutional infrastructure (Regenstrief), a cloud platform (Vercel, Netlify), or GitHub Pages? Each option has different implications for cost, maintenance, and URL stability.

2. **Long-term governance of resource inclusion.** Who decides what gets added to the portal after the initial launch? Should there be a formal review process, or is DCC approval sufficient?

3. **Automated metadata refresh.** Should the portal pull metadata from external APIs (e.g., GitHub for last commit date, BioPortal for ontology version) at build time? This reduces manual maintenance but adds complexity and potential points of failure.

4. **Integration with BSSO BioPortal slice.** Should the portal link directly into BioPortal class browsers for ontology resources, or is a simple link to the ontology landing page sufficient?

5. **Metrics and analytics for funder reporting.** What usage metrics should the portal capture? Page views, resource clicks, search terms? What analytics platform is appropriate given institutional policies?

6. **Resource granularity.** Should large ontology projects that produce multiple artifacts (e.g., a core ontology plus application ontologies) be listed as one resource or several?

7. **Non-English resources.** Are there Network resources in languages other than English that need to be accommodated?

---

## 11. Roadmap

### Phase 1: Proof of Concept (Current)

- Portal with approximately 15 curated resources
- Static site with search and filtering
- YAML-based data store
- Visual alignment with the main Network website
- Deployed for working group review and feedback

### Phase 2: Expanded Coverage

- Broaden resource coverage across all Network projects
- Add a headless CMS (Decap or Tina) for non-technical editing
- Refine the resource schema based on Phase 1 feedback
- Formalize the inclusion and curation process

### Phase 3: API Integrations

- Connect to GitHub API to pull repository metadata (stars, last commit, contributors)
- Connect to BioPortal API to pull ontology metadata (class count, version, last update)
- Add a metrics dashboard for funder reporting
- Improve search with client-side full-text indexing

### Phase 4: Community Submissions

- Web-based resource submission form for Network members
- Automated freshness checks (flag resources with stale links or outdated metadata)
- Potential integration with ORCID for contributor identification
- Explore automated discovery of new Network outputs

---

## Appendix: Funding Acknowledgment

This portal is developed as part of the Accelerate BASSO Network, funded by the National Institute on Aging (NIA) under award U24AG088019.
