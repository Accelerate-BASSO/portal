import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface ResourceLink {
  label: string;
  url: string;
  platform: "GitHub" | "BioPortal" | "Zenodo" | "OSF" | "Website" | "Discourse" | "OLS" | "Ontobee" | "Other";
}

export type ProjectName = "PHASES" | "BSO-AD" | "APRICOT" | "ODFA" | "DCC";

export interface Resource {
  id: string;
  name: string;
  type: "Ontology" | "Publication" | "Tool" | "Community" | "Repository" | "Dataset" | "Website" | "Registry";
  description: string;
  projects: ProjectName[];
  links: ResourceLink[];
  bssoFoundry?: boolean;
  publishedDate?: string;
  tags: string[];
  status: "Active" | "In Development" | "Archived";
  lastUpdated: string;
}

const resourcesDir = path.join(process.cwd(), "data", "resources");

export function getAllResources(): Resource[] {
  const files = fs.readdirSync(resourcesDir).filter((f) => f.endsWith(".yaml"));
  return files
    .map((file) => {
      const content = fs.readFileSync(path.join(resourcesDir, file), "utf-8");
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

export function getProjects(resources: Resource[]): string[] {
  return [...new Set(resources.flatMap((r) => r.projects))].sort();
}

export function getAllTags(resources: Resource[]): string[] {
  return [...new Set(resources.flatMap((r) => r.tags))].sort();
}
