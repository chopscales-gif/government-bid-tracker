import type { Status } from "@/db/schema";

/**
 * What arrives with a solicitation that is not read by the AI: which day the
 * morning check found it, where the work is, and which addenda followed. In a
 * real build this comes from the agency feeds and a distance lookup.
 */
export type FeedItem = {
  /** Names the document in src/data/documents.json and its reading in src/data/readings. */
  key: string;
  /** The demo day it was found. Zero or less means before the demo starts. */
  day: number;
  place: string;
  /** Driving miles from the company's yard. */
  miles: number;
  /** Addenda in the order they were issued, each with the day it was found. */
  addenda: { key: string; day: number }[];
  /** Where it sits in the pipeline when the demo starts. */
  start: Status;
  /** How many of the checklist items are already ticked when the demo starts. */
  ticked?: number;
};

export const FEED: FeedItem[] = [
  { key: "unit-heaters", day: -20, place: "Fallon Heights", miles: 14, addenda: [], start: "submitted", ticked: 99 },
  { key: "boiler", day: -9, place: "Cedar Bench", miles: 18, addenda: [{ key: "boiler-addendum-1", day: 1 }], start: "bidding", ticked: 3 },
  { key: "hvac-maint", day: -7, place: "Marlow Springs", miles: 9, addenda: [], start: "bidding", ticked: 1 },
  { key: "chiller", day: -4, place: "Hollis", miles: 41, addenda: [{ key: "chiller-addendum-1", day: 2 }], start: "watching" },
  { key: "central-plant", day: -5, place: "Tanner Flat", miles: 48, addenda: [], start: "new" },
  { key: "red-mesa", day: -3, place: "Tolliver Mesa", miles: 215, addenda: [], start: "new" },
  { key: "clinic-controls", day: -2, place: "Ridgeview", miles: 22, addenda: [], start: "new" },
  { key: "roof", day: -2, place: "Hollis", miles: 41, addenda: [], start: "new" },
  { key: "rtu", day: 0, place: "Alder Fork", miles: 27, addenda: [], start: "new" },
  { key: "water-heaters", day: 0, place: "Quarry Bend", miles: 33, addenda: [], start: "new" },
  { key: "heat-exchanger", day: 0, place: "Marlow Springs", miles: 9, addenda: [], start: "new" },
  { key: "kitchen-hoods", day: 1, place: "Cedar Bench", miles: 18, addenda: [], start: "new" },
  { key: "ranger-boilers", day: 1, place: "Aspen Hollow", miles: 64, addenda: [], start: "new" },
  { key: "restrooms", day: 2, place: "Quarry Bend", miles: 33, addenda: [], start: "new" },
];

export const FEED_BY_KEY: Record<string, FeedItem> = Object.fromEntries(FEED.map((item) => [item.key, item]));
