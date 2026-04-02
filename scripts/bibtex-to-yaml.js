#!/usr/bin/env node

/**
 * Converts a BibTeX entry to a portal resource YAML file.
 *
 * Usage:
 *   node scripts/bibtex-to-yaml.js input.bib [--projects APRICOT,PHASES] [--pubmed URL] [--output path]
 *   cat input.bib | node scripts/bibtex-to-yaml.js --projects APRICOT
 *
 * Options:
 *   --projects   Comma-separated project names (e.g. APRICOT,BSO-AD)
 *   --pubmed     PubMed URL
 *   --link       Additional link (format: "Label - URL")
 *   --output     Output file path (default: prints to stdout)
 *   --description  Override the generated description
 */

const fs = require("fs");
const path = require("path");

// --- BibTeX parser (handles common cases) ---

function parseBibtex(input) {
  const entry = {};

  // Extract entry type and key
  const typeMatch = input.match(/@(\w+)\s*\{([^,]*),/);
  if (typeMatch) {
    entry._type = typeMatch[1].toLowerCase();
    entry._key = typeMatch[2].trim();
  }

  // Extract fields — handles braced {values} and quoted "values"
  // Also handles multi-line values
  const fieldRegex = /(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))/g;
  let match;
  while ((match = fieldRegex.exec(input)) !== null) {
    const key = match[1].toLowerCase();
    const value = (match[2] || match[3] || match[4] || "").trim();
    // Clean up LaTeX artifacts
    entry[key] = value
      .replace(/\\\&/g, "&")
      .replace(/\\textendash/g, "–")
      .replace(/\\textemdash/g, "—")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return entry;
}

// --- Extract structured data ---

function extractData(entry) {
  const title = entry.title || "Untitled";

  // Build ID from key or title
  const id =
    "pub-" +
    (entry._key || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

  // Date
  let publishedDate = null;
  if (entry.year) {
    const month = parseMonth(entry.month);
    publishedDate = month ? `${entry.year}-${month}` : `${entry.year}-01`;
  }

  // DOI
  let doi = null;
  if (entry.doi) {
    doi = entry.doi.startsWith("http")
      ? entry.doi
      : `https://doi.org/${entry.doi}`;
  }

  // Description
  let description = null;
  if (entry.abstract) {
    // Use first sentence or first 200 chars of abstract
    const firstSentence = entry.abstract.match(/^[^.!?]+[.!?]/);
    description = firstSentence
      ? firstSentence[0].trim()
      : entry.abstract.slice(0, 200).trim() + "...";
  }

  // Journal / venue
  const venue =
    entry.journal ||
    entry.booktitle ||
    entry.publisher ||
    entry.howpublished ||
    null;

  // Authors
  const authors = entry.author || null;

  return { id, title, publishedDate, doi, description, venue, authors };
}

function parseMonth(monthStr) {
  if (!monthStr) return null;
  const m = monthStr.toLowerCase().trim();

  // Numeric
  if (/^\d+$/.test(m)) return m.padStart(2, "0");

  // Month names/abbreviations
  const months = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };
  return months[m] || null;
}

// --- Generate YAML ---

function generateYaml(data, options) {
  const description =
    options.description ||
    data.description ||
    (data.venue
      ? `${data.title.slice(0, 100)}. Published in ${data.venue}.`
      : data.title);

  const projects = options.projects || [];

  const lines = [];
  lines.push(`id: ${data.id}`);
  lines.push(`name: ${yamlString(data.title)}`);
  lines.push(`type: Publication`);
  if (data.publishedDate) {
    lines.push(`publishedDate: "${data.publishedDate}"`);
  }
  lines.push(`description: ${yamlString(description)}`);

  // Projects
  if (projects.length > 0) {
    lines.push(`developedByProjects:`);
    projects.forEach((p) => lines.push(`  - ${p}`));
  } else {
    lines.push(`developedByProjects: []`);
  }
  lines.push(`usedByProjects: []`);

  // Links
  const links = [];
  if (data.doi) {
    links.push({ label: "DOI", url: data.doi, platform: "Website" });
  }
  if (options.pubmed) {
    links.push({ label: "PubMed", url: options.pubmed, platform: "Website" });
  }
  if (options.extraLinks) {
    options.extraLinks.forEach((l) => {
      const [label, url] = l.split(" - ").map((s) => s.trim());
      if (label && url) {
        links.push({ label, url, platform: "Website" });
      }
    });
  }

  if (links.length > 0) {
    lines.push(`links:`);
    links.forEach((link) => {
      lines.push(`  - label: ${link.label}`);
      lines.push(`    url: ${link.url}`);
      lines.push(`    platform: ${link.platform}`);
    });
  } else {
    lines.push(`links: []`);
  }

  // Tags
  const tags = ["paper"];
  if (data.venue) {
    tags.push(
      data.venue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30)
    );
  }
  lines.push(`tags:`);
  tags.forEach((t) => lines.push(`  - ${t}`));

  lines.push(`status: Active`);

  const today = new Date().toISOString().slice(0, 10);
  lines.push(`lastUpdated: "${today}"`);

  return lines.join("\n") + "\n";
}

function yamlString(s) {
  if (/[:\#\[\]{}&*!|>'"%@`]/.test(s) || s.includes("\n")) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

// --- CLI ---

function main() {
  const args = process.argv.slice(2);
  let inputFile = null;
  const options = { projects: [], extraLinks: [] };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--projects":
        options.projects = args[++i].split(",").map((s) => s.trim());
        break;
      case "--pubmed":
        options.pubmed = args[++i];
        break;
      case "--link":
        options.extraLinks.push(args[++i]);
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--description":
        options.description = args[++i];
        break;
      default:
        if (!args[i].startsWith("-")) inputFile = args[i];
    }
  }

  // Read input
  let input;
  if (inputFile) {
    input = fs.readFileSync(inputFile, "utf-8");
  } else if (!process.stdin.isTTY) {
    input = fs.readFileSync(0, "utf-8");
  } else {
    console.error(
      "Usage: node scripts/bibtex-to-yaml.js input.bib [--projects APRICOT,PHASES] [--pubmed URL]"
    );
    console.error("       cat input.bib | node scripts/bibtex-to-yaml.js --projects APRICOT");
    process.exit(1);
  }

  const entry = parseBibtex(input);
  if (!entry.title) {
    console.error("Error: Could not parse a title from the BibTeX input.");
    process.exit(1);
  }

  const data = extractData(entry);
  const yaml = generateYaml(data, options);

  if (options.output) {
    fs.writeFileSync(options.output, yaml);
    console.error(`Written to ${options.output}`);
  } else {
    process.stdout.write(yaml);
    // Suggest filename
    const suggestedFile = `data/resources/${data.id}.yaml`;
    console.error(`\nSuggested file: ${suggestedFile}`);
  }
}

main();
