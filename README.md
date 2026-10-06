# Economic Opportunity Radar

A static website for economics internships, research assistantships, predoctoral
programs, fellowships, scholarships, conferences, summer schools and competitions.
Includes the interactive globe, search, filters, expandable program cards and
optional profile matching from [Opportunity Radar](https://github.com/sfox2006/Opportunity-Radar).

The economics catalog starts empty. Political listings, dated research archives,
research-agent services and the political newsletter's subscriber integrations
are not imported. Newsletter signup stays unavailable until an independent
economics Google Form is configured.

## Run locally

No package install or build is required:

```sh
python -m http.server 8765 --directory dist --bind 127.0.0.1
```

Open http://127.0.0.1:8765. Internet access is needed for map tiles, MapLibre and
Google Fonts. All website paths are relative for GitHub Pages project hosting.

## Add listings

Edit `dist/catalog.js`. Add currently open records to `radarCatalog.opportunities`
and upcoming records to `radarCatalog.openingSoon`. Use these fields:

| Field | Purpose |
| --- | --- |
| `id` | Unique identifier across both catalogs |
| `organisation`, `program`, `description` | Organisation, title and summary |
| `type` | One of the categories in `typeOrder` in `dist/app.js` |
| `country`, `region`, `location` | Country, filter region and location details; use `Online` for remote programs |
| `lat`, `lon` | Numeric coordinates for a map pin, or null for unmapped programs |
| `mapped` | Set false to omit a pin |
| `status` | `open`, `rolling` or `on-demand`; use `upcoming` for the opening catalog |
| `deadline`, `deadlineOn` | Human-readable deadline including time zone if known; optional exact ISO date for closing-soon badges |
| `opensOn` | Upcoming only: official confirmed opening date as `YYYY-MM-DD` |
| `paid`, `fundingDetails` | Pay/cost summary and optional details; use `No` for unpaid |
| `eligibility`, `eligibilityDetails` | `Yes`, `Some restrictions` or `No` for international eligibility, plus requirements |
| `duration`, `application` | Dates/time commitment and application instructions |
| `url`, `reviewedAt` | Official HTTPS program page and actual review date as `YYYY-MM-DD` |

Check official sources before adding a listing. Upcoming programs appear only
within three calendar months of their confirmed opening date. Once applications
open, verify and move the record into the open catalog. Closed records must be
removed or moved out of the public catalog; the site does not refresh itself.

Edit `dist/config.js` to configure an economics newsletter Google Form. Leaving
`newsletterSignupUrl` empty keeps signup hidden. Subscriber data stays in the
form owner's account, outside this repository.

## Validate

```sh
node --check dist/app.js
node --check dist/catalog.js
node --check dist/config.js
node --check dist/newsletter.js
node --test *.test.cjs
```

Tests cover the catalog schema, empty catalog startup, filters, profile matching,
opening windows, map navigation/clustering and newsletter configuration. Test
fixtures are synthetic and never included in the published website.

## GitHub Pages

The workflow validates pull requests and publishes only `dist/` on updates to
`main`. In **Settings → Pages**, select **GitHub Actions** as the publishing source.
Then merge the starter pull request or run **Test and deploy website** manually.
The intended URL is https://sfox2006.github.io/Economic-Opportunity-Radar/.
Repository code and the workflow alone do not enable Pages settings.

## Source

Copied from `sfox2006/Opportunity-Radar` at commit
`7be285ac5f75c679e4ea201bded76973671e8d4b` on 6 October 2026.
This is a source snapshot; the political repository's Git history is not imported.
