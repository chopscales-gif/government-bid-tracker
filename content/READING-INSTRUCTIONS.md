# How the recorded readings were made

Each file in this folder is an invented solicitation (or an addendum to one). An AI model was given the
instructions below and the text of each file, and what it wrote was saved to `src/data/readings/<name>.json`.
The app replays those files. They are not edited by hand: if a text changes, it is read again.

## Instructions given to the model

You are reading a government solicitation for a small mechanical contractor who is deciding whether to bid
and, if so, what they must do. Read only the text you are given. Do not use outside knowledge about the
agency or the job. If the text does not say something, record null; never guess.

Write one JSON file per text. Every `section` must be a heading from the text, copied exactly as it appears
after the `## ` (for example `2. Schedule`). Every `quote` must be copied character for character from one
single line of that section, as one unbroken run of words, at most about 25 words, and it should be the
words that support the item.

### For a solicitation

```json
{
  "summary": "Two or three plain sentences: what the job is, for whom, how big, and when bids are due.",
  "facts": {
    "naics": { "value": "238220", "section": "...", "quote": "..." },
    "set_aside": { "value": "none", "section": "...", "quote": "..." },
    "estimated_value": { "value": { "low": 380000, "high": 450000 }, "section": "...", "quote": "..." },
    "due": { "value": "2027-03-18T14:00", "section": "...", "quote": "..." },
    "questions_due": { "value": "2027-03-10T17:00", "section": "...", "quote": "..." },
    "prebid": { "value": { "when": "2027-03-04T10:00", "mandatory": false }, "section": "...", "quote": "..." },
    "bid_bond": { "value": { "required": false, "detail": "Not required" }, "section": "...", "quote": "..." },
    "performance_bond": { "value": { "required": true, "detail": "100% performance and payment bonds within 10 days of award" }, "section": "...", "quote": "..." },
    "licences": { "value": { "codes": ["S350"], "need": "all" }, "section": "...", "quote": "..." },
    "submission": { "value": "Sealed envelope, delivered to the District Purchasing Office", "section": "...", "quote": "..." }
  },
  "checklist": [{ "text": "...", "section": "...", "quote": "..." }],
  "after_award": [{ "text": "...", "section": "...", "quote": "..." }],
  "notes": [{ "text": "...", "section": "..." }]
}
```

- A fact the text does not state is `null` in place of its object.
- `set_aside` value is one of: `none`, `small_business`, `sdvosb` (service-disabled veteran-owned),
  `wosb` (women-owned), `hubzone`, `8a`, `other`. Use `none` only when the text says it is open to all or
  that no set-aside applies; if the text is silent, the fact is null.
- `estimated_value`: dollars as numbers. A single figure has the same low and high. An annual budget for a
  multi-year contract is recorded as the annual figure, and say so in `notes`.
- Dates and times are local, written `YYYY-MM-DDTHH:MM`. If only a date is given, write `YYYY-MM-DD`.
- `prebid` covers a pre-bid meeting, conference, walk-through or organized site visit. Null if there is none.
- `licences.codes` are the state licence codes named (for example `S350`). `need` is `all` if every one is
  required, `any` if any one of them is enough.
- `checklist` is everything the bidder must do or include, up to and including handing in the bid, for the
  bid to be accepted. One action per item, written as an instruction in plain words, in the order a bidder
  would do them. Include required meetings and deadlines that come before the bid. Do not include things
  that are optional.
- `after_award` is what the winner must provide or do after being chosen.
- `notes` is for anything a careful reader should look at twice: statements in the text that contradict each
  other, conditions that are unusual or easy to miss, and anything you were unsure how to record. Say
  plainly what you saw. Leave it empty if there is nothing.
  The contractor reads these, not a programmer: do not mention field names or this format. Where you had
  to choose how to read something, say what the text says and which way you read it. At most five notes,
  the most important first.

### For an addendum

You are given the original solicitation as well. Read the addendum against it.

```json
{
  "summary": "One or two plain sentences on what this addendum changes for a bidder.",
  "changes": [{ "what": "Bid due date", "before": "Thursday, March 18, 2027, 2:00 p.m.", "after": "Monday, March 15, 2027, 2:00 p.m.", "section": "...", "quote": "..." }],
  "facts": { },
  "checklist_added": [{ "text": "...", "section": "...", "quote": "..." }],
  "settles": [{ "text": "...", "section": "..." }],
  "notes": [{ "text": "...", "section": "..." }]
}
```

- `changes` lists each thing that is now different, with what the original said (`before`, or "Not required",
  "Not mentioned" and so on) and what holds now (`after`). `section` and `quote` come from the addendum.
- `facts` holds only the facts whose value changed, in the same shape as above, with `section` and `quote`
  from the addendum.
- `checklist_added` is each new thing a bidder must now do or include.
- `settles` lists anything unclear or contradictory in the original that this addendum resolves.
- `notes` as above.
