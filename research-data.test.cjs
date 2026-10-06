const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const model = require('./dist/catalog-model.js'), exporter = require('./dist/catalog-export.js');
const read = name => JSON.parse(fs.readFileSync('data/'+name,'utf8'));
const records = read('live-opportunities.json'), registry = read('organisations.json'), settings = read('settings.json');
const manifest = read('research-provenance.json');
const checked = model.select(records,settings,new Date('2026-10-06T14:00:00Z'));
const byId = id => records.find(r=>r.id===id);

test('reviewed import preserves all candidates, organisations and publication dispositions',()=>{
  model.validate(records,registry,settings);
  assert.equal(records.length,manifest.derivedRecordCount);
  assert.equal(registry.organisations.length,222);
  assert.equal(records.filter(r=>r.publicationApproved).length,84);
  assert.equal(checked.opportunities.filter(r=>r.status!=='interest-register').length,48);
  assert.equal(checked.opportunities.filter(r=>r.status==='interest-register').length,8);
  assert.equal(checked.confirmedFuture.length,28);
  assert.equal(checked.futureCompilation.length,74);
  assert.equal(checked.futureCompilation.filter(r=>r.publicationState==='held').length,46);
  assert.equal(checked.futureCompilation.filter(r=>r.confirmedOpeningAfter20270106).length,22);
  assert.equal(checked.confirmedFuture.filter(r=>r.confirmedOpeningAfter20270106).length,19);
  assert.equal(manifest.sourceAudit.version,'1');
  for(const r of records) assert.equal(r.researchAudit.recordId,r.id);
  for(const r of records.filter(r=>r.publicationApproved)) assert.equal(r.researchAudit.independentlyReviewed,true);
});

test('public assets omit every held candidate while offline compilation retains restricted future schemes',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync('dist/catalog.js','utf8'),context);
  const publicRecords=vm.runInContext('radarCatalog.records',context);
  assert.equal(publicRecords.length,84);
  for(const r of publicRecords) assert.equal(r.publicationApproved,true);
  const ids=new Set(publicRecords.map(r=>r.id));
  for(const r of records.filter(r=>!r.publicationApproved)) assert.equal(ids.has(r.id),false);
  for(const id of ['jjwbgsp-2027-w1','jjwbgsp-2027-w2','jjwbgsp-japan-2027']) {
    const r=checked.futureCompilation.find(r=>r.id===id);
    assert.equal(r.publicationState,'held');assert.equal(r.verification.australianAudienceEligible,false);
  }
  assert.equal(byId('frontier-economics-winter-intern-next-cycle').status,'recurring-unconfirmed');
  assert.equal(byId('frontier-economics-winter-intern-next-cycle').opensOn,undefined);
});

test('official qualitative windows and unknown deadline time zones keep their original precision',()=>{
  const early=byId('productivity-commission-2028-graduate-program');
  assert.match(early.openingWindow,/Early 2027/);assert.equal(early.opensOn,undefined);assert.equal(early.opensFrom,undefined);
  assert.match(exporter.futureCsv(checked.futureCompilation,registry),/Early 2027/);
  for(const id of ['uq-economics-summer-2027-annuities','sydney-sustainable-living-phd-sc5982','griffith-bendigo-economics-scholarship-2027']) {
    const r=byId(id);assert.equal(r.closesAt,undefined);assert.match(r.deadline,/timezone not published/);
  }
  assert.equal(byId('macquarie-group-graduate-2027-september-round').closesAt,'2026-10-13T12:00:00+11:00');
  assert.match(byId('oecd-internship-2026').displayOrganisation,/no Sydney placement verified/);
  assert.doesNotMatch(byId('un-escap-trade-284109').url,/&amp;/);
  assert.match(byId('cgd-msa-ra-2026').verification.notes,/2026 is inferred/);
});
