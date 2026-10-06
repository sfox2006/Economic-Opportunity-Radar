const demoMode = radarCatalog.settings.mode === 'demo';
document.getElementById('download-csv').textContent = demoMode ? 'Download filtered samples ↓' : 'Download filtered open list ↓';
document.getElementById('demo-banner').hidden = !demoMode;
document.getElementById('open-tab-label').textContent = demoMode ? 'Sample opportunities' : 'Open now';
document.getElementById('scan-label').textContent = demoMode ? 'simulated programs' : 'verified programs';
document.getElementById('organisation-count').textContent = radarRegistry.organisations.length;
const built = new Date(radarCatalog.generatedAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric' });
document.getElementById('catalog-status').textContent = demoMode
  ? `Demonstration catalog · ${opportunities.length} simulated programs · prepared ${built}`
  : `Catalog built ${built} · listings checked within ${radarCatalog.settings.maxVerificationAgeDays} days · expired listings hidden automatically`;
const directory = document.getElementById('organisation-directory');
const orgQuery = document.getElementById('organisation-query');
function renderDirectory() {
  const query = orgQuery.value.trim().toLowerCase();
  let shown = 0;
  directory.innerHTML = radarRegistry.sectors.map(sector => {
    const orgs = radarRegistry.organisations.filter(org => org.sector === sector.id
      && `${org.name} ${sector.label}`.toLowerCase().includes(query));
    shown += orgs.length;
    if (!orgs.length) return '';
    return `<details class="sector-directory"${query ? ' open' : ''}>
      <summary><h3>${escapeHtml(sector.label)}</h3><span>${orgs.length} ${orgs.length === 1 ? 'organisation' : 'organisations'}</span></summary>
      <div class="organisation-grid">${orgs.map(org => {
        const count = opportunities.filter(item => item.organisationId === org.id).length;
        const url = org.careersUrl && org.careersUrl.startsWith('https://') ? org.careersUrl : '';
        return `<article class="organisation-card"><h4>${escapeHtml(org.name)}</h4>
          <p>${count} ${demoMode ? 'simulated' : 'verified open'} ${count === 1 ? 'opportunity' : 'opportunities'}</p>
          ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Reference careers page ↗</a>` : '<span class="missing-source">Careers URL not supplied</span>'}
          <small>Imported reference · not checked</small></article>`;
      }).join('')}</div></details>`;
  }).join('');
  document.getElementById('directory-count').textContent = `${shown} of ${radarRegistry.organisations.length} organisations`;
  if (!shown) directory.innerHTML = '<p class="empty-state">No organisations match that search.</p>';
}
orgQuery.addEventListener('input', renderDirectory);
renderDirectory();

// Spreadsheet-friendly CSV; upcoming records are deliberately excluded.
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function exportCsv(items) {
  const header = ['Data status', 'Sector', 'Organisation', 'Program name', 'Type', 'Deadline', 'Location', 'Duration', 'Paid?', 'Australian citizenship required?', 'Year of study eligibility', 'Notes', 'Apply URL', 'Last checked'];
  const rows = items.map(item => [item.simulated ? 'SIMULATED — NOT A REAL VACANCY' : 'Verified',
    radarRegistry.sectors.find(sector => sector.id === item.sector)?.label || item.sector,
    item.organisation, item.program, item.type, item.deadline, item.location, item.duration,
    item.paid, item.citizenship, item.studyYear, item.eligibilityDetails, item.simulated ? '' : item.url, item.simulated ? 'Not verified' : item.reviewedAt]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
document.getElementById('download-csv').addEventListener('click', () => {
  const blob = new Blob([exportCsv(filteredItems())], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${demoMode ? 'SIMULATED-' : ''}yen-opportunities-${RadarModel.dateKey()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// An open tab also retires live roles as checks or deadlines expire.
if (!demoMode) setInterval(() => {
  const next = RadarModel.select([...radarCatalog.opportunities, ...radarCatalog.openingSoon], radarCatalog.settings);
  const previousIds = [...opportunities, ...openingSoon].map(item => item.id).join('|');
  if ([...next.opportunities, ...next.openingSoon].map(item => item.id).join('|') === previousIds) return;
  opportunities.splice(0, opportunities.length, ...next.opportunities);
  openingSoon.splice(0, openingSoon.length, ...next.openingSoon);
  if (!programmeById(state.selectedId)) state.selectedId = null;
  render();
  renderDirectory();
}, 60000);
