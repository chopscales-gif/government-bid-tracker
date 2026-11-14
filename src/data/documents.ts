import raw from "./documents.json";

/** A solicitation or addendum as issued: a few header lines, then headed sections of plain paragraphs. */
export type SolicitationDoc = {
  key: string;
  title: string;
  agency: string;
  number: string;
  type: string;
  issued: string;
  sections: { heading: string; lines: string[] }[];
};

/** Built from the texts in content/ by `npm run documents`. */
export const DOCUMENTS: Record<string, SolicitationDoc> = raw;
