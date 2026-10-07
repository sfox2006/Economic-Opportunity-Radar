const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync(__dirname + '/dist/app.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(code.slice(code.indexOf('function separateDots('), code.indexOf('function layoutDots(')), context);
for (const points of [[], [{x:10,y:10}], Array.from({length:30},()=>({x:200,y:150})), [{x:0,y:0},{x:10,y:0},{x:200,y:200}]]) {
  const snapshot = JSON.stringify(points);
  const offsets = context.separateDots(points);
  assert.equal(offsets.length, points.length);
  assert.equal(JSON.stringify(points), snapshot);
  const positions = points.map((p,i)=>({x:p.x+offsets[i][0],y:p.y+offsets[i][1]}));
  positions.forEach((p,i)=>positions.slice(i+1).forEach(q=>assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=23-1e-8)));
  assert.equal(JSON.stringify(offsets),JSON.stringify(context.separateDots(points)));
}
assert.ok(code.includes('"circle-translate-anchor": "viewport"'));
assert.ok(!code.includes('queryRenderedFeatures'));
assert.match(code, /cluster: true, clusterRadius: 50, clusterMaxZoom: 9/);
assert.match(code, /getClusterExpansionZoom/);
assert.match(code, /point_count_abbreviated/);
let zoom = 2;
const paints = [];
const layoutContext = vm.createContext({
  state: {mapReady:true}, markerLayers:['pin-a','pin-b'],
  filteredItems:()=>[{id:'a',lon:0,lat:0},{id:'b',lon:0,lat:0}],
  map:{getZoom:()=>zoom,project:()=>({x:100,y:100}),setPaintProperty:(...args)=>paints.push(args)}
});
vm.runInContext(code.slice(code.indexOf('function separateDots('), code.indexOf('function unique(')), layoutContext);
vm.runInContext(code.slice(code.indexOf('function mapPosition('), code.indexOf('function isPinned(')), layoutContext);
layoutContext.layoutDots();
assert.ok(paints.every(p=>JSON.stringify(p[2])==='[0,0]'));
paints.length=0; zoom=10; layoutContext.layoutDots();
assert.ok(paints.some(p=>JSON.stringify(p[2])!=='[0,0]'));
paints.length=0; zoom=4; layoutContext.layoutDots();
assert.ok(paints.every(p=>JSON.stringify(p[2])==='[0,0]'));
console.log('PASS: numbered native clusters, expansion zoom, close-up individual separation and overview reset.');
