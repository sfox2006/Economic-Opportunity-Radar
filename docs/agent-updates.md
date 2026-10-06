# Updating the YEN website

The repository is the data source. Agents can propose JSON updates through GitHub
pull requests; no custom server, database or agent service is required. This
project does not yet research any real opportunity or run research agents.

## Demonstration and live data are separate

`data/settings.json` currently selects `mode: "demo"`.
`data/demo-opportunities.json` has 196 simulated listings and ten sample upcoming
programs. Dates, locations, types, pay and eligibility are fictional. They must
not be used to infer an employer's actual programs. Demo cards have no apply link;
their download labels every row as simulated.

`data/live-opportunities.json` starts empty. When the user requests real listings,
agents fill this file, retaining closed/unknown candidates for an audit if useful.
After verification and review, changing the explicit setting to `live` publishes
only eligible records. Live mode rejects any simulated record; there is no
fallback to demo data when the live catalog is empty.

## Organisation coverage

`data/organisations.json` imports 196 unique employer/directory entries from the
user-supplied YEN organisation list. Repeated Productivity Commission, Future Fund
and Melbourne Institute references are consolidated, with secondary sectors in
`alsoListedIn`. Named units such as ANU Crawford School are retained separately.
The combined ACCC/AER reference remains a combined directory entry as supplied.

The source supplies no URL for twelve entries; these remain null and display
"Careers URL not supplied". Names and URLs are source snapshots, not current
employer verification. Some legacy names or organisational groupings may need
checking later. No missing URL has been guessed.

`docs/known-traps.md` is copied from the attached skill as historical research
guidance. Verify those statements against official pages too; they are not
authority for current deadlines, eligibility or program availability.

## Live record contract

Use the same descriptive fields as demo records: stable `id`, `organisationId`,
matching organisation name and sector, specific `program`, supported `type`,
Australian `country`, state/territory or Online `region`, actual `location`,
coordinates (or `mapped: false`), `duration`, `paid`, `citizenship`, `studyYear`,
international `eligibility` (`Yes`, `No`, `Some restrictions`), description,
eligibility details, application instructions and a direct official HTTPS `url`.

Set `simulated: false` and a status of `open`, `rolling`, `on-demand`, `upcoming`,
`closed` or `unknown`. Production selection excludes closed/unknown records.

Every published live record needs `verification` with:

```json
{
  "state": "verified",
  "checkedAt": "2026-10-06T10:00:00Z",
  "sourceUrl": "https://official-employer.example/specific-role",
  "notes": "Evidence for open status, exact program, eligibility and pay.",
  "acceptingApplications": true,
  "deadlineConfirmed": true
}
```

This example illustrates the contract; it is not a verified listing. `checkedAt`
must include a time zone and must not be in the future. Review labels are derived
from it. The default review horizon is fourteen days, configurable from one to
thirty days.

For an exact deadline, use `deadlineOn: "YYYY-MM-DD"` and the confirmed readable
`deadline`. Where a time is specified, also use `closesAt` as an ISO timestamp
with offset. A date without a time remains visible through that calendar day in
Australia/Sydney; it is not a promise about a midnight cutoff.

When the official page confirms accepting applications but gives no deadline,
omit `deadlineOn`, use honest text such as "Rolling" or "Apply early", and set
`verification.noDeadlinePublished: true`. Never invent a date. Publication checks
enforce the data contract; they cannot prove that an agent's evidence accurately
represents the careers page. Independent review is still needed before initial
live publication.

## Watchlist

An upcoming entry never enters the current catalog or CSV. Give either:

- An official exact `opensOn` date and `verification.openingDateConfirmed: true`.
- A supported estimated range `expectedOpensFrom` / `expectedOpensBy`, a readable
  `expectedWindow`, an `openingEvidence` note and
  `verification.expectedWindowSupported: true`.

Only windows overlapping the next three calendar months are displayed. An exact
opening date at or before today is held for recheck, rather than promoted. After
the expected range ends, that entry is also held. Recheck the current official
application route before changing it to open. No forecast may be derived solely
from an old newsletter or a typical annual cycle.

## Update process

1. Read the registry and known traps. Retrieve the specific official listing;
   check the correct employer, stream, intake and Australian placement.
2. Update or add a live record using its stable program-and-intake ID. Record
   evidence and the current timestamp. Keep RBA roles and Treasury streams
   separate; do not overwrite an internship with a graduate job.
3. Run `node scripts/build.cjs`. It validates identities, supported types, data
   mode, dates, work-rights fields and publication evidence. It reports how many
   records were held back; `radarCatalog.excluded` records their IDs and reasons.
4. Run `node --test *.test.cjs` and syntax checks on changed JavaScript. Review
   the website, counts, links, dates and current-only CSV.
5. Commit JSON input and generated assets together, then propose a pull request.
   Include an added/updated/removed summary and evidence links.

There is no Gmail integration, subscriber store or email delivery in this site.
The newsletter link remains disabled in the demonstration.

## Rebuilds and expiry

GitHub Actions tests pull requests. Once Pages is enabled and the PR is merged,
main updates, manual workflow runs and daily rebuilds publish `dist/`. The daily
job only re-evaluates already supplied data for expiry; it does not search,
refresh verification timestamps or fabricate new vacancies. Its schedule cannot
make the site accurate without agents providing new verified data.

The browser applies the same expiry policy on load and every minute in an open
live tab. Records disappear when their explicit cutoff passes or their evidence
expires even if the scheduled build is delayed. Students are shown an honest
empty state when no verified records remain.
