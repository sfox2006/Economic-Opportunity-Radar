const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const code = readFileSync('dist/app.js', 'utf8');
const catalogCode = readFileSync('dist/catalog.js', 'utf8');

function load(catalog) {
  const elements = new Map();
  const element = () => ({
    value: '', checked: false, hidden: false, innerHTML: '', textContent: '', options: [], children: [],
    addEventListener() {}, appendChild(child) { this.options.push(child); this.children.push(child); },
    querySelector() { return null; }, querySelectorAll() { return []; }, focus() {}
  });
  const context = vm.createContext({ console, radarCatalog: catalog, document: {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element, querySelectorAll: () => []
  }});
  vm.runInContext(code.replace(/initMap\(\);\s*registerWebMcpTools\(\);\s*$/, ''), context);
  const evaluate = source => vm.runInContext(source, context);
  evaluate('for (const el of [els.regionFilter, els.typeFilter, els.eligibilityFilter, els.paidFilter]) el.value = "All"; updateState();');
  return evaluate;
}

// Synthetic examples for behavior checks; never served from dist/.
const example = (overrides = {}) => ({
  id: 'example-internship', organisation: 'Example economics institute', program: 'Economics internship',
  country: 'United States', region: 'United States', lat: 38.9, lon: -77,
  type: 'Internship', status: 'open', description: 'Study labor economics.',
  deadline: 'Rolling', paid: 'Paid stipend', eligibility: 'Yes',
  eligibilityDetails: 'Economics students', duration: '12 weeks', location: 'Washington, DC',
  application: 'Follow the official instructions.', url: 'https://example.org/program', reviewedAt: '2026-10-06',
  ...overrides
});

test('public catalog uses supported fields, unique IDs and valid dates', () => {
  const ctx = vm.createContext({});
  vm.runInContext(catalogCode + '\n' + code.slice(0, code.indexOf('const state =')), ctx);
  const catalog = vm.runInContext('radarCatalog', ctx);
  const types = vm.runInContext('typeOrder', ctx);
  const ids = new Set();
  for (const [key, records] of Object.entries(catalog)) {
    assert.ok(Array.isArray(records));
    for (const item of records) {
      for (const field of ['id', 'organisation', 'program', 'description', 'country', 'region', 'location', 'deadline', 'paid', 'eligibilityDetails', 'duration', 'application', 'url', 'reviewedAt']) {
        assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.id}: ${field}`);
      }
      assert.ok(!ids.has(item.id), `Duplicate ID: ${item.id}`); ids.add(item.id);
      assert.ok(types.includes(item.type));
      assert.ok(['Yes', 'Some restrictions', 'No'].includes(item.eligibility));
      assert.equal(new URL(item.url).protocol, 'https:');
      assert.ok(ctx.parseIsoDate(item.reviewedAt));
      if (item.deadlineOn) assert.ok(ctx.parseIsoDate(item.deadlineOn));
      if (key === 'openingSoon') {
        assert.equal(item.status, 'upcoming'); assert.ok(ctx.parseIsoDate(item.opensOn));
      } else assert.ok(['open', 'rolling', 'on-demand'].includes(item.status));
      if (item.mapped !== false && item.region !== 'Online' && item.country !== 'Global') {
        assert.ok(Number.isFinite(item.lat) && Math.abs(item.lat) <= 90);
        assert.ok(Number.isFinite(item.lon) && Math.abs(item.lon) <= 180);
      }
    }
  }
});

test('empty catalog starts without selection, fake listings or map pins', () => {
  const evaluate = load({ opportunities: [], openingSoon: [] });
  assert.equal(evaluate('state.selectedId'), null);
  assert.equal(evaluate('state.profile'), null);
  assert.equal(evaluate('els.scanCount.textContent'), 0);
  assert.equal(evaluate('mapFeaturesFor(activeProgrammes()).features.length'), 0);
  assert.match(evaluate('els.results.innerHTML'), /Economics opportunities are coming soon/);
  evaluate('selectCatalog("opening")');
  assert.equal(evaluate('els.panelOpen.hidden'), true);
  assert.equal(evaluate('els.tabOpening.ariaSelected'), 'true');
  assert.match(evaluate('els.openingSoonList.innerHTML'), /No reviewed programmes/);
});

test('search, funding, geography and profiles work on economics records', () => {
  const evaluate = load({ opportunities: [example(), example({ id: 'example-predoc', program: 'Predoctoral economics research', type: 'Predoctoral program', region: 'Europe', country: 'Germany', paid: 'No', eligibility: 'No' })], openingSoon: [] });
  assert.equal(evaluate('filteredItems().length'), 2);
  assert.equal(evaluate('matchScore(opportunities[0])'), null);
  evaluate('els.query.value = "predoctoral"; updateState()');
  assert.equal(evaluate('filteredItems()[0].id'), 'example-predoc');
  evaluate('resetFilters(); els.paidFilter.value = "Paid"; updateState()');
  assert.equal(evaluate('filteredItems().length'), 1);
  evaluate('resetFilters(); els.regionFilter.value = "Europe"; updateState()');
  assert.equal(evaluate('filteredItems()[0].id'), 'example-predoc');
  evaluate('resetFilters(); els.homeRegion.value = "United States"; state.interests.add("Internship"); updateState()');
  assert.equal(evaluate('matchScore(opportunities[0])'), null);
  evaluate('applyProfile()');
  assert.equal(evaluate('filteredItems()[0].id'), 'example-internship');
  assert.equal(evaluate('typeof filteredItems()[0].score'), 'number');
  evaluate('state.selectedId = opportunities[0].id; render()');
  assert.match(evaluate('els.detail.innerHTML'), /% profile fit/);
  evaluate('clearProfile()');
  assert.equal(evaluate('matchScore(opportunities[0])'), null);
});

test('opening window, upcoming geography, review dates and closing badges', () => {
  const evaluate = load({ opportunities: [], openingSoon: [example({ id: 'example-upcoming', status: 'upcoming', region: 'Europe', opensOn: '2099-01-01' })] });
  assert.ok(evaluate('els.regionFilter.options.some(option => option.value === "Europe")'));
  assert.ok(evaluate('isOpeningSoon({status:"upcoming", opensOn:"2027-01-06"}, new Date(2026,9,6))'));
  assert.equal(evaluate('isOpeningSoon({status:"upcoming", opensOn:"2027-01-07"}, new Date(2026,9,6))'), false);
  assert.equal(evaluate('isOpeningSoon({status:"open", opensOn:"2026-11-01"}, new Date(2026,9,6))'), false);
  assert.equal(evaluate('parseIsoDate("2026-02-30")'), null);
  assert.equal(evaluate('sourceLabel({reviewedAt:"2026-10-06"})'), 'Official source reviewed 6 Oct 2026');
  assert.equal(evaluate('sourceLabel({})'), 'Review date not recorded');
  assert.ok(evaluate('isClosingSoon({deadlineOn:"2026-10-08"}, new Date(2026,9,6))'));
  assert.equal(evaluate('isClosingSoon({deadlineOn:"2026-10-05"}, new Date(2026,9,6))'), false);
});
