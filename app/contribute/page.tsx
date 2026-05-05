import Link from "next/link";

const REPO_URL = "https://github.com/Accelerate-BASSO/portal";
const NEW_ISSUE_URL = `${REPO_URL}/issues/new/choose`;

const TEMPLATES: { label: string; href: string; blurb: string }[] = [
  {
    label: "Ontology",
    href: `${REPO_URL}/issues/new?template=add-ontology.yml`,
    blurb: "Ontologies should be published on BioPortal so the portal can track new releases automatically.",
  },
  {
    label: "Publication",
    href: `${REPO_URL}/issues/new?template=add-publication.yml`,
    blurb: "Papers, preprints, or workshop contributions produced by the network.",
  },
  {
    label: "Tool or registry",
    href: `${REPO_URL}/issues/new?template=add-tool-or-registry.yml`,
    blurb: "Software, services, or curated registries produced by the network.",
  },
  {
    label: "Repository",
    href: `${REPO_URL}/issues/new?template=add-repository.yml`,
    blurb: "Code repositories that host ontology sources, scripts, or related material.",
  },
  {
    label: "Website",
    href: `${REPO_URL}/issues/new?template=add-website.yml`,
    blurb: "Project sites, documentation hubs, or other public-facing pages.",
  },
  {
    label: "Community",
    href: `${REPO_URL}/issues/new?template=add-community.yml`,
    blurb: "Working groups, forums, or collaborative communities of practice.",
  },
];

export const metadata = {
  title: "Contribute — Accelerate BASSO Portal",
  description:
    "How to submit a new resource — ontology, publication, tool, repository, website, or community — to the Accelerate BASSO Portal.",
};

export default function ContributePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-semibold">Contribute a Resource</h1>
      <p className="mt-3 text-lg text-gray-text">
        The portal is a curated index of work produced by the Accelerate BASSO
        Network. We welcome submissions of new resources and corrections to
        existing entries from network members and the wider community.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">How submissions work</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base leading-relaxed text-gray-text">
          <li>
            Open a GitHub issue using the template that matches the kind of
            resource you want to add (see the list below). The templates ask
            for the metadata the portal needs — name, description, links,
            associated projects, and so on.
          </li>
          <li>
            A maintainer reviews the submission. Most resources can be added
            from the issue alone; we may follow up in the issue thread if
            anything needs clarification.
          </li>
          <li>
            Once approved, automation converts the issue into a YAML record
            under <code className="rounded bg-gray-100 px-1 py-0.5">data/resources/</code>{" "}
            and opens a pull request. The resource appears on the portal once
            the PR is merged and the next deploy completes.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Submission templates</h2>
        <p className="mt-2 text-base text-gray-text">
          Pick the template that best fits the resource. If you&apos;re not
          sure, start with whichever is closest — a maintainer can re-route
          it.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <li
              key={t.label}
              className="rounded-lg border border-card-border bg-white p-4 shadow-sm"
            >
              <a
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-black underline"
              >
                Add {t.label.toLowerCase()} &rarr;
              </a>
              <p className="mt-1 text-sm text-gray-text">{t.blurb}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gray-text">
          You can also browse all templates from the{" "}
          <a
            href={NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-black underline"
          >
            new-issue picker on GitHub
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Updating an existing resource</h2>
        <p className="mt-2 text-base text-gray-text">
          To correct or extend a record that&apos;s already in the portal, use
          the{" "}
          <a
            href={`${REPO_URL}/issues/new?template=update-resource.yml`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-black underline"
          >
            Update a resource
          </a>{" "}
          template. Mention the resource by name and describe the change. If
          you&apos;re comfortable editing YAML directly, a pull request
          against{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">data/resources/</code>{" "}
          is also welcome.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">What we look for</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-base leading-relaxed text-gray-text">
          <li>
            A clear connection to the Accelerate BASSO Network — produced,
            used, or supported by one or more network projects.
          </li>
          <li>
            A stable home (BioPortal, GitHub, Zenodo, OSF, project website,
            etc.) the portal can link to. We index metadata, not content.
          </li>
          <li>
            Enough description for a non-specialist reader to understand what
            the resource is and why it&apos;s relevant.
          </li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-4">
        <a
          href={NEW_ISSUE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-white no-underline transition-colors hover:bg-gray-800"
        >
          Open a submission
        </a>
        <Link
          href="/resources"
          className="flex h-12 items-center justify-center rounded-full border border-black px-8 text-black no-underline transition-colors hover:bg-gray-50"
        >
          Browse resources
        </Link>
      </div>
    </div>
  );
}
