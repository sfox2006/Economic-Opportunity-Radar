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

test('private demo fixtures cover registry organisations without verification claims', () => {
  const ctx = vm.createContext({});
  vm.runInContext(catalogCode + '\n' + code.slice(0, code.indexOf('const state =')), ctx);
  const catalog = vm.runInContext('radarCatalog', ctx);
  const registry = JSON.parse(readFileSync('data/organisations.json', 'utf8'));
  const records = JSON.parse(readFileSync('data/demo-opportunities.json', 'utf8'));
  require('./dist/catalog-model.js').validate(records, registry, {...catalog.settings, mode:'demo'});
  assert.equal(registry.sectors.length, 10);
  assert.equal(new Set(registry.organisations.map(org => org.id)).size, registry.organisations.length);
  for (const org of registry.organisations) assert.ok(records.some(item => item.organisationId === org.id && item.simulated));
  for (const item of records) {
    assert.equal(item.url, ''); assert.equal(item.reviewedAt, null); assert.equal(item.verification, undefined);
  }
});

test('public catalogue uses live data without any simulated fallback', () => {
  const ctx = vm.createContext({});
  vm.runInContext(catalogCode, ctx);
  const catalog = vm.runInContext('radarCatalog', ctx);
  assert.equal(catalog.settings.mode, 'live');
  assert.ok([...catalog.opportunities, ...catalog.openingSoon].every(item => item.simulated === false));
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="demo-banner"[^>]*hidden/);
  assert.match(html, /Organisation coverage is being researched/);
});

test('empty catalog starts without selection, fake listings or map pins', () => {
  const evaluate = load({ opportunities: [], openingSoon: [] });
  assert.equal(evaluate('state.selectedId'), null);
  assert.equal(evaluate('state.profile'), null);
  assert.equal(evaluate('els.scanCount.textContent'), 0);
  assert.equal(evaluate('mapFeaturesFor(activeProgrammes()).features.length'), 0);
  assert.match(evaluate('els.results.innerHTML'), /No verified opportunities/);
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

test('sector, citizenship and study-year filters combine and reset correctly', () => {
  const evaluate = load({opportunities:[example({sector:'federal',citizenship:'Required',studyYear:'Final year'}),
    example({id:'other',sector:'banks',citizenship:'Not required',studyYear:'Penultimate year'})],openingSoon:[]});
  evaluate('els.sectorFilter.value="banks"; els.citizenshipFilter.value="Not required"; els.studyYearFilter.value="Penultimate year"; updateState()');
  assert.equal(evaluate('filteredItems().length'),1);
  assert.equal(evaluate('filteredItems()[0].id'),'other');
  evaluate('els.citizenshipFilter.value="Required"; updateState()');
  assert.equal(evaluate('filteredItems().length'),0);
  evaluate('resetFilters()');
  assert.equal(evaluate('filteredItems().length'),2);
});

test('unpaid does not pass paid filters and external card text is escaped', () => {
  const evaluate = load({opportunities:[example({paid:'Unpaid'}),example({id:'unsafe-text',program:'<img src=x onerror=alert(1)>',description:'<script>bad</script>'})],openingSoon:[]});
  evaluate('els.paidFilter.value="Paid"; updateState()');
  assert.equal(evaluate('filteredItems().length'),1);
  assert.match(evaluate('els.results.children.at(-1).innerHTML'), /&lt;img/);
  assert.doesNotMatch(evaluate('els.results.children.at(-1).innerHTML'), /<script>|<img/);
  assert.equal(evaluate('fundingCategory({paid:"Unpaid"})'),'No');
});
