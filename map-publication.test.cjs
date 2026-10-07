const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {cityLocation,validateGazetteer}=require('./scripts/map-locations.cjs');
const cities=JSON.parse(fs.readFileSync('data/map-cities.json','utf8'));
const records=JSON.parse(fs.readFileSync('data/live-opportunities.json','utf8'));
const effective=require('./scripts/research-records.cjs').readRecords(__dirname);
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/catalog.js','utf8'),ctx);
const publicRecords=vm.runInContext('radarCatalog.records',ctx);

test('real accepting records produce sourced city markers while original audit data stays unmapped',()=>{
  validateGazetteer(cities);const selected=require('./dist/catalog-model.js').selectPublic(effective,JSON.parse(fs.readFileSync('data/settings.json')),new Date(vm.runInContext('radarCatalog.generatedAt',ctx)));assert.equal(publicRecords.length,selected.opportunities.length+selected.confirmedFuture.length);
  const reviewedCurrent=require('./dist/catalog-model.js').select(effective,JSON.parse(fs.readFileSync('data/settings.json')),new Date('2026-10-07T12:40:00Z')).opportunities;
  assert.ok(reviewedCurrent.filter(r=>cityLocation(r,cities)).length>30,'real reviewed data must produce useful map markers');
  assert.ok(records.every(r=>r.mapped===false&&r.lat===undefined&&r.lon===undefined));
  for(const r of publicRecords.filter(r=>r.mapLocation)) {
    assert.equal(r.mapLocation.precision,'city');assert.equal(r.mapLocation.locationEvidence,r.location);
    assert.equal(r.mapLocation.sourceUrl,r.verification.sourceUrl);
    assert.ok(cities.cities.some(c=>c.label===r.mapLocation.city&&c.country===r.country&&c.lat===r.mapLocation.lat&&c.lon===r.mapLocation.lon));
    assert.equal(r.verification.checkedAt,effective.find(x=>x.id===r.id).verification.checkedAt);
  }
});

test('remote, multiple-city, unspecified and unverified placements never receive invented city pins',()=>{
  const role={simulated:false,publicationApproved:true,country:'Australia',verification:{state:'verified',sourceUrl:'https://example.org/source'}};
  for(const location of ['Remote, Sydney','Sydney or Melbourne','Melbourne or Queensland; field travel required','Australia','Nominate Australian office','University of Sydney, School of Physics','Flexible Victorian location; hybrid'])assert.equal(cityLocation({...role,location},cities),null);
  assert.equal(cityLocation({...role,location:'Sydney',publicationApproved:false},cities),null);
  assert.equal(cityLocation({...role,location:'Sydney',country:'Canada'},cities),null);
  assert.equal(cityLocation({...role,location:'Sydney',verification:{state:'unverified'}},cities),null);
  assert.equal(cityLocation({...role,location:'Parkville, Melbourne; hybrid'},cities).city,'Melbourne');
});

test('only verified three-month openings are public while all future records remain offline',()=>{
  const html=fs.readFileSync('dist/index.html','utf8');
  assert.doesNotMatch(html,/id="(?:tab-recurring|panel-recurring)"/);
  assert.match(html,/id="tab-opening"/);assert.match(html,/id="download-future-csv"/);
  assert.equal(vm.runInContext('radarCatalog.publicScope',ctx),'current-and-upcoming');
  assert.ok(publicRecords.every(r=>['open','rolling','on-demand','interest-register','confirmed-future'].includes(r.status)));
  const model=require('./dist/catalog-model.js'),settings=JSON.parse(fs.readFileSync('data/settings.json','utf8'));
  assert.equal(model.select(records,settings,new Date('2026-10-06T23:24:08Z')).futureCompilation.length,86);
  const publicIds=new Set(publicRecords.map(r=>r.id));
  const publicFutureIds=new Set(vm.runInContext('radarCatalog.confirmedFuture',ctx).map(r=>r.id));
  for(const r of records.filter(r=>model.futureStatuses.includes(r.status)))assert.equal(publicIds.has(r.id),publicFutureIds.has(r.id));
});
