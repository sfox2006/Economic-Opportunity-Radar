const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {applyCorrections,readRecords}=require('./scripts/research-records.cjs'),model=require('./dist/catalog-model.js'),exporter=require('./dist/catalog-export.js');
const read=name=>JSON.parse(fs.readFileSync('data/'+name,'utf8'));
const base=read('live-opportunities.json'),corrections=read('opportunity-corrections.json'),records=readRecords(__dirname),registry=read('organisations.json'),settings=read('settings.json');
const byId=id=>records.find(r=>r.id===id),catalog=model.select(records,settings,new Date('2026-10-07T12:40:00Z'));

test('complete correction projection retains immutable source history and all future candidates',()=>{
  const before=JSON.stringify(base);applyCorrections(base,corrections);assert.equal(JSON.stringify(base),before);
  assert.deepEqual(applyCorrections([],corrections),[]);
  assert.equal(corrections.source.version,'2');assert.equal(corrections.source.readLines,4686);assert.equal(corrections.priorityCount,7);assert.equal(corrections.findingCount,284);
  assert.equal(corrections.revisions.reduce((n,r)=>n+r.facts.length,0),284);assert.equal(corrections.revisions.length,152);
  assert.equal(records.length,290);model.validate(records,registry,settings);
  assert.equal(catalog.futureCompilation.length,86);
  assert.deepEqual(catalog.futureCompilation.map(r=>r.id).sort(),model.select(base,settings,new Date('2026-10-07T12:40:00Z')).futureCompilation.map(r=>r.id).sort());
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(base.filter(r=>r.researchAudit.libraryFileId===read('research-provenance.json').sourceAudit.libraryFileId))).digest('hex'),'c16463600b3458922d6daa75d1aba7d4ac32666ff69ee37a52676e1b1f4057e6');
  assert.doesNotMatch(JSON.stringify(corrections),/signatureStatus|questionGroups|newEmailsSent|clarificationDrafts|recipientRouting|messageId/);
});

test('resolved RMIT cutoff publishes one role while DEWR and ANU holds survive corrected deadlines',()=>{
  const rmit=byId('rmit-researcher-indigenous-socioeconomic-jr50955');assert.equal(rmit.closesAt,'2026-10-11T23:59:00+11:00');assert.equal(rmit.publicationApproved,true);assert.match(rmit.studyYear,/PhD preferred, not mandatory/);assert.equal(rmit.independentReview.previousDecision.decision,'hold');
  assert.equal(catalog.opportunities.length,106);assert.equal(catalog.opportunities.filter(r=>r.status!=='interest-register').length,85);
  assert.equal(catalog.opportunities.some(r=>r.id===rmit.id),true);
  const dewr=byId('department-of-employment-and-workplace-relations-26-1537-director-closing-gap'),anu=byId('anu-economics-lecturer-561517');
  assert.equal(dewr.closesAt,'2026-10-12T23:30:00+11:00');assert.equal(anu.closesAt,'2026-12-06T00:00:00Z');assert.equal(anu.applicationUrl,'https://econjobmarket.org/positions/12610');assert.match(anu.studyYear,/whether it must occur by application or appointment is not expressly confirmed/);
  for(const item of [dewr,anu,byId('cpd-communications-officer-2026'),byId('deloitte-australia-1362411666'),byId('deloitte-australia-1065312766')]){assert.equal(item.publicationApproved,false);assert.equal(catalog.opportunities.some(r=>r.id===item.id),false);}
  const coordinator=byId('rmit-senior-operations-performance-jr51180');assert.equal(coordinator.deadlineOn,'2026-10-16');assert.ok(!coordinator.closesAt);assert.match(coordinator.experienceDetails,/postgraduate qualification/);assert.doesNotMatch(coordinator.eligibilityDetails,/No specific degree/);
  const expired=model.select(records,settings,new Date('2026-10-11T13:00:00Z'));assert.equal(expired.opportunities.some(r=>r.id===rmit.id),false);
});

test('field corrections update cards and exports without refreshing acceptance checks or relaxing audience gates',()=>{
  const fieldsOnly=records.filter(r=>r.factReview&&!r.factReview.priorityApplied);
  for(const item of fieldsOnly){const old=base.find(r=>r.id===item.id);assert.equal(item.status,old.status);assert.equal(item.publicationApproved,old.publicationApproved);assert.equal(item.verification.state,old.verification.state);assert.equal(item.verification.checkedAt,old.verification.checkedAt);assert.equal(item.verification.acceptingApplications,old.verification.acceptingApplications);assert.equal(item.verification.australianAudienceEligible,old.verification.australianAudienceEligible);}
  assert.match(byId('nous-group-8843982002').studyYear,/distinction average/);assert.match(byId('bdo-australia-jr103944').experienceDetails,/2–3 years/);
  const csv=exporter.currentCsv(catalog.opportunities,registry);assert.match(csv,/11 October 2026 at 11:59pm AEDT/);assert.match(csv,/16 October 2026 at 11:59pm; timezone not stated/);assert.match(csv,/13 October 2026 00:25 AEDT/);assert.doesNotMatch(csv,/Econ Job Market position 12610/);
});

test('newer verified source values take precedence over older correction patches',()=>{
  const newer=structuredClone(base),rmit=newer.find(r=>r.id==='rmit-researcher-indigenous-socioeconomic-jr50955');rmit.verification.checkedAt='2026-10-08T00:00:00Z';rmit.deadline='A newer checked deadline';rmit.status='unknown';rmit.publicationApproved=false;
  const result=applyCorrections(newer,corrections).find(r=>r.id===rmit.id);assert.equal(result.deadline,'A newer checked deadline');assert.equal(result.publicationApproved,false);assert.equal(result.verification.checkedAt,'2026-10-08T00:00:00Z');
});
