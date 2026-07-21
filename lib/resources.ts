import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface ResourceLink {
  label: string;
  url: string;
  platform: "GitHub" | "BioPortal" | "Zenodo" | "OSF" | "Website" | "Discourse" | "OLS" | "Ontobee" | "Other";
}

export type ProjectName = "PHASES" | "BSO-AD" | "APRICOT" | "ODFA" | "DCC";

export interface Contributor {
  name: string;
  orcid?: string;
}

export type ResourceType =
  | "Ontology" | "Publication" | "Tool" | "Community"
  | "Repository" | "Dataset" | "Website" | "Registry";

/** Fields common to every resource, plus build-injected metadata. */
interface BaseResource {
  id: string;
  name: string;
  description: string;
  producedByProjects: ProjectName[];
  usedByProjects: ProjectName[];
  links: ResourceLink[];
  keywords: string[];
  lastUpdated: string;
  // Curated ids of Ontology resources this resource is *about* (a human-asserted
  // "this resource concerns this ontology" relationship, unrelated to the
  // automated term annotations). Rendered as the "Ontologies" links.
  aboutOntologies?: string[];
  // Curated ontology terms this resource concerns, each in an asserted facet/role
  // (see data/facets.yaml). Human-reviewed — the published term display reads
  // only this, not the automated `annotations` (which power search). The
  // suggestion script drafts these from the annotations for a curator to accept.
  ontologyTerms?: CuratedTerm[];
  // Injected at build time from caches, keyed by id (see getAllResources).
  bioportal?: BioportalMetrics;
  githubRelease?: GithubRelease;
  paperContent?: PaperContent;
  annotations?: TermAnnotation[];
  _sourcePath?: string;
}

/** Reusable artifacts carry an optional license (SPDX id or short name). */
interface Licensed {
  license?: string;
}

/** Ontology resources carry BSSO Foundry membership and a license. */
export interface OntologyResource extends BaseResource, Licensed {
  type: "Ontology";
  bssoFoundry?: boolean;
}

/** Publications carry bibliographic metadata. */
export interface PublicationResource extends BaseResource {
  type: "Publication";
  publishedYear?: number;
  publishedMonth?: number;
  publishedDay?: number;
  doi?: string;
  pmid?: string;
  venue?: string;
  contributors?: Contributor[];
}

/** Software tools carry a license. */
export interface ToolResource extends BaseResource, Licensed {
  type: "Tool";
}

/** Code/data repositories carry a license. */
export interface RepositoryResource extends BaseResource, Licensed {
  type: "Repository";
}

/** Datasets carry a license and an optional DOI. */
export interface DatasetResource extends BaseResource, Licensed {
  type: "Dataset";
  doi?: string;
}

/** Resource types with no fields beyond the common set. */
export interface PlainResource extends BaseResource {
  type: "Community" | "Website" | "Registry";
}

export type Resource =
  | OntologyResource
  | PublicationResource
  | ToolResource
  | RepositoryResource
  | DatasetResource
  | PlainResource;

export interface GithubRelease {
  version: string;
  date: string;
}

/**
 * Publication content fetched offline from Europe PMC (see
 * scripts/fetch-paper-content.py). Only the abstract and its provenance are
 * exposed here; full text is cached out-of-band for indexing and never shipped.
 */
export interface PaperContent {
  abstract?: string;
  isOpenAccess?: boolean;
  retrieved?: string;
}

/** A facet (role) a curated term can play; defined in data/facets.yaml. */
export interface Facet {
  key: string;
  label: string;
  order: number;
  tint?: string;
}

/**
 * A curator-asserted term for a resource, with the facet/role it plays. Usually
 * backed by an ontology class (iri + ontology + resolved url), but may be an
 * unbacked concept the curator considers relevant with no matching ontology term
 * — then iri/ontology/url are absent and it renders as a plain concept chip.
 * Self-contained so the display links and groups without any lookup.
 */
export interface CuratedTerm {
  prefLabel: string;
  facet: string;
  iri?: string;
  ontology?: string;
  url?: string;
}

/**
 * An ontology term matched in a publication's text (see
 * scripts/annotate-papers.py). Automated enrichment used for SEARCH ONLY — no
 * longer shown per-resource (the curated `ontologyTerms` is). `forms` holds the
 * term's label plus synonyms, indexed for search so a query in lay terms can
 * find a paper annotated with the technical term.
 */
export interface TermAnnotation {
  iri: string;
  curie: string;
  prefLabel: string;
  ontology: string;
  forms: string[];
  count: number;
  source: "abstract" | "fulltext";
  // Facet from BFO ancestry (see scripts/assign-term-facets.py): "method",
  // "population", or "other". The UI treats abstract-matched terms as the
  // paper's subject, overriding this. Absent if faceting hasn't run.
  facet?: "method" | "population" | "other";
  // Browsable link for the term, resolved at build time (see resolveTermUrl):
  // the BioPortal term page when the ontology is in BioPortal
  // (data/ontology-term-links.yaml), else the term's raw IRI.
  url: string;
}

export interface BioportalMetrics {
  acronym: string;
  classes?: number;
  properties?: number;
  individuals?: number;
  maxDepth?: number;
  released?: string;
  hasOntologyLanguage?: string;
  homepage?: string;
  status?: string;
}

const resourcesDir = path.join(process.cwd(), "data", "resources");

function findYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findYamlFiles(fullPath));
    } else if (entry.name.endsWith(".yaml")) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadBioportalCache(): Record<string, BioportalMetrics> {
  const cacheFile = path.join(process.cwd(), "data", "bioportal-cache.json");
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  }
  return {};
}

function loadGithubReleasesCache(): Record<string, GithubRelease> {
  const cacheFile = path.join(process.cwd(), "data", "github-releases-cache.json");
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  }
  return {};
}

function loadPaperContentCache(): Record<string, PaperContent> {
  const cacheFile = path.join(process.cwd(), "data", "paper-content-cache.json");
  if (!fs.existsSync(cacheFile)) {
    return {};
  }
  const raw = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Record<
    string,
    Record<string, unknown>
  >;
  // Expose only the abstract and its provenance; the cache also holds internal
  // pipeline fields (EPMC ids, full-text flags) that shouldn't ship to the client.
  const result: Record<string, PaperContent> = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (typeof entry.abstract === "string") {
      result[id] = {
        abstract: entry.abstract,
        isOpenAccess: entry.isOpenAccess === true,
        retrieved: typeof entry.retrieved === "string" ? entry.retrieved : undefined,
      };
    }
  }
  return result;
}

// Raw annotation records in the cache lack the resolved `url` (the Python
// annotator is unaware of link config); it's added at load time.
type RawAnnotation = Omit<TermAnnotation, "url">;

function loadAnnotationsCache(): Record<string, RawAnnotation[]> {
  const cacheFile = path.join(process.cwd(), "data", "paper-annotations-cache.json");
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
  }
  return {};
}

/**
 * Per-ontology term-link config (data/ontology-term-links.yaml): ontology
 * acronym -> BioPortal acronym. Ontologies present here are in BioPortal and
 * their terms link there; others fall back to the raw IRI.
 */
function loadTermLinkConfig(): Record<string, { bioportal: string }> {
  const file = path.join(process.cwd(), "data", "ontology-term-links.yaml");
  if (!fs.existsSync(file)) return {};
  return (yaml.load(fs.readFileSync(file, "utf-8")) as Record<string, { bioportal: string }>) ?? {};
}

/**
 * Browsable URL for a term (annotated or curated), by ontology + IRI. When the
 * ontology is in BioPortal (per config), link to the BioPortal term page, which
 * resolves reliably even where the raw IRI 404s (e.g. PHASES); else the raw IRI.
 */
function resolveTermUrl(
  ontology: string,
  iri: string,
  config: Record<string, { bioportal: string }>,
): string {
  const entry = config[ontology];
  if (entry?.bioportal) {
    return (
      `https://bioportal.bioontology.org/ontologies/${entry.bioportal}` +
      `?p=classes&conceptid=${encodeURIComponent(iri)}`
    );
  }
  return iri;
}

let facetsCache: Facet[] | null = null;

/** The controlled facet vocabulary (data/facets.yaml), ordered. */
export function getFacets(): Facet[] {
  if (facetsCache) return facetsCache;
  const file = path.join(process.cwd(), "data", "facets.yaml");
  const doc = fs.existsSync(file)
    ? (yaml.load(fs.readFileSync(file, "utf-8")) as { facets?: Facet[] })
    : {};
  facetsCache = (doc.facets ?? []).slice().sort((a, b) => a.order - b.order);
  return facetsCache;
}

export function getAllResources(): Resource[] {
  const files = findYamlFiles(resourcesDir);
  const bioportalCache = loadBioportalCache();
  const githubReleasesCache = loadGithubReleasesCache();
  const paperContentCache = loadPaperContentCache();
  const annotationsCache = loadAnnotationsCache();
  const termLinkConfig = loadTermLinkConfig();
  return files
    .map((file) => {
      const content = fs.readFileSync(file, "utf-8");
      const resource = yaml.load(content) as Resource;
      if (bioportalCache[resource.id]) {
        resource.bioportal = bioportalCache[resource.id];
      }
      if (githubReleasesCache[resource.id]) {
        resource.githubRelease = githubReleasesCache[resource.id];
      }
      if (paperContentCache[resource.id]) {
        resource.paperContent = paperContentCache[resource.id];
      }
      if (annotationsCache[resource.id]?.length) {
        resource.annotations = annotationsCache[resource.id].map((a) => ({
          ...a,
          url: resolveTermUrl(a.ontology, a.iri, termLinkConfig),
        }));
      }
      // Resolve links for ontology-backed curated terms; leave unbacked concept
      // terms (no iri/ontology) as-is.
      if (resource.ontologyTerms?.length) {
        resource.ontologyTerms = resource.ontologyTerms.map((t) =>
          t.iri && t.ontology
            ? { ...t, url: resolveTermUrl(t.ontology, t.iri, termLinkConfig) }
            : t,
        );
      }
      resource._sourcePath = path.relative(process.cwd(), file);
      return resource;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getResourceById(id: string): Resource | undefined {
  const resources = getAllResources();
  return resources.find((r) => r.id === id);
}

export function getResourceTypes(resources: Resource[]): string[] {
  return [...new Set(resources.map((r) => r.type))].sort();
}

export { getAllProjects } from "./resource-utils";

export function getProjects(resources: Resource[]): string[] {
  const { getAllProjects } = require("./resource-utils");
  return [...new Set(resources.flatMap((r: Resource) => getAllProjects(r)))].sort();
}

export function getAllKeywords(resources: Resource[]): string[] {
  return [...new Set(resources.flatMap((r) => r.keywords))].sort();
}
