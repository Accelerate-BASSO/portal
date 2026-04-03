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

export interface Resource {
  id: string;
  name: string;
  type: "Ontology" | "Publication" | "Tool" | "Community" | "Repository" | "Dataset" | "Website" | "Registry";
  description: string;
  producedByProjects: ProjectName[];
  usedByProjects: ProjectName[];
  links: ResourceLink[];
  bssoFoundry?: boolean;
  publishedYear?: number;
  publishedMonth?: number;
  publishedDay?: number;
  doi?: string;
  pmid?: string;
  venue?: string;
  keywords?: string[];
  contributors?: Contributor[];
  tags: string[];
  status: "Active" | "In Development" | "Archived";
  lastUpdated: string;
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

export function getAllResources(): Resource[] {
  const files = findYamlFiles(resourcesDir);
  return files
    .map((file) => {
      const content = fs.readFileSync(file, "utf-8");
      return yaml.load(content) as Resource;
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

export function getAllTags(resources: Resource[]): string[] {
  return [...new Set(resources.flatMap((r) => r.tags))].sort();
}
