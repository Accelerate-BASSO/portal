import { Suspense } from "react";
import { getAllResources, getResourceTypes, getProjects } from "@/lib/resources";
import ResourceBrowser from "@/components/ResourceBrowser";

export const metadata = {
  title: "Resources — Accelerate BASSO Portal",
  description: "Browse and search all resources produced by the Accelerate BASSO Network.",
};

export default function ResourcesPage() {
  const resources = getAllResources();
  const types = getResourceTypes(resources);
  const projects = getProjects(resources);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold">Resources</h1>
        <p className="mt-3 max-w-2xl text-lg text-gray-text">
          Browse, search, and filter resources produced by the Accelerate BASSO
          Network. Each resource links directly to its home on GitHub, BioPortal,
          Zenodo, or other platforms.
        </p>
      </div>

      <Suspense fallback={null}>
        <ResourceBrowser
          resources={resources}
          types={types}
          projects={projects}
        />
      </Suspense>
    </div>
  );
}
