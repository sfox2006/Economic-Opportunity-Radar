const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = file => fs.readFileSync(__dirname + '/' + file, 'utf8');
function render(organisations, opportunities = [], navigate = () => {}, futureCompilation = [], capture = () => {}) {
  const elements = {};
  const document = {getElementById(id) {return elements[id] ||= {value:'',addEventListener(event,handler){this[event]=handler;}};}};
  vm.runInNewContext(read('dist/directory.js'), {
    radarCatalog:{settings:{mode:'demo'},generatedAt:'2026-10-06'},
    radarRegistry:{sectors:[{id:'test',label:'Test'}],organisations},
    opportunities, openingSoon:[], confirmedFuture:[], futureCompilation, showOrganisationPrograms:navigate, URL, document,
    escapeHtml:text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  });
  capture(elements);
  return elements['organisation-directory'].innerHTML;
}
test('directory renders reviewed About/homepage links and handles unavailable websites safely', () => {
  const html = render([
    {name:'<Organisation>',sector:'test',website:{url:'https://example.org/about?q="<value>',type:'about'}},
    {name:'Home',sector:'test',website:{url:'https://example.net/',type:'home'}},
    ...[null,{url:'javascript:alert(1)'},{url:'https://user:secret@example.org/'}].map(website=>({name:'Unavailable',sector:'test',website}))
  ]);
  assert.match(html,/About us ↗/); assert.match(html,/Homepage ↗/);
  assert.match(html,/Official website unavailable/);
  assert.match(html,/&lt;Organisation&gt;/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.doesNotMatch(html,/javascript:|user:secret|Newsletter reference|<Organisation>/);
});
test('generated directory preserves all organisations and uses the reviewed link overlay', () => {
  const source = JSON.parse(read('data/organisations.json'));
  const websites = JSON.parse(read('data/organisation-websites.json'));
  const context = vm.createContext({});
  vm.runInContext(read('dist/organisations.js')+'\nthis.registry=radarRegistry;',context);
  const generated = context.registry.organisations;
  assert.equal(generated.length,source.organisations.length);
  for (const original of source.organisations) {
    assert.ok(Object.hasOwn(websites.organisations,original.name),original.name);
    const org = generated.find(item=>item.id===original.id);
    assert.equal(org.careersUrl,original.careersUrl);
    assert.equal(JSON.stringify(org.website),JSON.stringify(websites.organisations[original.name]));
  }
});

test('open links match organisation IDs, include their future records and ignore stale links', () => {
  let elements, selected;
  const orgs = [{id:'a',name:'Alpha',sector:'test'}, {id:'b',name:'Alpha Extra',sector:'test'}];
  const records = [{id:'open-a',organisationId:'a'}, {id:'open-b',organisationId:'b'}];
  render(orgs,records,(name,ids)=>{selected={name,ids};},[{id:'future-a',organisationId:'a'}],all=>{elements=all;});
  elements['organisation-directory'].click({target:{closest:()=>({dataset:{organisationPrograms:'a'}})},preventDefault(){}});
  assert.equal(selected.name,'Alpha');
  assert.deepEqual(Array.from(selected.ids),['open-a','future-a']);
  records.splice(0,1);
  let prevented=false;
  elements['organisation-directory'].click({target:{closest:()=>({dataset:{organisationPrograms:'a'}})},preventDefault(){prevented=true;}});
  assert.ok(prevented);
  assert.doesNotMatch(elements['organisation-directory'].innerHTML,/data-organisation-programs="a"/);
});

test('all directory entries have sourced profiles or an explicit verification gap', () => {
  const profiles = JSON.parse(fs.readFileSync(__dirname + '/data/organisation-profiles.json', 'utf8'));
  const source = JSON.parse(fs.readFileSync(__dirname + '/data/organisations.json', 'utf8'));
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(__dirname + '/dist/organisations.js', 'utf8')+'\nthis.registry=radarRegistry;',context);
  assert.equal(Object.keys(profiles.organisations).length,source.organisations.length);
  for (const org of source.organisations) {
    assert.ok(Object.hasOwn(profiles.organisations,org.name),org.name);
    const profile=profiles.organisations[org.name];
    const generated=context.registry.organisations.find(item=> item.id===org.id);
    assert.equal(JSON.stringify(generated.profile),JSON.stringify(profile));
    if (!profile) {assert.ok(profiles.unavailable.some(item=>item.name===org.name));continue;}
    assert.ok(profile.description.length > 40 && profile.description.length <= 450);
    const url=new URL(profile.sourceUrl);
    assert.equal(url.protocol,'https:');
    assert.equal(url.username+url.password,'');
    assert.match(profile.reviewedAt,/^\d{4}-\d{2}-\d{2}$/);
  }
});
