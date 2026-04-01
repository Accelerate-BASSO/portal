import Link from "next/link";
import { getAllResources, getResourceTypes, getProjects } from "@/lib/resources";

export default function Home() {
  const resources = getAllResources();
  const types = getResourceTypes(resources);
  const projects = getProjects(resources);

  const ontologyCount = resources.filter((r) => r.type === "Ontology").length;
  const foundryCount = resources.filter((r) => r.bssoFoundry).length;
  const projectCount = new Set(resources.flatMap((r) => r.projects)).size;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center">
          <h1 className="text-5xl font-semibold uppercase leading-tight md:text-6xl">
            <span className="bg-accent p-1 px-6">Accelerate BASSO</span>
          </h1>
          <p className="mt-4 text-3xl font-light">Resource Portal</p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-text">
            A curated discovery layer for resources produced by the Accelerate
            BASSO Network — ontologies, tools, publications, and communities for
            the behavioral and social sciences.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/resources"
              className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-white no-underline transition-colors hover:bg-gray-800"
            >
              Browse Resources
            </Link>
            <a
              href="https://accelerate-basso.regenstrief.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center rounded-full border border-black px-8 text-black no-underline transition-colors hover:bg-gray-50"
            >
              Main Website
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-gray-50 px-6 py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          <div title="Total number of resources indexed in the portal">
            <p className="text-4xl font-semibold">{resources.length}</p>
            <p className="mt-1 text-sm text-gray-text">Resources</p>
          </div>
          <div title="Formal representations of knowledge in specific domains">
            <p className="text-4xl font-semibold">{ontologyCount}</p>
            <p className="mt-1 text-sm text-gray-text">Ontologies</p>
          </div>
          <div title="Ontologies that are members of the Behavioural and Social Sciences Ontology Foundry">
            <p className="text-4xl font-semibold">{foundryCount}</p>
            <p className="mt-1 text-sm text-gray-text">BSSO Foundry</p>
          </div>
          <div title="Distinct network project affiliations represented">
            <p className="text-4xl font-semibold">{projectCount}</p>
            <p className="mt-1 text-sm text-gray-text">Projects</p>
          </div>
        </div>
      </section>

      {/* Audience Pathways */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-4xl font-semibold">
          Find What You Need
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {/* Beginners */}
          <div className="flex flex-col rounded-lg border border-card-border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">New to BSSR Ontologies?</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-text">
              Explore the network&apos;s resources by topic and project.
              Discover ontologies, tools, and communities with guided
              descriptions and context.
            </p>
            <Link
              href="/resources"
              className="mt-4 text-sm font-medium text-black underline"
            >
              Explore resources &rarr;
            </Link>
          </div>

          {/* Advanced */}
          <div className="flex flex-col rounded-lg border border-card-border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Know What You Need?</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-text">
              Search and filter across all network resources. Find direct
              links to GitHub repos, BioPortal entries, Zenodo archives,
              and more.
            </p>
            <Link
              href="/resources"
              className="mt-4 text-sm font-medium text-black underline"
            >
              Search resources &rarr;
            </Link>
          </div>

          {/* Funders */}
          <div className="flex flex-col rounded-lg border border-card-border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Network Overview</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-text">
              See the breadth of the network&apos;s outputs at a glance —
              {" "}{resources.length} resources across {types.length} types and{" "}
              {projects.length} projects, with {foundryCount} BSSO Foundry
              ontologies.
            </p>
            <Link
              href="/resources"
              className="mt-4 text-sm font-medium text-black underline"
            >
              View all resources &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Resource Types Overview */}
      <section className="border-t border-gray-200 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-4xl font-semibold">
            Resource Types
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => {
              const count = resources.filter((r) => r.type === type).length;
              return (
                <Link
                  key={type}
                  href={`/resources?type=${type}`}
                  title={`Browse all ${count} ${type.toLowerCase()} resource${count !== 1 ? "s" : ""}`}
                  className="flex items-center justify-between rounded-lg border border-card-border bg-white p-5 no-underline shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="text-lg font-medium text-black">{type}</span>
                  <span
                    title={`${count} ${type.toLowerCase()} resource${count !== 1 ? "s" : ""} in the portal`}
                    className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-green-800"
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-semibold">About This Portal</h2>
        <p className="mt-6 text-lg leading-relaxed text-gray-text">
          The Accelerate BASSO Portal is a curated index of resources produced
          by the{" "}
          <a
            href="https://accelerate-basso.regenstrief.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-black underline"
          >
            Accelerate BASSO Network
          </a>
          . It does not host or duplicate content — instead, it provides
          metadata, descriptions, and direct links to where resources live
          across GitHub, BioPortal, Zenodo, OSF, and other platforms.
        </p>
        <p className="mt-4 text-sm text-gray-text">
          Supported by the National Institute of Aging (NIA) U24AG088019
        </p>
      </section>
    </div>
  );
}
