// Turns the solicitation texts in content/ into src/data/documents.json, which the app reads.
// Each text has a few "name: value" lines, then sections that start with "## ". Every other line is a paragraph.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../content/", import.meta.url);
const documents = {};
for (const file of readdirSync(dir).filter((name) => name.endsWith(".txt")).sort()) {
  const key = file.replace(/\.txt$/, "");
  const doc = { key, title: "", agency: "", number: "", type: "", issued: "", sections: [] };
  for (const raw of readFileSync(new URL(file, dir), "utf8").split("\n")) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (!line) continue;
    if (line.startsWith("## ")) doc.sections.push({ heading: line.slice(3), lines: [] });
    else if (doc.sections.length) doc.sections.at(-1).lines.push(line);
    else {
      const [name, ...rest] = line.split(": ");
      if (!(name in doc)) throw new Error(`${file}: unexpected line "${line}"`);
      doc[name] = rest.join(": ");
    }
  }
  for (const name of ["title", "agency", "number", "type", "issued"]) if (!doc[name]) throw new Error(`${file}: no ${name}`);
  documents[key] = doc;
}
writeFileSync(new URL("../src/data/documents.json", import.meta.url), JSON.stringify(documents, null, 2) + "\n");
console.log(`${Object.keys(documents).length} documents written`);
