# Updating the YEN website

The repository is the data source. Updates are reviewed as JSON plus generated
assets. Sam authorised real opportunity research and international expansion on
6 October 2026. Sam subsequently authorised testing and deployment of the reviewed
data and associated status/retention changes. Later updates follow their own
requested scope; this authorisation does not send emails or update other sites.

## Audience and professional vacancies

The guide serves Australian economists and economics-related professionals under
30: students, graduates and people with several years of experience. Under 30
describes the guide's audience; do not turn it into an employer eligibility
restriction without explicit official evidence. Search general vacancies and
experienced-hire pages as well as student and graduate pathways for every
registry organisation in all ten sectors.

Consider economist, analyst, research, policy, consulting, evaluation, regulatory
and financial work, plus suitable management, specialist and leadership roles.
An EL1, assistant director, senior or manager title is not an exclusion by itself.
Assess the actual qualification and experience requirements, economics relevance
and reasonable audience fit against official evidence. Preserve work rights,
citizenship, clearance, Indigenous-specific and internal-employee restrictions.
Overseas opportunities still need specific Australian audience eligibility
evidence. Keep descriptions politically neutral.

Sam requested a draft PR for this broadened pass, with added/updated/withheld
counts, all-organisation coverage, unresolved access and separate independent
verification before publication. At 21:52 UTC Sam authorised publication once
tests pass, superseding the draft-only hold for this pass. Complete the reviewed
records and all-organisation coverage import, preserve held records outside
public assets and verify the final data before merge/deployment. Do not publish
the foundation alone as completed research. Check current main and verify the
exact CI/Pages deployment and live site. APS shortlists
are leads, not verification. Preserve APS-only restrictions and report blocked
human-verification pages without bypassing them.

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

General professional vacancies use `type: "Professional Job"`; optional
`typeDetails` describes the role category without changing that filter key.
Keep the exact employer role title and level in `program`. The stable legacy
`studyYear` field now supplies the **Qualifications / study** column and filter:
record actual degree, registration or study requirements, including `Not stated`
when unpublished; do not invent a student-year requirement for a professional
role. Optional `experienceDetails` is a nonempty string containing the source's
experience requirements or `Not stated`, with mandatory/preferred distinctions
preserved. It appears in cards, search, prompts and both CSVs. Put all other
restrictions in `eligibilityDetails`, with official evidence in `verification`.
Publication approval remains an explicit review disposition. Record the basis
for economics relevance and audience fit in verification notes, rather than
guessing suitability from title, employer name or a years-of-experience ceiling.

Research handoff must include stable-ID records and a separate coverage outcome
for each registry organisation: official careers/general-vacancy pages checked,
check time, findings, source URLs, independent review and unresolved access or
eligibility questions. A blocked page is not a finding of no vacancies. Keep
private uncertainty drafts and recipients outside public repository assets.

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

1. **Open now:** `open`, `rolling`, `on-demand` or `interest-register`, with
   `verification.acceptingApplications: true`. A working current application
   route and current official intake evidence are required. For exact closing
   dates, use `deadlineOn: "YYYY-MM-DD"` and `deadlineConfirmed: true`. Also record
   `closesAt` with an ISO timezone offset when an exact time is specified. Without
   a published deadline, use honest text and `noDeadlinePublished: true`.
   `interest-register` means an accepting EOI, roster, candidate pool or initial
   project enquiry; label it clearly and never imply a guaranteed vacancy,
   placement or admission. Preserve source-stated hours with unknown time zones
   in deadline text instead of creating an offset timestamp.
2. **Confirmed future:** `confirmed-future`, with either `opensOn` and
   `openingDateConfirmed: true`, or `opensFrom`/`opensBy`, a readable
   `openingWindow`, and `openingWindowConfirmed: true`. These fields describe an
   official current announcement, not a typical annual cycle. A qualitative
   official `openingWindow` with `openingWindowConfirmed: true` is also valid:
   keep wording such as early 2027 verbatim without invented endpoints. Month
   endpoints describe the bounds of a stated month, not an exact opening day.
   Future records do
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

Every derived research record has an explicit `publicationApproved` disposition.
Unapproved candidates remain in the data source and offline compilation; the build
omits them from all public assets and availability streams. An approval does not
override freshness, deadline, application-route or audience checks.

The current-list download includes only selected accepting vacancies and clearly
labelled registers. The separate website future download contains approved public
planning records. The offline future export includes every retained future record,
status, held reason,
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
   authorisation.

No emails, subscriptions, registrations or research services run in this site.
Daily scheduled builds only enforce expiry; they do not verify new records.

## Operator clarification drafts

For future explicitly requested economic or political opportunity reviews/searches,
when material facts are unclear or unpublished (for example international
eligibility), prepare an UNSENT clarification email to the most relevant official
published contact. Explain the correct website with its link and ask specific
unresolved questions. Never guess an email address or send the draft. Check
previous drafts and replies to avoid duplicates, and consolidate related questions
per programme/organisation. Keep recipients, drafts, replies and subscriber data
out of public repository assets. A website interface update does not start a
mailbox review or create clarification drafts by itself.

## Research audit, 6 October 2026

`data/research-provenance.json` records final Library audit and evidence identities,
both version 1. The full 242-record original/reviewed-source/independent-review
audit remains in Library. The repository contains 130 derived current/future/
recurring candidates, preserving all original 196 organisation IDs and adding 26.
At review time, 48 vacancies and 8 registers were accepting, 28 future records
were approved, and 46 future/recurring candidates were held. All 74 future records
remain in the offline compilation, including 22 openings after 6 January 2027
(three nationality-restricted scholarship windows stay outside the public site).
