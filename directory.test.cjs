const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = file => fs.readFileSync(__dirname + '/' + file, 'utf8');
function render(organisations) {
  const elements = {};
  const document = {getElementById(id) {return elements[id] ||= {value:'',addEventListener(){}};}};
  vm.runInNewContext(read('dist/directory.js'), {
    radarCatalog:{settings:{mode:'demo'},generatedAt:'2026-10-06'},
    radarRegistry:{sectors:[{id:'test',label:'Test'}],organisations},
    opportunities:[], openingSoon:[], confirmedFuture:[], futureCompilation:[], URL, document,
    escapeHtml:text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  });
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
