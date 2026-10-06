# Economic Opportunity Radar

This website serves Australian economists and economics-related professionals
under 30, including students, graduates and applicants with several years of
experience. The audience age is not an employer age limit unless an official
source explicitly says so. Review actual qualifications and experience rather
than excluding a role solely because its title says senior, manager, specialist,
assistant director or EL1. Economics-relevant management and leadership roles
can qualify when their actual requirements reasonably fit this audience.
Sam authorised verified research, international expansion, retention of openings
more than three months away, and removal of simulated listings on 6 October 2026.
The public site uses live mode. Synthetic fixtures remain private test inputs;
never restore them to the public catalogue or use them as research leads.

## Files to edit

- `data/organisations.json`: source registry; all employers imported from the
  supplied YEN reference, in ten-sector newsletter order. URLs and notes are
  unverified leads. Null careers URLs stay null until checked.
- `data/demo-opportunities.json`: synthetic examples; every record must say
  `simulated: true`, with no application URL or verification claim.
- `data/live-opportunities.json`: future verified opportunities and held candidates.
- `data/settings.json`: explicit demo/live mode and review-age policy.
- `docs/agent-updates.md`, `docs/known-traps.md`: workflow and employer pitfalls.
- `dist/catalog-model.js`: publication policy shared between build and browser.
- `dist/app.js`, `dist/directory.js`, HTML/CSS: user interface.

Generated `dist/catalog.js` and `dist/organisations.js` must be rebuilt from data;
do not edit them directly. No dependencies need installing.

## Future verification work

When explicitly asked for real listings, use current official role pages and
working application routes. Record check timestamps, evidence URLs and notes.
Keep distinct streams and programs in separate records. Never infer citizenship,
pay, eligibility, deadlines or open status from an annual cycle. Import notes,
known traps and old editions are leads, not evidence of current availability.

Describe employers factually without ideological labels. Every live role must
be an Australian placement or explicitly verified as eligible for this Australian
audience; a global careers page alone is insufficient.

Never promote a watchlist entry automatically on its opening date. Recheck it.
Keep future, recurring-unconfirmed, unverified, closed and stale records out of
current-list downloads. Retain all future candidates in the separate future
compilation, including records held for recheck and openings beyond three months.
Never mix simulated data into live mode. Do not send emails, create Gmail drafts
or activate research services as part of a website update.

Run `node scripts/build.cjs`, `node --test *.test.cjs` and syntax checks for changed
JavaScript. For UI changes, check the browser at desktop and mobile sizes.
Keep changes reviewable in a pull request; publishing settings and merges follow
the user's requested scope.

For the broadened professional-audience pass requested on 6 October 2026, prepare
a draft pull request with added, updated and withheld counts, coverage for every
registry organisation in all ten sectors, unresolved access and independent
verification results. At 21:52 UTC Sam authorised publication once tests pass,
superseding the earlier draft-only hold for this pass. Wait for the completed,
independently reviewed records and all-organisation coverage bundle, import only
approved public records, retain held candidates privately and complete final
data/UI verification before merge and deployment. Do not publish the foundation
alone as completed research. Check current main and exact CI/Pages/live results.
