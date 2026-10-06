const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const code = fs.readFileSync(__dirname+'/dist/app.js','utf8');
test('organisation selection clears old filters, shows open results and respects reduced motion', () => {
  let renders=0, resets=0, focused=false, scroll, reduced=false;
  const state={catalog:'opening',selectedId:'other',query:'old search'};
  const opportunities=[{id:'a'},{id:'b'}], future=[{id:'later'}];
  const heading={focus(options){assert.equal(options.preventScroll,true);focused=true;}};
  const context=vm.createContext({state, opportunities,
    programmeById:id=>[...opportunities,...future].find(item=>item.id===id),
    resetFilters(){resets++;state.query='';state.directoryOrganisation=null;},render(){renders++;},
    document:{getElementById:id=>id==='organisation-filter-label' ? heading : ({scrollIntoView(options){scroll=options;},addEventListener(){}}),querySelector:()=>heading},
    window:{matchMedia:()=>({matches:reduced})}
  });
  vm.runInContext(code.slice(code.indexOf('function renderOrganisationFilter('),code.indexOf('function onCatalogTabKeydown(')),context);
  assert.equal(context.showOrganisationPrograms('Alpha',['a','later','a','missing']),true);
  assert.equal(state.query,'');assert.equal(state.catalog,'open');assert.equal(state.selectedId,null);
  assert.equal(state.directoryOrganisation.name,'Alpha');
  assert.deepEqual(Array.from(state.directoryOrganisation.programIds),['a','later']);
  assert.equal(resets,1);assert.equal(renders,1);assert.ok(focused);assert.equal(scroll.behavior,'smooth');
  reduced=true;context.showOrganisationPrograms('Beta',['b']);assert.equal(scroll.behavior,'auto');
  assert.equal(context.showOrganisationPrograms('Future only',['later']),false);
  assert.equal(state.directoryOrganisation.name,'Beta');
  vm.runInContext(code.slice(code.indexOf('function passesFilters('),code.indexOf('function filteredCatalog(')),context);
  Object.assign(state,{query:'',paid:'All',region:'All',type:'All',eligibility:'All',sector:'All',citizenship:'All',studyYear:'All'});
  assert.equal(context.passesFilters({id:'a'}),false);assert.equal(context.passesFilters({id:'b'}),true);
  state.query='no match';assert.equal(context.passesFilters({id:'b'}),false);
  state.query='';context.resetFilters();assert.equal(context.passesFilters({id:'a'}),true);
});
