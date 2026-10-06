# Economic Opportunity Radar

An economics careers website for Australian economists and economics-related
professionals under 30, including students, graduates and people with several
years of experience, based on the Young Economist Network Opportunity Roundup.
Covers economics-relevant professional jobs, suitable management and specialist
roles, student pathways, research and scholarships across ten sectors. Audience
age is not an employer age restriction; each listing retains actual requirements.

**Current mode: live.** Simulated cards and watchlist examples have been removed
from the public catalogue. The 196 real organisations from the supplied reference
remain as research coverage alongside 26 international and think-tank additions.
Reviewed current and future opportunities are held in the live data source;
availability is rechecked by the shared publication policy. Synthetic fixtures are
kept privately in `data/demo-opportunities.json` for behavior checks.

## What works

- Australian map with clustered locations and links to program cards.
- Search and filters for sector, placement location, type, funding, citizenship,
  international eligibility and qualifications / study.
- Expandable cards with dates, pay and eligibility, plus optional profile matching.
- Searchable directory covering the 196 original organisations and 26 additions,
  grouped in newsletter sector order, with official About pages or homepages.
- Separate open, confirmed future, and unconfirmed/recurring tabs. All future dates
  are retained, including records held for recheck; open and future CSV downloads
  remain separate.
- Structured JSON inputs and shared publication rules for verified research updates.
- Optional professional experience requirements in cards, search, application
  prompts and exports, using source wording without inferred age limits.
- Local application prompts and stable opportunity share links, plus YEN enquiry
  links and the existing monthly newsletter signup form.
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
selects demo/live mode. Empty live input stays empty; live mode rejects simulated
data. Unverified, closed, expired and stale live listings are held back. Exact
opening dates require a recheck before promotion; expected windows stay labelled.
Future candidates remain in the compilation across all dates and review states.
Use `node scripts/export-compilation.cjs <output-directory>` for review CSV/JSON.

Edit `data/organisation-websites.json` to maintain organisation About/homepage
links, then rebuild. This separate overlay records link evidence and labels
parent/successor organisations explicitly. It does not verify vacancies or alter
the original careers-page research leads. Use `null` plus an `unavailable` reason
if no identifiable official site exists; never link an unrelated reclaimed domain.

Read [the agent update contract](docs/agent-updates.md), [known traps](docs/known-traps.md)
and [AGENTS.md](AGENTS.md) before adding live data. Those checks enforce the input
contract; they do not replace source verification or independent review.

The existing public YEN ACT newsletter form is configured in `dist/config.js`.
This website does not collect CVs or operate a subscriber backend. No Gmail drafts
or research agents are activated by a site update.

## Publish

The broadened professional-audience pass is for a **draft PR only**, with
added/updated/withheld counts, coverage across all registry organisations and
sectors, access blockers and independent review. It requires further Sam approval
before merge or deployment.

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
