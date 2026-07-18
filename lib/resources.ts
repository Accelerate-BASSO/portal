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
  // Injected at build time from caches, keyed by id (see getAllResources).
  bioportal?: BioportalMetrics;
  githubRelease?: GithubRelease;
  paperContent?: PaperContent;
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

export function getAllResources(): Resource[] {
  const files = findYamlFiles(resourcesDir);
  const bioportalCache = loadBioportalCache();
  const githubReleasesCache = loadGithubReleasesCache();
  const paperContentCache = loadPaperContentCache();
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
