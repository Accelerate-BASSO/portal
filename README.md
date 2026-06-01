# Accelerate BASSO Portal

A curated discovery portal for resources produced by the [Accelerate BASSO Network](https://accelerate-basso.regenstrief.org) — ontologies, publications, tools, datasets, and communities for the behavioral and social sciences.

**Live site:** https://accelerate-basso.github.io/portal/

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

Each resource is a single YAML file organized by type under `data/resources/`:

```
data/resources/
  ontologies/       # Ontology resources
  publications/     # Papers, reports, articles
  websites/         # Project and network websites
  repositories/     # Code and data repositories
  registries/       # Standards registries
  communities/      # Forums and communities
```

To add one:

1. Create a new `.yaml` file in the appropriate subdirectory (use a kebab-case filename)
2. Follow the schema below
3. Submit a pull request

That's it — the portal picks up new files automatically on the next build.

---

## Resource YAML Schema

Each resource is a YAML file under `data/resources/`, in a subdirectory named
for its type. The full schema — every field, the controlled vocabularies, and a
complete example for each resource type — is documented in
**[docs/resource-schema.md](docs/resource-schema.md)**.

In brief, every resource has: `id`, `name`, `type`, `description`,
`producedByProjects`, `usedByProjects`, `links`, `tags`, and `lastUpdated`.
Ontologies add `bssoFoundry`; publications add `publishedYear` (plus optional
month/day), `venue`, `doi`, `keywords`, and `contributors`.

Resource files are validated on every push and pull request by
`scripts/validate-resources.py`. Run it locally with:

```bash
python scripts/validate-resources.py
```

---

## Updating an Existing Resource

To suggest changes to an existing resource, [open an Update Resource issue](../../issues/new?template=update-resource.yml).

Or edit the YAML file directly and submit a pull request.

---

## Generating Publication YAML

You can generate a publication YAML file from any supported source. First install dependencies:

```bash
pip install bibtexparser pyyaml
```

The easiest way is `--source`, which auto-detects the input type:

```bash
# Auto-detect — just paste a URL, ID, or BibTeX
python scripts/pub-to-yaml.py --source "https://pubmed.ncbi.nlm.nih.gov/41001555/" --projects PHASES
python scripts/pub-to-yaml.py --source "10.12688/wellcomeopenres.23520.1" --projects APRICOT
python scripts/pub-to-yaml.py --source "https://arxiv.org/abs/2301.12345" --projects APRICOT
python scripts/pub-to-yaml.py --source "https://psyarxiv.com/abc12" --projects PHASES

# Write directly to a file
python scripts/pub-to-yaml.py --source "41001555" --projects PHASES --output data/resources/pub-example.yaml
```

Supported sources: PubMed, PMC, DOI/CrossRef, arXiv, PsyArXiv, SocArXiv, OSF Preprints, BibTeX.

You can also use explicit flags: `--pmid`, `--doi`, `--arxiv`, `--osf`, `--bibtex`.

Options:
- `--pmid` — PubMed ID or URL
- `--doi` — DOI string or URL
- `--bibtex` — BibTeX file path, or `-` for stdin
- `--projects` — project names (e.g. `--projects APRICOT PHASES`)
- `--link` — additional link as `"Label - URL"` (can be repeated)
- `--description` — override the generated description
- `--output` — write to a file instead of stdout

### Network member ORCIDs

The file `data/network-members.yaml` lists known network members and maps their names to ORCIDs. When generating publication YAML, the script automatically resolves ORCIDs from this file — even when the publication source (e.g. PubMed) doesn't provide them.

To add a member, add an entry to `data/network-members.yaml`:

```yaml
  - names: [Jane Smith, J Smith]
    orcid: "0000-0001-2345-6789"          # optional
    ror: "https://ror.org/02jx3x895"      # optional, current institution
    homepage: "https://example.edu/jsmith"  # optional
    linkedin: "https://linkedin.com/in/jsmith"  # optional
    projects:                             # optional, roles per project
      - {id: APRICOT, role: Co-I}
      - {id: DCC, role: Researcher}
```

List every spelling a name may take under `names` (the first is canonical). `orcid`, `ror`, `homepage`, and `linkedin` are all optional — a member with no confirmed ORCID is still listed but skipped during ORCID resolution.

A member's role is specific to a project, so roles live in the optional `projects` list (one `{id, role}` per project; a person may appear on several with different roles). `role` may be omitted when not yet known.

- **project ids:** `BSO-AD`, `APRICOT`, `ODFA`, `PHASES`, `DCC`
- **roles:** `Contact PI`, `Multiple PI`, `Co-I`, `Expert Consultant`, `Consultant`, `Project Manager`, `Administrator`, `Researcher`, `Postdoc`, `Program Officer`, `Project Scientist`

The file is validated on every push and pull request by `scripts/validate-network-members.py` (checks YAML shape, duplicate names, ORCID/ROR formats, and that project ids and roles are from the lists above). Run it locally with:

```bash
python scripts/validate-network-members.py
```

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
