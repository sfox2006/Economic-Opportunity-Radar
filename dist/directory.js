const demoMode = radarCatalog.settings.mode === 'demo';
document.getElementById('download-csv').textContent = demoMode ? 'Download filtered samples ↓' : 'Download filtered open list ↓';
document.getElementById('demo-banner').hidden = !demoMode;
document.getElementById('open-tab-label').textContent = demoMode ? 'Sample opportunities' : 'Open now';
document.getElementById('scan-label').textContent = demoMode ? 'simulated programs' : 'verified open programs';
document.getElementById('organisation-count').textContent = radarRegistry.organisations.length;
const built = new Date(radarCatalog.generatedAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric' });
function renderCatalogStatus() {
  const unconfirmed = futureCompilation.filter(item => item.publicationState !== 'confirmed-future').length;
  document.getElementById('catalog-status').textContent = demoMode
    ? `Demonstration catalogue: ${opportunities.length} simulated programmes; prepared ${built}`
    : opportunities.length || futureCompilation.length
      ? `${opportunities.length} verified open; ${confirmedFuture.length} confirmed future; ${unconfirmed} unconfirmed planning records. Catalogue built ${built}. Open and confirmed future evidence is checked within ${radarCatalog.settings.maxVerificationAgeDays} days.`
      : 'Organisation coverage is being researched. Verified opportunities will appear after their application status is checked.';
}
renderCatalogStatus();
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
        const futureCount = confirmedFuture.filter(item => item.organisationId === org.id).length;
        const unconfirmedCount = futureCompilation.filter(item => item.organisationId === org.id && item.publicationState !== 'confirmed-future').length;
        const url = org.careersUrl && org.careersUrl.startsWith('https://') ? org.careersUrl : '';
        return `<article class="organisation-card"><h4>${escapeHtml(org.name)}</h4>
          <p>${count} ${demoMode ? 'simulated' : 'verified open'} ${count === 1 ? 'opportunity' : 'opportunities'}</p>
          ${futureCount || unconfirmedCount ? `<p>${futureCount} confirmed future; ${unconfirmedCount} unconfirmed planning records</p>` : ''}
          ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Reference careers page ↗</a>` : '<span class="missing-source">Careers URL not supplied</span>'}
          <small>${org.referenceVerification?.checkedAt ? `Reference URL checked ${escapeHtml(org.referenceVerification.checkedAt)}. Programme availability is recorded separately.` : 'Organisation from the source list - reference URL not checked. Programme availability is recorded separately.'}</small></article>`;
      }).join('')}</div></details>`;
  }).join('');
  document.getElementById('directory-count').textContent = `${shown} of ${radarRegistry.organisations.length} organisations`;
  if (!shown) directory.innerHTML = '<p class="empty-state">No organisations match that search.</p>';
}
orgQuery.addEventListener('input', renderDirectory);
renderDirectory();

// Spreadsheet-friendly CSV; future/held records have a separate compilation.
function exportCsv(items) { return RadarExport.currentCsv(items, radarRegistry); }
function exportFutureCsv(items) { return RadarExport.futureCsv(items, radarRegistry); }

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

document.getElementById('download-future-csv').addEventListener('click', () => {
  const blob = new Blob([exportFutureCsv(futureCompilation)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${demoMode ? 'SIMULATED-' : ''}yen-future-programmes-${RadarModel.dateKey()}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// An open tab also retires live roles as checks or deadlines expire.
if (!demoMode) setInterval(() => {
  const next = RadarModel.select(radarCatalog.records || [...radarCatalog.opportunities, ...(radarCatalog.futureCompilation || radarCatalog.openingSoon)], radarCatalog.settings);
  const signature = items => items.map(item => `${item.id}:${item.publicationState}:${item.holdReason || ''}`).join('|');
  if (signature([...next.opportunities, ...next.futureCompilation]) === signature([...opportunities, ...futureCompilation])) return;
  opportunities.splice(0, opportunities.length, ...next.opportunities);
  openingSoon.splice(0, openingSoon.length, ...next.openingSoon);
  confirmedFuture.splice(0, confirmedFuture.length, ...next.confirmedFuture);
  futureCompilation.splice(0, futureCompilation.length, ...next.futureCompilation);
  if (!programmeById(state.selectedId)) state.selectedId = null;
  render();
  renderDirectory();
  renderCatalogStatus();
}, 60000);
