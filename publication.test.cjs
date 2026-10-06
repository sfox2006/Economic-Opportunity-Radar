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
test('upcoming windows stay separate, expire for recheck and stop at three months', () => {
  const record = live({status:'upcoming',opensOn:'2026-11-01',verification:{...live().verification,acceptingApplications:false,openingDateConfirmed:true}});
  assert.equal(model.select([record],settings,now).opportunities.length,0);
  assert.equal(model.select([record],settings,now).openingSoon.length,1);
  assert.equal(model.select([{...record,opensOn:'2026-10-06'}],settings,now).excluded[0].reason,'opening-needs-recheck');
  assert.equal(model.select([{...record,opensOn:'2027-01-07'}],settings,now).excluded[0].reason,'outside-watchlist-window');
  const expected = {...record,opensOn:null,expectedOpensFrom:'2026-11-01',expectedOpensBy:'2026-11-30',openingEvidence:'Expected cycle supported by official page',verification:{...record.verification,expectedWindowSupported:true}};
  model.validate([expected],registry,settings);
  assert.equal(model.select([expected],settings,now).openingSoon.length,1);
});
test('Australia dates and month-end boundaries are deterministic', () => {
  assert.equal(model.dateKey(new Date('2026-10-06T23:00:00Z')),'2026-10-07');
  assert.equal(model.windowEnd('2026-11-30'),'2027-02-28');
  assert.equal(model.validDate('2026-02-30'),false);
});
test('CSV labels demo data, excludes application URLs and neutralises formulas', () => {
  const code = fs.readFileSync('dist/directory.js','utf8');
  const ctx = vm.createContext({radarRegistry:registry});
  vm.runInContext(code.slice(code.indexOf('function csvCell('),code.indexOf("document.getElementById('download-csv').addEventListener")),ctx);
  assert.match(ctx.exportCsv([base]), /SIMULATED — NOT A REAL VACANCY/);
  assert.equal(ctx.csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.match(ctx.exportCsv([{...base,url:'https://should-not-export.example'}]), /Not verified/);
  assert.doesNotMatch(ctx.exportCsv([{...base,url:'https://should-not-export.example'}]), /should-not-export/);
});
