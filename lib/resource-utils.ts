import type { Resource, ProjectName } from "./resources";

export function getAllProjects(resource: Resource): ProjectName[] {
  return [...new Set([...(resource.developedBy || []), ...(resource.usedBy || [])])];
}
