const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const code = fs.readFileSync(__dirname + '/dist/app.js', 'utf8');
let rendered = false, focused = false, scroll, reduced = false;
const disclosure = {open:false};
const state = {};
const ctx = vm.createContext({state, popup: null, render: () => {rendered = true;},
  document: {getElementById: id => {
    assert.ok(rendered); assert.equal(id, 'opportunity-test');
    return {querySelector: selector => {assert.equal(selector,'details');return disclosure;}, focus: options => {assert.equal(options.preventScroll,true);focused=true;},scrollIntoView: options=>{scroll=options;}};
  }}, window:{matchMedia:()=>({matches:reduced})}
});
vm.runInContext(code.slice(code.indexOf('function showOpportunityCard('),code.indexOf('function initMap(')),ctx);
ctx.showOpportunityCard({id:'test'});
assert.equal(state.selectedId,'test');assert.ok(focused);assert.equal(scroll.behavior,'smooth');
assert.equal(disclosure.open,true);
reduced=true;ctx.showOpportunityCard({id:'test'});assert.equal(scroll.behavior,'auto');
assert.ok(code.includes('map.on("click", layerId, () => showOpportunityCard(item))'));
assert.ok(code.includes('card.id = "opportunity-" + item.id'));
console.log('PASS: dots select, highlight, focus and scroll to matching cards; reduced motion respected.');
