const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),model=require('./dist/catalog-model.js');
const records=require('./scripts/research-records.cjs').readRecords(__dirname),settings=JSON.parse(fs.readFileSync('data/settings.json'));
const now=new Date('2026-10-07T12:40:00Z'),published=model.selectPublic(records,settings,now),all=model.select(records,settings,now);

test('public horizon separates accepting opportunities from five verified upcoming entries',()=>{
  assert.equal(published.opportunities.length,106);assert.equal(published.confirmedFuture.length,5);assert.equal(published.recurringUnconfirmed.length,0);assert.equal(published.publicOpeningWindow.through,'2027-01-07');
  assert.equal(all.futureCompilation.length,86);assert.equal(published.futureCompilation.length,5);
  assert.deepEqual(published.confirmedFuture.map(r=>r.id).sort(),['anu-cbe-cbe-sourced-semester1-2027','anu-cbe-self-sourced-semester1-2027','sydney-honours-scholarship-2027','uq-pinnacle-finance-scholarship-2027','uq-plato-finance-scholarship-2027'].sort());
  for(const r of published.confirmedFuture){assert.equal(r.publicationApproved,true);assert.equal(r.publicationState,'confirmed-future');assert.equal(published.opportunities.some(x=>x.id===r.id),false);}
});

test('month precision is retained and ambiguous or straddling windows remain private',()=>{
  const uq=published.confirmedFuture.find(r=>r.id==='uq-plato-finance-scholarship-2027');assert.equal(uq.openingWindow,'November 2026');assert.equal(uq.opensOn,undefined);assert.equal(uq.opensFrom,undefined);assert.deepEqual(model.openingBounds(uq),{from:'2026-11-01',by:'2026-11-30',precision:'month'});
  assert.equal(model.openingBounds({openingWindow:'Early 2027'}),null);assert.equal(model.openingBounds({openingWindow:'Late 2026'}),null);
  assert.equal(published.confirmedFuture.some(r=>r.id==='blackrock-australia-full-time-analyst-sydney-2028'),false);
  const seed=published.confirmedFuture[0],boundary={...seed,id:'boundary-test',opensOn:'2027-01-07'},beyond={...seed,id:'beyond-test',opensOn:'2027-01-08'},straddling={...seed,id:'straddling-test',opensOn:undefined,opensFrom:'2027-01-01',opensBy:'2027-01-31',verification:{...seed.verification,openingWindowConfirmed:true}};
  assert.deepEqual(model.selectPublic([boundary,beyond,straddling],settings,now).confirmedFuture.map(r=>r.id),['boundary-test']);
});

test('opening arrival, stale checks and held or recurring records never become public acceptance',()=>{
  const id='anu-cbe-cbe-sourced-semester1-2027',due=model.selectPublic(records,settings,new Date('2026-10-12T00:00:00Z'));
  assert.equal(due.confirmedFuture.some(r=>r.id===id),false);assert.equal(due.opportunities.some(r=>r.id===id),false);
  assert.equal(model.selectPublic(records,settings,new Date('2026-11-01T00:00:00Z')).confirmedFuture.length,0);
  const ids=new Set([...published.opportunities,...published.confirmedFuture].map(r=>r.id));
  for(const r of records.filter(r=>r.publicationApproved===false||r.status==='recurring-unconfirmed'))assert.equal(ids.has(r.id),false);
});
