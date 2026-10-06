/* Shared spreadsheet exports for the browser and final research compilation. */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) module.exports = exports;
  else root.RadarExport = exports;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function csv(header, rows) {
    return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  function sectorLabel(item, registry) {
    return registry.sectors.find(sector => sector.id === item.sector)?.label || item.sector;
  }
  function currentCsv(items, registry) {
    const header = ['Data status', 'Sector', 'Organisation', 'Program name', 'Type', 'Deadline', 'Location', 'Duration', 'Paid?', 'Australian citizenship required?', 'Year of study eligibility', 'Notes', 'Apply URL', 'Last checked', 'Official evidence URL', 'Verification notes'];
    const rows = items.filter(item => ['open', 'rolling', 'on-demand'].includes(item.status) && (item.publicationState === 'open' || item.simulated === true)).map(item => [
      item.simulated ? 'SIMULATED - NOT A REAL VACANCY' : 'Verified open', sectorLabel(item, registry),
      item.organisation, item.program, item.type, item.deadline, item.location, item.duration,
      item.paid, item.citizenship, item.studyYear, item.eligibilityDetails, item.simulated ? '' : item.url,
      item.simulated ? 'Not verified' : item.verification?.checkedAt || item.reviewedAt,
      item.simulated ? '' : item.verification?.sourceUrl, item.simulated ? '' : item.verification?.notes
    ]);
    return csv(header, rows);
  }
  function futureCsv(items, registry) {
    const header = ['Availability status', 'Held reason', 'Sector', 'Organisation', 'Program name', 'Type', 'Country', 'Location', 'Reported opens on - check availability status', 'Reported opens from - check availability status', 'Reported opens by - check availability status', 'Indicative window only', 'Expected from - unconfirmed', 'Expected by - unconfirmed', 'Deadline / status', 'Paid?', 'Year of study', 'Eligibility', 'Official programme URL', 'Last checked', 'Official evidence URL', 'Verification notes', 'Australian audience evidence', 'Other evidence sources'];
    const rows = items.filter(item => ['upcoming', 'confirmed-future', 'recurring-unconfirmed'].includes(item.status)).map(item => [
      item.simulated ? 'SIMULATED - NOT A REAL VACANCY' : item.publicationState === 'held' ? 'Held - needs recheck; availability unconfirmed' : item.publicationState === 'recurring-unconfirmed' || item.status === 'recurring-unconfirmed' ? 'Recurring - next intake unconfirmed' : item.publicationState === 'confirmed-future' ? 'Confirmed future - applications not verified open' : 'Unconfirmed future record',
      item.holdReason || '', sectorLabel(item, registry), item.organisation, item.program, item.type, item.country, item.location,
      item.opensOn || '', item.opensFrom || '', item.opensBy || '', item.expectedWindow || '', item.expectedOpensFrom || '', item.expectedOpensBy || '',
      item.deadline, item.paid, item.studyYear, item.eligibilityDetails, item.simulated ? '' : item.url,
      item.simulated ? 'Not verified' : item.verification?.checkedAt || '', item.simulated ? '' : item.verification?.sourceUrl || '',
      item.simulated ? '' : item.verification?.notes || '', item.simulated ? '' : item.verification?.audienceEvidence || '',
      item.simulated ? '' : (item.verification?.sources || []).map(source => `${source.claim}: ${source.url}`).join('; ')
    ]);
    return csv(header, rows);
  }
  return {csvCell, currentCsv, futureCsv};
});
