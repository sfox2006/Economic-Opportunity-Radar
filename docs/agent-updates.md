# Updating the YEN website

The repository is the data source. Updates are reviewed as JSON plus generated
assets. Sam authorised real opportunity research and international expansion on
6 October 2026. Only the removal of simulated public listings has been published;
feature and research updates still require review within the requested scope.

## Public data and organisation coverage

`data/settings.json` selects `mode: "live"`. `data/live-opportunities.json` is the
only live input. Empty input produces an honest empty catalogue. Live validation
requires `simulated: false` and rejects every synthetic fixture.
`data/demo-opportunities.json` is private test material, outside the published
`dist/` folder. Never use its programme names, locations, dates, pay or eligibility
as evidence or as research leads.

`data/organisations.json` contains real organisations from the supplied YEN list.
Their inclusion describes research coverage, not vacancy availability. Imported
URLs and notes are unverified leads. Preserve null URLs until checked, stable
IDs, sector order, named units, and `alsoListedIn`. Add further international
organisations and think tanks with official source references. Optional
`referenceVerification` records `checkedAt`, `sourceUrl` and notes for a checked
reference URL; it does not certify any programme's availability.

Read `docs/known-traps.md` before verification. Those historical notes are leads,
not authority for current programmes, names, eligibility or deadlines.

## Live record contract

Every record needs a stable programme-and-intake `id`, `organisationId`, matching
registry `organisation` and `sector`, exact `program`, supported `type`, `country`,
`region`, `location`, `duration`, `paid`, `deadline`, `citizenship`, `studyYear`,
`eligibility`, `description`, `eligibilityDetails`, `application`, `url` and
`simulated: false`. Supplied URLs must be official HTTPS programme references.
Use null when no route has been established; a current record without a verified
application URL is held. Closed and unknown audit records need no invented URL. Use `mapped: false` when coordinates are not
verified or the placement location is variable; otherwise supply actual lat/lon.
Use honest `Not stated` values for unknown pay, citizenship and eligibility.

All displayed live records require a `verification` object with:

- `state: "verified"`, an ISO `checkedAt` timestamp with a timezone, a specific
  official HTTPS `sourceUrl`, and factual `notes` supporting programme existence,
  status, dates, audience, eligibility and pay claims.
- Optional `sources: [{"url": "https://...", "claim": "What this source supports"}]`
  for additional official evidence. Sources and notes appear in cards and exports.
- For overseas, global or remote international placements,
  `australianAudienceEligible: true` and nonempty `audienceEvidence` stating the
  source-grounded basis for Australian eligibility. A global careers page or an
  Australian office address alone is insufficient. Country can be overseas;
  region can be the placement country, International, or Online.

Never invent citizenship, pay, dates, academic requirements, work rights, visa
support or accepting status. Keep distinct streams and intakes separate. Do not
put private correspondence, credentials or personal applicant data into public
record notes. Checks validate the contract, not the truth of a source claim;
independent review remains necessary.

## Three availability streams

1. **Open now:** `open`, `rolling` or `on-demand`, with
   `verification.acceptingApplications: true`. A working current application
   route and current official intake evidence are required. For exact closing
   dates, use `deadlineOn: "YYYY-MM-DD"` and `deadlineConfirmed: true`. Also record
   `closesAt` with an ISO timezone offset when an exact time is specified. Without
   a published deadline, use honest text and `noDeadlinePublished: true`.
2. **Confirmed future:** `confirmed-future`, with either `opensOn` and
   `openingDateConfirmed: true`, or `opensFrom`/`opensBy`, a readable
   `openingWindow`, and `openingWindowConfirmed: true`. These fields describe an
   official current announcement, not a typical annual cycle. Future records do
   not need an invented closing date. All horizons are displayed and retained,
   including openings more than three calendar months away.
3. **Unconfirmed / recurring:** `recurring-unconfirmed`, with
   `recurringProgramConfirmed: true` for verified official programme existence.
   The next intake remains unconfirmed. Optional `expectedOpensFrom` /
   `expectedOpensBy`, `expectedWindow` and `openingEvidence` are labelled
   indicative. Never use confirmed opening fields for these records. An old
   intake or an annual pattern cannot establish a current or confirmed future
   vacancy.

Legacy `upcoming` records with confirmed exact dates/ranges use the future
stream; legacy expected ranges use the unconfirmed stream. `closed` and
`unknown` candidates remain outside published availability streams.

## Freshness and retention

The default review age is fourteen days (configurable one to thirty). Checked
records with future timestamps, insufficient evidence, unconfirmed audience,
passed deadlines or expired reviews cannot enter the open catalogue. A future
opening at or before today needs rechecking and is never promoted automatically.
Confirmed ranges need rechecking when their earliest opening day arrives.

Every explicit future/recurring record survives in `futureCompilation`, even
when its evidence expires, an expected window ends or its opening arrives.
Held records show the precise `holdReason` and an unconfirmed availability label.
The original input stays intact. Retention does not grant verification.
`openingSoon` remains a derived subset of confirmed openings within three months,
for integrations that need it; it is not a cutoff for retention or the UI.

`radarCatalog.records` supplies validated input for browser rechecks. The browser
uses the shared policy on load and every minute, updating tabs and counts as
checks expire. It never falls back to demonstration data.

## Exports and review

The current-list download includes only selected open records. The separate
future download includes every retained future record, status, held reason,
confirmed or indicative date fields, eligibility, official URLs and check notes.
Run `node scripts/export-compilation.cjs <output-directory>` to generate the
same current CSV, all-future CSV and a structured all-future JSON for review.
Synthetic fixtures cannot be compiled as research.

After editing data:

1. Run `node scripts/build.cjs` and inspect the open, confirmed-future,
   recurring-unconfirmed, retained and held counts.
2. Run `node --test *.test.cjs`, syntax checks for changed JavaScript, and desktop
   and mobile UI checks. Check source links, status labels and both exports.
3. Commit data and generated assets together on the review branch, with source
   evidence and an added/updated/held summary. Publish only within Sam's explicit
   authorisation. The initial sample-removal authorisation does not publish
   research or broader features.

No emails, subscriptions, registrations or research services run in this site.
Daily scheduled builds only enforce expiry; they do not verify new records.
