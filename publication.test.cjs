const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('./dist/catalog-model.js');
const registry = JSON.parse(fs.readFileSync('data/organisations.json', 'utf8'));
const base = JSON.parse(fs.readFileSync('data/demo-opportunities.json', 'utf8'))[0];
const settings = {mode:'live', maxVerificationAgeDays:14, timeZone:'Australia/Sydney'};
const now = new Date('2026-10-06T12:00:00Z');
function live(overrides = {}) {
  return { ...base, id:'live-test', simulated:false, url:'https://example.org/official-role', deadlineOn:'2026-10-20',
    verification:{state:'verified',checkedAt:'2026-10-06T10:00:00Z',sourceUrl:'https://example.org/official-role',notes:'Test evidence, not an actual employer verification.',acceptingApplications:true,deadlineConfirmed:true},
    ...overrides };
}
test('live mode blocks simulated input and malformed identities', () => {
  assert.throws(() => model.validate([base],registry,settings), /simulated record forbidden/);
  assert.throws(() => model.validate([live({organisationId:'unknown'})],registry,settings), /mismatch/);
  assert.throws(() => model.validate([live({type:'Graduate internship mashup'})],registry,settings), /unsupported type/);
  assert.throws(() => model.validate([live({closesAt:'2026-10-20 17:00'})],registry,settings), /time zone/);
  assert.throws(() => model.validate([live(),live()],registry,settings), /duplicate ID/);
});
test('closed, unverified, future-reviewed, stale and expired roles are held back', () => {
  const candidates = [live(), live({id:'closed',status:'closed'}),live({id:'unknown',verification:null}),
    live({id:'future',verification:{...live().verification,checkedAt:'2026-10-07T10:00:00Z'}}),
    live({id:'stale',verification:{...live().verification,checkedAt:'2026-09-01T10:00:00Z'}}),
    live({id:'expired',deadlineOn:'2026-10-05'}),live({id:'clock-expired',closesAt:'2026-10-06T09:00:00Z'}),
    live({id:'no-apply',verification:{...live().verification,acceptingApplications:false}}),
    live({id:'uncertain-date',verification:{...live().verification,deadlineConfirmed:false}})];
  model.validate(candidates,registry,settings);
  const result = model.select(candidates,settings,now);
  assert.deepEqual(result.opportunities.map(item=>item.id), ['live-test']);
  assert.equal(result.opportunities[0].reviewedAt,'2026-10-06');
  assert.equal(result.excluded.length,8);
});
test('confirmed future openings stay separate and are retained beyond three months', () => {
  const record = live({status:'upcoming',opensOn:'2026-11-01',verification:{...live().verification,acceptingApplications:false,openingDateConfirmed:true}});
  assert.equal(model.select([record],settings,now).opportunities.length,0);
  assert.equal(model.select([record],settings,now).openingSoon.length,1);
  assert.equal(model.select([{...record,opensOn:'2026-10-06'}],settings,now).excluded[0].reason,'opening-needs-recheck');
  const later = model.select([{...record,opensOn:'2027-09-01'}],settings,now);
  assert.equal(later.openingSoon.length,0);
  assert.equal(later.confirmedFuture.length,1);
  assert.equal(later.futureCompilation.length,1);
  assert.equal(later.excluded.length,0);
  const expected = {...record,opensOn:null,expectedOpensFrom:'2026-11-01',expectedOpensBy:'2026-11-30',openingEvidence:'Expected cycle supported by official page',verification:{...record.verification,expectedWindowSupported:true}};
  model.validate([expected],registry,settings);
  const result = model.select([expected],settings,now);
  assert.equal(result.confirmedFuture.length,0);
  assert.equal(result.recurringUnconfirmed.length,1);
  assert.equal(result.futureCompilation[0].publicationState,'recurring-unconfirmed');
});

test('future compilation keeps unverified, stale and due openings without automatic promotion', () => {
  const record = live({status:'confirmed-future',opensOn:'2027-09-01',verification:{...live().verification,acceptingApplications:false,openingDateConfirmed:true}});
  const candidates = [record, {...record,id:'stale-future',verification:{...record.verification,checkedAt:'2026-09-01T10:00:00Z'}},
    {...record,id:'unverified-future',verification:null}, {...record,id:'opening-today',opensOn:'2026-10-06'}];
  const result = model.select(candidates,settings,now);
  assert.equal(result.opportunities.length,0);
  assert.equal(result.confirmedFuture.length,1);
  assert.equal(result.futureCompilation.length,4);
  assert.equal(result.futureCompilation.find(item=>item.id==='opening-today').holdReason,'opening-needs-recheck');
  assert.equal(result.futureCompilation.find(item=>item.id==='stale-future').publicationState,'held');
  assert.equal(model.select([record],settings,new Date('2027-09-01T12:00:00Z')).opportunities.length,0);
});

test('confirmed ranges and undated recurring programmes have distinct evidence requirements', () => {
  const range = live({status:'confirmed-future',opensFrom:'2027-02-01',opensBy:'2027-02-28',deadlineOn:null,
    verification:{...live().verification,acceptingApplications:false,openingWindowConfirmed:true}});
  const recurring = live({id:'recurring',status:'recurring-unconfirmed',deadlineOn:null,
    verification:{...live().verification,acceptingApplications:false,recurringProgramConfirmed:true}});
  model.validate([range,recurring],registry,settings);
  const result = model.select([range,recurring],settings,now);
  assert.equal(result.confirmedFuture.length,1);
  assert.equal(result.recurringUnconfirmed.length,1);
  assert.equal(result.opportunities.length,0);
  assert.throws(()=>model.validate([{...recurring,opensOn:'2027-02-01'}],registry,settings),/unconfirmed cycles/);
  assert.equal(model.select([{...range,verification:{...range.verification,openingWindowConfirmed:false}}],settings,now).futureCompilation[0].holdReason,'opening-window-unconfirmed');
});

test('international placements need specific Australian audience evidence before publication', () => {
  const overseas = live({country:'United States',region:'United States',location:'Washington, DC',mapped:false});
  model.validate([overseas],registry,settings);
  assert.equal(model.select([overseas],settings,now).opportunities.length,0);
  assert.equal(model.select([overseas],settings,now).excluded[0].reason,'australian-audience-unconfirmed');
  const verified = {...overseas,verification:{...overseas.verification,australianAudienceEligible:true,audienceEvidence:'Official eligibility permits nationals of all member countries, including Australia; test evidence only.'}};
  assert.equal(model.select([verified],settings,now).opportunities.length,1);
  assert.equal(model.select([{...verified,verification:{...verified.verification,audienceEvidence:''}}],settings,now).opportunities.length,0);
});

test('live selection independently blocks simulations and future dates marked open', () => {
  assert.equal(model.select([base],settings,now).opportunities.length,0);
  assert.equal(model.select([live({opensOn:'2027-01-01'})],settings,now).opportunities.length,0);
  assert.throws(()=>model.validate([live({simulated:undefined})],registry,settings),/simulated must be false/);
  model.validate([live({status:'unknown',url:null})],registry,settings);
  assert.equal(model.select([live({url:null})],settings,now).excluded[0].reason,'application-route-unconfirmed');
  assert.equal(model.select([live({status:'unknown',url:null})],settings,now).opportunities.length,0);
});
test('Australia dates and month-end boundaries are deterministic', () => {
  assert.equal(model.dateKey(new Date('2026-10-06T23:00:00Z')),'2026-10-07');
  assert.equal(model.windowEnd('2026-11-30'),'2027-02-28');
  assert.equal(model.validDate('2026-02-30'),false);
  assert.equal(model.validTimestamp('2026-02-30T10:00:00Z'),false);
  assert.equal(model.validTimestamp('2026-10-06T10:00:00'),false);
  assert.equal(model.validTimestamp('2026-10-06T17:00:00+11:00'),true);
});
test('CSV labels demo data, excludes application URLs and neutralises formulas', () => {
  const exporter = require('./dist/catalog-export.js');
  const ctx = {csvCell:exporter.csvCell, exportCsv:items=>exporter.currentCsv(items,registry), exportFutureCsv:items=>exporter.futureCsv(items,registry)};
  assert.match(ctx.exportCsv([base]), /SIMULATED - NOT A REAL VACANCY/);
  assert.equal(ctx.csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.match(ctx.exportCsv([{...base,url:'https://should-not-export.example'}]), /Not verified/);
  assert.doesNotMatch(ctx.exportCsv([{...base,url:'https://should-not-export.example'}]), /should-not-export/);
  assert.doesNotMatch(ctx.exportCsv([live({program:'FUTURE SHOULD NOT EXPORT',status:'confirmed-future',opensOn:'2027-09-01'})]),/FUTURE SHOULD NOT EXPORT/);
  const future = live({program:'FAR FUTURE RETAINED',status:'confirmed-future',opensOn:'2027-09-01',publicationState:'held',holdReason:'review-expired'});
  assert.match(ctx.exportFutureCsv([future]), /FAR FUTURE RETAINED/);
  assert.match(ctx.exportFutureCsv([future]), /Held - needs recheck/);
  assert.match(ctx.exportFutureCsv([future]), /2027-09-01/);
});
