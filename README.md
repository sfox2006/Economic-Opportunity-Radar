# Economic Opportunity Radar

An Australian economics careers website based on the Young Economist Network
Opportunity Roundup. Covers internships, graduate jobs, cadetships, vacation
programs, industry placements, scholarships and research assistantships across
the newsletter's ten sectors.

**Current mode: demonstration.** All 196 opportunity cards and ten watchlist
examples are simulated. No internships or other real vacancies have been searched
or verified. Each sample is labelled and has no application link.

## What works

- Australian map with clustered locations and links to program cards.
- Search and filters for sector, state/territory, type, funding, citizenship,
  international eligibility and study year.
- Expandable cards with dates, pay and eligibility, plus optional profile matching.
- Searchable directory of all 196 unique organisations from the supplied reference,
  grouped in newsletter sector order. Reference links are labelled unverified.
- A separate three-month upcoming watchlist and current-only filtered CSV download.
- Structured JSON inputs and shared publication rules for future agent updates.
- GitHub Actions tests and Pages deployment, with daily expiry-only rebuilds.

## Run and check

Node.js 22+ is required for the build and tests. No npm install is needed.

```sh
node scripts/build.cjs
node --test *.test.cjs
python -m http.server 8974 --directory dist --bind 127.0.0.1
```

Open http://127.0.0.1:8974. Internet access is needed for map assets and fonts.
Authored assets live in `dist/`; only that folder is published. Generated
`catalog.js` and `organisations.js` must be rebuilt after JSON changes.

## Agent foundations

Edit `data/organisations.json`, `data/demo-opportunities.json` or
`data/live-opportunities.json`, then rebuild. `data/settings.json` explicitly
selects demo/live mode. Live input starts empty, and live mode rejects simulated
data. Unverified, closed, expired and stale live listings are held back. Exact
opening dates require a recheck before promotion; expected windows stay labelled.

Read [the agent update contract](docs/agent-updates.md), [known traps](docs/known-traps.md)
and [AGENTS.md](AGENTS.md) before adding live data. Those checks enforce the input
contract; they do not replace source verification or independent review.

Newsletter signup is disabled until separately configured in `dist/config.js`.
No Gmail drafts, subscriber integrations or research agents have been activated.

## Publish

In repository **Settings → Pages**, select **GitHub Actions**. After the PR is
merged, main updates or a manual **Test and deploy website** run publish the site.
Daily scheduled rebuilds enforce expiry only; agents still need to verify and
submit fresh data. The intended URL is
https://sfox2006.github.io/Economic-Opportunity-Radar/.

## Sources

UI foundation copied from `sfox2006/Opportunity-Radar`, commit
`7be285ac5f75c679e4ea201bded76973671e8d4b`. Organisation leads and employer pitfalls
come from the user-supplied `yen-opportunities-newsletter.skill` on 6 October 2026.
Duplicate references are consolidated. Missing URLs are preserved as null;
legacy names remain leads for future verification. Political opportunity data and
newsletter subscriber integrations are not copied.
