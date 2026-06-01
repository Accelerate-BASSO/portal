import Link from "next/link";
import { getAllResources, getResourceTypes, getAllProjects } from "@/lib/resources";

export default function Home() {
  const resources = getAllResources();
  const types = getResourceTypes(resources);

  const ontologyCount = resources.filter((r) => r.type === "Ontology").length;
  const foundryCount = resources.filter((r) => r.bssoFoundry).length;
  const projectCount = new Set(resources.flatMap((r) => getAllProjects(r))).size;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center">
          <h1 className="text-5xl font-semibold uppercase leading-tight md:text-6xl">
            <span className="bg-accent p-1 px-6">Accelerate BASSO</span>
          </h1>
          <p className="mt-4 text-3xl font-light">Resource Portal</p>
          <p className="mx-auto mt-6 max-w-2xl text-xl font-light leading-snug text-black">
            Accelerating Behavioral and Social Science through Ontology
            Development and Use
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-text">
            Accelerate BASSO is a research network developing ontologies for the
            behavioral and social sciences. This portal brings together the
            ontologies, tools, publications, and communities produced across the
            network, with links to where each one lives.
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
              About the Network
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-gray-50 px-6 py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          <Link
            href="/resources"
            title="Browse all resources in the portal"
            className="block no-underline text-black hover:opacity-80"
          >
            <p className="text-4xl font-semibold">{resources.length}</p>
            <p className="mt-1 text-sm text-gray-text">Resources</p>
          </Link>
          <Link
            href="/resources?type=Ontology"
            title="Browse all ontology resources"
            className="block no-underline text-black hover:opacity-80"
          >
            <p className="text-4xl font-semibold">{ontologyCount}</p>
            <p className="mt-1 text-sm text-gray-text">Ontologies</p>
          </Link>
          <Link
            href="/resources?foundry=1"
            title="Browse BSSO Foundry ontologies"
            className="block no-underline text-black hover:opacity-80"
          >
            <p className="text-4xl font-semibold">{foundryCount}</p>
            <p className="mt-1 text-sm text-gray-text">BSSO Foundry</p>
          </Link>
          <div title="Distinct network project affiliations represented">
            <p className="text-4xl font-semibold">{projectCount}</p>
            <p className="mt-1 text-sm text-gray-text">Projects</p>
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

      {/* Contribute */}
      <section className="border-t border-gray-200 bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold">Contribute a Resource</h2>
          <p className="mt-4 text-base leading-relaxed text-gray-text">
            Have something the network should know about? Submit a new ontology,
            publication, tool, or community via a short GitHub issue template.
          </p>
          <Link
            href="/contribute"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-black px-7 text-white no-underline transition-colors hover:bg-gray-800"
          >
            How to contribute &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
