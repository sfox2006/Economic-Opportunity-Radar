const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {applyCorrections,readRecords}=require('./scripts/research-records.cjs'),model=require('./dist/catalog-model.js'),exporter=require('./dist/catalog-export.js');
const read=name=>JSON.parse(fs.readFileSync('data/'+name,'utf8'));
const base=read('live-opportunities.json'),original=read('opportunity-corrections.json'),incremental=read('ifs-incremental-corrections.json');
const before=applyCorrections(base,original),after=readRecords(__dirname),settings=read('settings.json'),registry=read('organisations.json');
const ids=['ifs-postdoctoral-fellow-2027','ifs-research-economist-postdoctoral-2027'],now=new Date('2026-10-07T18:20:00Z');

test('incremental IFS projection changes exactly two existing IDs and preserves deployed audit/corrections',()=>{
  for(const [file,hash] of [['live-opportunities.json','999b54d87aba3359c6adf639f14cd28cb57f76a445f446a40e952d26b47ae5e4'],['opportunity-corrections.json','70cb6f7d7192f0d3bb5e4d5296a594aecc12b90ee6233c66a0da39ae68d8ba3a']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/'+file)).digest('hex'),hash);
  assert.equal(incremental.source.version,'0');assert.equal(incremental.source.readLines,351);
  assert.deepEqual(incremental.revisions.map(r=>r.recordId),ids);
  assert.equal(after.length,290);
  assert.deepEqual(after.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(before[i])).map(r=>r.id),ids);
  for(const id of ['ifs-research-economist-2027','ifs-phd-enrichment-2027'])assert.deepEqual(after.find(r=>r.id===id),before.find(r=>r.id===id));
  assert.equal(after.some(r=>/modykqbj4m|feqhj8yh6y/.test(r.url||'')),false);
  const snapshot=JSON.stringify(before);applyCorrections(before,incremental);assert.equal(JSON.stringify(before),snapshot);
  model.validate(after,registry,settings);
});

test('matched IFS accepting roles retain conditional doctoral eligibility, exact routes and review provenance',()=>{
  const published=model.selectPublic(after,settings,now),old=model.selectPublic(before,settings,now);
  assert.equal(published.opportunities.length,old.opportunities.length+2);
  assert.equal(published.opportunities.filter(r=>r.status!=='interest-register').length,85);
  assert.equal(published.opportunities.filter(r=>r.status==='interest-register').length,21);
  for(const [i,id] of ids.entries()){
    const role=published.opportunities.find(r=>r.id===id);assert.ok(role);
    assert.equal(role.url,'https://econjobmarket.org/positions/'+[12665,12705][i]);assert.equal(role.applicationUrl,role.url);
    assert.equal(role.closesAt,'2026-11-15T23:59:00Z');assert.equal(role.deadlineOn,'2026-11-15');assert.equal(role.holdReason,undefined);assert.equal(after.find(r=>r.id===id).holdReason,null);
    assert.equal(role.independentReview.previousDecision.decision,'hold');assert.equal(role.independentReview.decision,'approve');
    assert.equal(role.verification.acceptingApplications,true);assert.equal(role.verification.australianAudienceEligible,true);assert.equal(role.verification.audienceAccess,'conditional');
    assert.match(role.eligibilityDetails,/PhD|Doctorate/);assert.match(role.eligibilityDetails,/UK work/);assert.match(role.experienceDetails,/Skilled Worker/);assert.doesNotMatch(role.experienceDetails,/Work rights: Not stated/);
    assert.match(role.verification.notes,/employer confirmation/);
    const expired=model.selectPublic(after,settings,new Date('2026-11-15T23:59:00Z'));assert.equal(expired.opportunities.some(r=>r.id===id),false);
  }
  const postdoc=after.find(r=>r.id===ids[0]);assert.match(postdoc.duration,/Initial one-year/);assert.match(postdoc.duration,/renewal is not guaranteed/);
  const economist=after.find(r=>r.id===ids[1]);assert.equal(economist.duration,'Continuing/permanent');assert.match(economist.workRights,/not stated in the current public advert/);
  const csv=exporter.currentCsv(published.opportunities,registry);for(const id of ids)assert.ok(csv.includes(after.find(r=>r.id===id).program));assert.match(csv,/23:59 UTC/);assert.match(csv,/Verification notes/);
});

test('IFS promotions preserve the three-month horizon, all offline future records and newer-source precedence',()=>{
  const published=model.selectPublic(after,settings,now),old=model.selectPublic(before,settings,now);
  assert.deepEqual(published.confirmedFuture,old.confirmedFuture);assert.equal(published.confirmedFuture.length,5);
  assert.deepEqual(model.select(after,settings,now).futureCompilation,model.select(before,settings,now).futureCompilation);assert.equal(model.select(after,settings,now).futureCompilation.length,86);
  const newer=structuredClone(before),role=newer.find(r=>r.id===ids[1]);role.verification.checkedAt='2026-10-08T00:00:00Z';role.workRights='A newer verified restriction';
  const result=applyCorrections(newer,incremental).find(r=>r.id===role.id);assert.equal(result.status,'unknown');assert.equal(result.publicationApproved,false);assert.equal(result.workRights,'A newer verified restriction');
});
