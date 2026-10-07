const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const model = require('./dist/catalog-model.js'), exporter = require('./dist/catalog-export.js');
const read = name => JSON.parse(fs.readFileSync('data/'+name,'utf8'));
const records = read('live-opportunities.json'), registry = read('organisations.json'), settings = read('settings.json');
const manifest = read('research-provenance.json');
const original = records.filter(r=>r.researchAudit.libraryFileId===manifest.sourceAudit.libraryFileId);
const additions = records.filter(r=>r.researchAudit.libraryFileId===manifest.professionalReview.sourceAudit.libraryFileId);
const checked = model.select(original,settings,new Date('2026-10-06T14:00:00Z'));
const allChecked = model.select(records,settings,new Date(manifest.professionalReview.availabilityCheckedAt));
const byId = id => records.find(r=>r.id===id);

test('reviewed import preserves all candidates, organisations and publication dispositions',()=>{
  model.validate(records,registry,settings);
  assert.equal(records.length,manifest.catalogRecordCount);
  assert.equal(original.length,manifest.derivedRecordCount);
  assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(original)).digest('hex'),manifest.professionalReview.preservedExistingRecordsSha256);
  assert.equal(registry.organisations.length,222);
  assert.equal(original.filter(r=>r.publicationApproved).length,84);
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
  const effective=require('./scripts/research-records.cjs').readRecords(__dirname);
  const generatedAt=vm.runInContext('radarCatalog.generatedAt',context);
  const published=model.selectPublic(effective,settings,new Date(generatedAt));
  assert.equal(publicRecords.length,published.opportunities.length+published.confirmedFuture.length);
  assert.equal(vm.runInContext('radarCatalog.publicScope',context),'current-and-upcoming');
  for(const r of publicRecords)assert.ok([...model.currentStatuses,'confirmed-future'].includes(r.status));
  assert.equal(vm.runInContext('radarCatalog.recurringUnconfirmed.length',context),0);
  for(const key of ['confirmedFuture','futureCompilation','openingSoon'])assert.equal(vm.runInContext('radarCatalog.'+key+'.length',context),published.confirmedFuture.length);
  for(const r of publicRecords) assert.equal(r.publicationApproved,true);
  const ids=new Set(publicRecords.map(r=>r.id));
  for(const r of effective.filter(r=>!r.publicationApproved)) assert.equal(ids.has(r.id),false);
  for(const id of ['jjwbgsp-2027-w1','jjwbgsp-2027-w2','jjwbgsp-japan-2027']) {
    const r=checked.futureCompilation.find(r=>r.id===id);
    assert.equal(r.publicationState,'held');assert.equal(r.verification.australianAudienceEligible,false);
  }
  assert.equal(byId('frontier-economics-winter-intern-next-cycle').status,'recurring-unconfirmed');
  assert.equal(byId('frontier-economics-winter-intern-next-cycle').opensOn,undefined);
});

test('professional review preserves independent holds, actual requirements and all organisation coverage',()=>{
  const review=manifest.professionalReview,coverage=read('research-coverage.json');
  assert.equal(additions.length,160);assert.equal(review.updatedExistingRecords,0);
  assert.equal(additions.filter(r=>r.publicationApproved).length,58);
  assert.equal(additions.filter(r=>!r.publicationApproved).length,102);
  assert.equal(allChecked.opportunities.filter(r=>r.status!=='interest-register').length,84);
  assert.equal(allChecked.opportunities.filter(r=>r.status==='interest-register').length,21);
  assert.equal(allChecked.confirmedFuture.length,34);assert.equal(allChecked.recurringUnconfirmed.length,3);
  assert.equal(allChecked.futureCompilation.length,86);
  assert.equal(allChecked.futureCompilation.filter(r=>r.publicationState==='held').length,49);
  assert.equal(review.sourceAudit.version,'0');assert.equal(review.sourceSummary.approvedNewRecords,57);
  assert.equal(review.additionalHeldLeadCount,1);assert.equal(review.privateUnsentClarificationDrafts,9);
  const nab=byId(review.browserRouteResolution.recordId);
  assert.equal(nab.publicationApproved,true);assert.equal(nab.independentReview.previousDecision.decision,'hold');
  assert.equal(nab.verification.applicationRouteCheckedAt,review.browserRouteResolution.checkedAt);
  for(const r of additions) {
    assert.equal(r.researchAudit.recordId,r.id);assert.equal(r.researchAudit.independentlyReviewed,true);
    assert.equal(r.publicationApproved,r.independentReview.publicationApproved);
    if(r.type==='professional_job'&&r.publicationApproved)assert.ok(r.experienceDetails?.trim());
    if(r.researchOriginalEligibility&&r.country==='Australia')assert.equal(r.eligibility,'Not stated');
  }
  const currentIds=new Set(allChecked.opportunities.map(r=>r.id));
  for(const r of additions.filter(r=>!r.publicationApproved||['confirmed-future','recurring-unconfirmed'].includes(r.status)))assert.equal(currentIds.has(r.id),false);
  assert.equal(coverage.organisations.length,222);assert.equal(new Set(coverage.organisations.map(r=>r.organisationId)).size,222);
  assert.equal(Object.keys(coverage.sectorCounts).length,10);
  const orgs=new Map(registry.organisations.map(r=>[r.id,r]));
  for(const row of coverage.organisations) {
    assert.equal(row.organisation,orgs.get(row.organisationId).name);assert.equal(row.sector,orgs.get(row.organisationId).sector);
    assert.equal(row.generalVacanciesSearched,true);assert.equal(row.studentGraduatePagesSearched,true);
    assert.ok(row.coverageStatus);assert.ok(row.limitations);assert.equal(model.validTimestamp(row.checkedAt),true);
  }
  assert.match(coverage.coverageLimit,/not an exhaustive/);
  assert.doesNotMatch(JSON.stringify(coverage),/initialFetchResult|rawText|clarificationDrafts|evidenceFile/);
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
