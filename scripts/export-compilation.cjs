const fs = require('node:fs');
const path = require('node:path');
const model = require('../dist/catalog-model.js');
const exporter = require('../dist/catalog-export.js');
const root = path.join(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const settings = read('settings.json');
if (settings.mode !== 'live') throw new Error('Research compilation requires live mode; simulated fixtures cannot be exported as research.');
const registry = read('organisations.json');
const records = read('live-opportunities.json');
model.validate(records, registry, settings);
const now = new Date();
const catalog = model.select(records, settings, now);
const output = path.resolve(process.argv[2] || path.join(root, 'outputs'));
fs.mkdirSync(output, {recursive:true});
fs.writeFileSync(path.join(output, 'verified-open-opportunities.csv'), exporter.currentCsv(catalog.opportunities, registry));
fs.writeFileSync(path.join(output, 'future-opportunities-compilation.csv'), exporter.futureCsv(catalog.futureCompilation, registry));
fs.writeFileSync(path.join(output, 'future-opportunities-compilation.json'), JSON.stringify({
  generatedAt: now.toISOString(), timeZone: settings.timeZone,
  scope: 'All future dates, including recurring unconfirmed and records held for recheck. No automatic promotion to open.',
  confirmedFuture: catalog.confirmedFuture.length, recurringUnconfirmed: catalog.recurringUnconfirmed.length,
  heldFuture: catalog.futureCompilation.filter(item => item.publicationState === 'held').length,
  records: catalog.futureCompilation
}, null, 2) + '\n');
console.log(`${catalog.opportunities.length} verified open; ${catalog.futureCompilation.length} future planning records exported to ${output}`);
