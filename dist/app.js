// Recheck live-record freshness and deadlines on each visit, even between builds.
const currentCatalog = typeof RadarModel === "undefined" || !radarCatalog.settings
  ? radarCatalog : RadarModel.select(radarCatalog.records || [...radarCatalog.opportunities, ...(radarCatalog.futureCompilation || radarCatalog.openingSoon || [])], radarCatalog.settings);
const opportunities = currentCatalog.opportunities;
const openingSoon = currentCatalog.openingSoon;
const confirmedFuture = currentCatalog.confirmedFuture || openingSoon || [];
const futureCompilation = currentCatalog.futureCompilation || confirmedFuture;
const typeOrder = typeof RadarModel === 'undefined' ? ["Cadetship", "Internship", "Vacationer Program", "Summer Vacation", "Industry Placement", "Scholarship", "Research assistantship", "Fellowship", "Training", "Tutoring / Casual Academic", "Other", "Graduate Program", "Graduate Job"] : RadarModel.types;

const openStatuses = new Set(["open", "rolling", "on-demand", "interest-register"]);

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function addCalendarMonths(date, months) {
  const monthIndex = date.getMonth() + months;
  const last = new Date(date.getFullYear(), monthIndex + 1, 0).getDate();
  return new Date(date.getFullYear(), monthIndex, Math.min(date.getDate(), last));
}

function catalogToday() {
  return typeof RadarModel === "undefined" ? new Date() : parseIsoDate(RadarModel.dateKey(new Date(), radarCatalog.settings?.timeZone || 'Australia/Sydney'));
}

function isOpeningSoon(item, today = catalogToday()) {
  if (!item || openStatuses.has(item.status)) return false;
  if (!item.opensOn && item.expectedOpensFrom && item.expectedOpensBy) {
    const from = parseIsoDate(item.expectedOpensFrom), to = parseIsoDate(item.expectedOpensBy);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return !!from && !!to && to >= start && from <= addCalendarMonths(start, 3);
  }
  const opens = parseIsoDate(item.opensOn);
  if (!opens || !(today instanceof Date) || Number.isNaN(today.getTime())) return false;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = addCalendarMonths(start, 3);
  return opens.getTime() >= start.getTime() && opens.getTime() <= end.getTime();
}

function sourceLabel(item) {
  if (item?.simulated) return "Simulated · not verified";
  const reviewed = parseIsoDate(item?.reviewedAt);
  if (item?.publicationState === 'held') return reviewed ? `Last recorded check ${formatOpeningDate(item.reviewedAt)} - needs recheck` : 'Verification pending - availability unconfirmed';
  if (item?.publicationState === 'recurring-unconfirmed' && reviewed) return `Programme source reviewed ${formatOpeningDate(item.reviewedAt)} - next intake unconfirmed`;
  if (reviewed) return `Official source reviewed ${formatOpeningDate(item.reviewedAt)}`;
  return item?.source || "Review date not recorded";
}

function provenanceMarkup(item) {
  if (item.simulated) return '';
  const evidence = item.verification;
  if (!evidence) return '<p>Source verification is pending. Availability is unconfirmed.</p>';
  const sources = [{url:evidence.sourceUrl,claim:'Primary official source'}, ...(evidence.sources || [])]
    .filter(source => typeof source.url === 'string' && source.url.startsWith('https://'));
  return `<details class="source-evidence"><summary>Sources and verification</summary>
    <p>${escapeHtml(sourceLabel(item))}${evidence.checkedAt ? ` (${escapeHtml(evidence.checkedAt)})` : ''}</p>
    <p>${escapeHtml(evidence.notes || 'Verification notes not recorded.')}</p>
    ${evidence.audienceEvidence ? `<p><strong>Australian audience:</strong> ${escapeHtml(evidence.audienceEvidence)}</p>` : ''}
    <ul>${sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.claim)}</a></li>`).join('')}</ul>
    </details>`;
}

function futureStatusLabel(item) {
  if (item.publicationState === 'held') return 'Needs recheck - availability unconfirmed';
  if (item.publicationState === 'recurring-unconfirmed' || item.status === 'recurring-unconfirmed') return 'Recurring programme - next intake unconfirmed';
  return /expected/i.test(item.openingWindow || '') ? 'Officially announced expected window - applications not verified open' : 'Confirmed future opening - applications not verified open';
}

function futureOpeningLabel(item) {
  const prefix = item.publicationState === 'held' ? 'Previously reported: ' : '';
  if (item.opensOn) return `${prefix}${formatOpeningDate(item.opensOn)}`;
  if (item.opensFrom) return `${prefix}${item.openingWindow || `${formatOpeningDate(item.opensFrom)} - ${formatOpeningDate(item.opensBy)}`}`;
  if (item.openingWindow) return `${prefix}${item.openingWindow}`;
  if (item.expectedWindow) return `Indicative only: ${item.expectedWindow}; next intake unconfirmed`;
  if (item.expectedOpensFrom) return `Indicative only: ${formatOpeningDate(item.expectedOpensFrom)} - ${formatOpeningDate(item.expectedOpensBy)}; next intake unconfirmed`;
  return 'Next opening date not confirmed';
}

const deadlineMonths = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

function calendarDate(year, month, day) {
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function datesInDeadline(value) {
  const found = [];
  if (!value) return found;
  const dayFirst = /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/gi;
  const monthFirst = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi;
  let match;
  while ((match = dayFirst.exec(value))) {
    const date = calendarDate(Number(match[3]), deadlineMonths[match[2].toLowerCase()], Number(match[1]));
    if (date) found.push(date);
  }
  while ((match = monthFirst.exec(value))) {
    const date = calendarDate(Number(match[3]), deadlineMonths[match[1].toLowerCase()], Number(match[2]));
    if (date) found.push(date);
  }
  return found;
}

function closingDeadline(item) {
  if (!item) return null;
  const exact = parseIsoDate(item.deadlineOn) || parseIsoDate(typeof item.deadline === "string" ? item.deadline.trim() : "");
  if (exact) return exact;
  const dates = datesInDeadline(item.deadline);
  if (!dates.length) return null;
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates[0];
}

function isClosingSoon(item, today = catalogToday()) {
  const deadline = closingDeadline(item);
  const now = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  if (!deadline) return false;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 14);
  return deadline.getTime() >= start.getTime() && deadline.getTime() <= end.getTime();
}

function closingSoonBadge(item, today = catalogToday()) {
  return isClosingSoon(item, today) ? `<span class="closing-soon">Closing soon</span>` : "";
}

// Same pin rule as the open catalogue: coordinates are required, and online, global, or explicitly unmapped programmes stay off the globe.
function isPinned(item) {
  return !!item
    && item.mapped !== false
    && item.publicationState !== "held"
    && item.region !== "Online"
    && item.country !== "Global"
    && Number.isFinite(item.lat)
    && Number.isFinite(item.lon);
}

function programmesOpeningSoon(today = catalogToday(), records = openingSoon) {
  const openIds = new Set(opportunities.map((item) => item.id));
  return records
    .filter((item) => item && item.id && !openIds.has(item.id) && isOpeningSoon(item, today))
    .sort((a, b) => String(a.opensOn || a.expectedOpensFrom).localeCompare(String(b.opensOn || b.expectedOpensFrom))
      || String(a.organisation || "").localeCompare(String(b.organisation || ""))
      || String(a.program || "").localeCompare(String(b.program || "")));
}

function formatOpeningDate(value) {
  const date = parseIsoDate(value);
  if (!date) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function organisationLabel(item) { return item.displayOrganisation || item.organisation; }
function typeLabel(item) { return item.typeDetails || item.type; }

function openingSoonRow(item) {
  const opens = futureOpeningLabel(item);
  const url = typeof item.url === "string" && item.url.startsWith("https://") ? item.url : "";
  const pinned = isPinned(item);
  const active = item.id === state.selectedId ? " active" : "";
  return `<article class="result${active}" id="opportunity-${escapeHtml(item.id)}" tabindex="0">
    <details class="program-disclosure">
    <summary class="program-row">
      <h3>${escapeHtml(item.program)}${item.simulated ? `<span class="demo-pill">Simulated</span>` : ""}</h3>
      <span class="row-organisation">${escapeHtml(organisationLabel(item))}</span>
      <span class="pill">${escapeHtml(typeLabel(item))}</span>
      <span class="row-location">${escapeHtml(item.location || "")}</span>
      <span class="row-reviewed opens-date">${escapeHtml(opens)}</span>
    </summary>
    <div class="program-body">
      <p class="availability-note">${escapeHtml(futureStatusLabel(item))}</p>
      ${item.holdReason ? `<p>Held for review: ${escapeHtml(item.holdReason.replaceAll('-', ' '))}. Retained for planning; recheck the official source.</p>` : ''}
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      <dl class="opportunity-facts">
        <div><dt>Opening window</dt><dd>${escapeHtml(opens)}</dd></div>
        ${item.location ? `<div><dt>Location</dt><dd>${escapeHtml(item.location)}</dd></div>` : ""}
        ${item.deadline ? `<div><dt>Deadline / status</dt><dd>${escapeHtml(item.deadline)}</dd></div>` : ""}
        <div><dt>Pay / funding</dt><dd>${escapeHtml(item.fundingDetails || item.paid)}</dd></div>
        <div><dt>Year of study</dt><dd>${escapeHtml(item.studyYear)}</dd></div>
        <div><dt>Citizenship / work rights</dt><dd>${escapeHtml(item.citizenshipDetails || item.citizenship)}</dd></div>
      </dl>
      <div class="application-detail"><h4>Who can apply</h4><p>${escapeHtml(item.eligibilityDetails)}</p></div>
      <div class="application-detail"><h4>Application details</h4><p>${escapeHtml(item.application)}</p></div>
      ${item.openingEvidence ? `<p>${escapeHtml(item.openingEvidence)}</p>` : ''}
      ${provenanceMarkup(item)}
      ${url || pinned ? `<div class="opportunity-actions">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official programme details</a>` : ""}${pinned ? `<button class="locate-program" type="button">View on globe</button>` : ""}</div>` : ""}
    </div>
    </details>
  </article>`;
}

function openingSoonMarkup(items) {
  if (!items.length) {
    return `<p class="opening-empty">No reviewed programmes have a confirmed future opening right now. Future openings will be retained across all dates.</p>`;
  }
  return items.map(openingSoonRow).join("");
}

const state = {
  directoryOrganisation: null,
  query: "",
  region: "All",
  type: "All",
  eligibility: "All",
  paid: "All",
  profile: null,
  homeRegion: "",
  needsInternational: false,
  needsFunded: false,
  interests: new Set(),
  selectedId: null,
  mapReady: false,
  catalog: "open",
  sector: "All", citizenship: "All", studyYear: "All"
};

const els = {
  canvas: document.getElementById("globe"),
  query: document.getElementById("query"),
  sectorFilter: document.getElementById("sector-filter"),
  citizenshipFilter: document.getElementById("citizenship-filter"),
  studyYearFilter: document.getElementById("study-year-filter"),
  regionFilter: document.getElementById("region-filter"),
  typeFilter: document.getElementById("type-filter"),
  eligibilityFilter: document.getElementById("eligibility-filter"),
  paidFilter: document.getElementById("paid-filter"),
  homeRegion: document.getElementById("home-region"),
  needsInternational: document.getElementById("needs-international"),
  needsFunded: document.getElementById("needs-funded"),
  interestChips: document.getElementById("interest-chips"),
  detail: document.getElementById("detail-card"),
  selectionStrip: document.getElementById("selection-strip"),
  legendSelected: document.getElementById("legend-selected"),
  openingSoonHead: document.getElementById("opening-soon-head"),
  openingSoonList: document.getElementById("opening-soon-list"),
  tabOpen: document.getElementById("tab-open"),
  tabOpening: document.getElementById("tab-opening"),
  tabRecurring: document.getElementById("tab-recurring"),
  panelOpen: document.getElementById("panel-open"),
  panelOpening: document.getElementById("panel-opening"),
  panelRecurring: document.getElementById("panel-recurring"),
  recurringList: document.getElementById("recurring-list"),
  recurringCount: document.getElementById("recurring-count"),
  openCount: document.getElementById("open-count"),
  openingCount: document.getElementById("opening-count"),
  results: document.getElementById("results"),
  scanCount: document.getElementById("scan-count"),
  reset: document.getElementById("reset-filters")
};

let map;
let popup;
const markerLayers = [];
let mapMarkers = [];

function separateDots(points, gap = 23) {
  const placed = [];
  return points.map(point => {
    let x = point.x, y = point.y;
    for (let step = 0; placed.some(other => Math.hypot(x - other.x, y - other.y) < gap); step++) {
      const radius = gap * Math.sqrt(step + 1);
      const angle = step * 2.399963229728653;
      x = point.x + Math.cos(angle) * radius;
      y = point.y + Math.sin(angle) * radius;
    }
    placed.push({ x, y });
    return [x - point.x, y - point.y];
  });
}

function layoutDots() {
  if (!state.mapReady) return;
  // Keep geographic positions at overview zooms; separate co-located pins only up close.
  if (map.getZoom() < 10) {
    markerLayers.forEach(id => map.setPaintProperty(id, "circle-translate", [0, 0]));
    return;
  }
  const sourceItems = state.catalog === "opening" ? filteredFuture() : state.catalog === "recurring" ? filteredUnconfirmed() : filteredItems();
  const items = sourceItems.filter(item => markerLayers.includes("pin-" + item.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const offsets = separateDots(items.map(item => map.project([item.lon, item.lat])));
  items.forEach((item, index) => map.setPaintProperty("pin-" + item.id, "circle-translate", offsets[index]));
}

function unique(key) {
  return [...new Set([...opportunities, ...futureCompilation].map((item) => item[key]).filter(Boolean))].sort();
}

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function fundingCategory(item) {
  if (/^(?:No|Unpaid)\b/i.test(item.paid || "")) return "No";
  if (/\bFree\b/i.test(item.paid || "")) return "Free";
  if (/\b(?:Paid|stipend|Scholarship|Prize|grant)\b/i.test(item.paid || "")) return "Paid";
  return "Not stated";
}

function matchScore(item) {
  if (!state.profile) return null;
  const profile = state.profile;
  let score = 30;
  if (profile.interests.has(item.type)) score += 22;
  if (item.region === profile.homeRegion || item.country === profile.homeRegion) score += 18;
  if (profile.needsInternational && ['Yes', 'Some restrictions'].includes(item.eligibility)) score += 14;
  if (!profile.needsInternational) score += 6;
  if (profile.needsFunded && ["Paid", "Free"].includes(fundingCategory(item))) score += 14;
  if (/Rolling|Applications open|Apply early/i.test(item.deadline)) score += 6;
  return Math.min(score, 99);
}

function passesFilters(item) {
  const haystack = `${item.displayOrganisation || ''} ${item.sector} ${item.studyYear} ${item.country} ${item.region} ${item.organisation} ${item.program} ${item.type} ${item.deadline} ${item.paid} ${item.description} ${item.location} ${item.eligibilityDetails} ${item.application}`.toLowerCase();
  const paidPass =
    state.paid === "All" ||
    state.paid === fundingCategory(item);
  return (
    (!state.directoryOrganisation || state.directoryOrganisation.programIds.includes(item.id)) &&
    (!state.query || haystack.includes(state.query.toLowerCase())) &&
    (state.region === "All" || item.region === state.region) &&
    (state.type === "All" || item.type === state.type) &&
    (state.eligibility === "All" || item.eligibility === state.eligibility) &&
    (state.sector === "All" || item.sector === state.sector) &&
    (state.citizenship === "All" || item.citizenship === state.citizenship) &&
    (state.studyYear === "All" || item.studyYear === state.studyYear) &&
    paidPass
  );
}

function filteredCatalog(records) {
  const items = records.filter(passesFilters).sort((a, b) => {
    const sectors = typeof radarRegistry === "undefined" ? [] : radarRegistry.sectors.map(sector => sector.id);
    return sectors.indexOf(a.sector) - sectors.indexOf(b.sector)
      || typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
      || String(a.deadlineOn || "9999").localeCompare(String(b.deadlineOn || "9999"))
      || a.organisation.localeCompare(b.organisation);
  });
  if (!state.profile) return items;
  return items
    .map((item) => ({ ...item, score: matchScore(item) }))
    .sort((a, b) => b.score - a.score || typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
}

function filteredItems() {
  return filteredCatalog(opportunities);
}

function filteredOpeningSoon() {
  return filteredCatalog(programmesOpeningSoon());
}

function filteredFuture() {
  return filteredCatalog(confirmedFuture);
}

function filteredUnconfirmed() {
  return filteredCatalog(futureCompilation.filter(item => item.publicationState !== 'confirmed-future'
    && !confirmedFuture.some(confirmed => confirmed.id === item.id)));
}

function activeProgrammes() {
  return state.catalog === "opening" ? filteredFuture() : state.catalog === "recurring" ? filteredUnconfirmed() : filteredItems();
}

function mapFeaturesFor(items) {
  return {
    type: "FeatureCollection",
    features: items.filter(isPinned).map(item => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.lon, item.lat] },
      properties: { id: item.id, selected: item.id === state.selectedId }
    }))
  };
}

function syncMap() {
  const items = activeProgrammes();
  els.scanCount.textContent = items.length;
  const data = mapFeaturesFor(items);
  mapMarkers = data.features.map(feature => feature.properties.id);
  if (!state.mapReady) return;
  map.getSource("programs").setData(data);
  items.filter(isPinned).forEach(addProgramPin);
  layoutDots();
}

function focusProgram(item) {
  state.selectedId = item.id;
  popup?.remove();
  render();
  document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (map && isPinned(item)) {
    map.flyTo({ center: [item.lon, item.lat], zoom: 10, duration: 1400 });
  }
}

function addProgramPin(item) {
  const layerId = "pin-" + item.id;
  if (markerLayers.includes(layerId)) return;
  markerLayers.push(layerId);
  map.addLayer({
    id: layerId, type: "circle", source: "programs",
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], item.id]],
    paint: {
      "circle-radius": ["case", ["get", "selected"], 8, 6],
      "circle-color": ["case", ["get", "selected"], "#f19a3e", "#403233"],
      "circle-translate-anchor": "viewport",
      "circle-stroke-color": "#b9ffb7", "circle-stroke-width": 2
    }
  });
  map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
  map.on("click", layerId, () => showOpportunityCard(item));
}

function showOpportunityCard(item) {
  state.selectedId = item.id;
  popup?.remove();
  render();
  const card = document.getElementById("opportunity-" + item.id);
  if (!card) return;
  card.querySelector("details").open = true;
  card.focus({ preventScroll: true });
  card.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "center"
  });
}

function initMap() {
  const status = document.getElementById("map-status");
  try {
    map = new maplibregl.Map({
      container: "globe",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [134, -26],
      zoom: window.innerWidth < 720 ? 2 : 3,
      minZoom: -0.7,
      maxZoom: 16,
      cooperativeGestures: true,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true }
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");
    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      for (const layer of map.getStyle().layers) {
        if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#b9ffb7");
        if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", /water/i.test(layer.id) ? "#98d9c2" : "#b9ffb7");
        if (layer.type === "line" && /boundary|border/i.test(layer.id)) map.setPaintProperty(layer.id, "line-color", "#658978");
        if (layer.type === "symbol" && layer.layout?.["text-field"]) {
          map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]);
          map.setLayoutProperty(layer.id, "text-letter-spacing", 0);
          map.setLayoutProperty(layer.id, "text-allow-overlap", false);
          map.setLayoutProperty(layer.id, "text-ignore-placement", false);
        }
      }
      map.addSource("programs", {
        type: "geojson", cluster: true, clusterRadius: 50, clusterMaxZoom: 9,
        data: { type: "FeatureCollection", features: [] }
      });
      map.addLayer({
        id: "program-clusters", type: "circle", source: "programs",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 30, 28],
          "circle-color": "#403233", "circle-stroke-color": "#b9ffb7", "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "program-cluster-count", type: "symbol", source: "programs",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13,
          "text-font": ["Noto Sans Bold"], "text-allow-overlap": true },
        paint: { "text-color": "#ffffff" }
      });
      map.on("mouseenter", "program-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "program-clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "program-clusters", async event => {
        const feature = event.features?.[0];
        if (!feature) return;
        const source = map.getSource("programs");
        try {
          const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
          map.easeTo({ center: feature.geometry.coordinates, zoom: Math.min(zoom, 10),
            duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650 });
        } catch { /* A filter change may replace the cluster while its zoom is resolving. */ }
      });
      opportunities.filter(isPinned).forEach(addProgramPin);
      programmesOpeningSoon().filter(isPinned).forEach(addProgramPin);
      state.mapReady = true;
      syncMap();
    });
    map.on("move", layoutDots);
    map.on("resize", layoutDots);
    map.on("idle", () => { status.hidden = true; });
    map.on("error", () => {
      status.textContent = "Map connection interrupted. Reload to try again.";
      status.hidden = false;
    });
    document.getElementById("world-view").addEventListener("click", () => {
      popup?.remove();
      map.flyTo({ center: [134, -26], zoom: window.innerWidth < 720 ? 2 : 3, bearing: 0, pitch: 0, duration: 1000 });
    });
    new ResizeObserver(() => map.resize()).observe(els.canvas);
  } catch (error) {
    status.textContent = "Map could not load. Reload to try again.";
  }
}

function renderChips() {
  els.interestChips.innerHTML = "";
  typeOrder.forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${state.interests.has(type) ? "active" : ""}`;
    button.textContent = type;
    button.addEventListener("click", () => {
      if (state.interests.has(type)) state.interests.delete(type);
      else state.interests.add(type);
      render();
    });
    els.interestChips.appendChild(button);
  });
}

function programmeById(id) {
  if (!id) return null;
  return opportunities.find((candidate) => candidate.id === id)
    || futureCompilation.find((candidate) => candidate.id === id)
    || null;
}

function renderDetail() {
  const item = programmeById(state.selectedId);
  if (els.legendSelected) els.legendSelected.hidden = !item;
  if (els.selectionStrip) els.selectionStrip.hidden = !item;
  if (!item) { els.detail.innerHTML = ""; return; }
  const score = matchScore(item);
  els.detail.innerHTML = `<p class="eyebrow">${escapeHtml(sourceLabel(item))}</p>
    <h2>${escapeHtml(organisationLabel(item))}</h2><p><strong>${escapeHtml(item.program)}</strong></p>
    <div class="detail-meta"><span class="pill">${escapeHtml(typeLabel(item))}</span>
      <span class="pill">${escapeHtml(item.location)}</span>
      ${score === null ? "" : `<span class="pill">${score}% profile fit</span>`}</div>
    <p>${escapeHtml(item.description)}</p>`;
}

function renderResults() {
  const items = filteredItems();
  els.results.innerHTML = "";
  if (!items.length) {
    els.results.innerHTML = opportunities.length
      ? `<article class="result empty-state"><h3>No matches yet</h3><p>Try broadening the sector, location, type or eligibility filters.</p></article>`
      : `<article class="result empty-state"><h3>No verified opportunities to show</h3><p>New listings will appear after their application status has been checked.</p></article>`;
    return;
  }
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = `result ${item.id === state.selectedId ? "active" : ""}`;
    card.id = "opportunity-" + item.id;
    card.tabIndex = 0;
    const reviewed = sourceLabel(item), soon = item.simulated ? "" : closingSoonBadge(item);
    const register = item.status === 'interest-register';
    const url = !item.simulated && typeof item.url === "string" && item.url.startsWith("https://") ? item.url : "";
    const sectors = typeof radarRegistry === "undefined" ? [] : radarRegistry.sectors;
    const sector = sectors.find(sector => sector.id === item.sector)?.label || item.sector || "";
    card.innerHTML = `<details class="program-disclosure"><summary class="program-row">
      <h3>${escapeHtml(item.program)}${item.simulated ? `<span class="demo-pill">Simulated</span>` : register ? '<span class="pill">Interest register / enquiry</span>' : soon}</h3>
      <span class="row-organisation">${escapeHtml(organisationLabel(item))}</span>
      <span class="pill">${escapeHtml(typeLabel(item))}</span>
      <span class="row-location">${escapeHtml(item.location)}</span>
      <span class="row-reviewed">${escapeHtml(reviewed.replace(/^Official source reviewed /, ""))}</span>
      </summary><div class="program-body"><p>${escapeHtml(item.description)}</p>
      ${register ? '<p class="availability-note">Accepting an interest register, roster, pool or initial enquiry. A placement or admission is not guaranteed.</p>' : ''}
      ${item.country !== 'Australia' && item.eligibility === 'Some restrictions' ? `<p class="availability-note">Conditional overseas access: ${escapeHtml(item.citizenshipDetails || item.verification?.audienceEvidence || item.eligibilityDetails)}</p>` : ''}
      <dl class="opportunity-facts">
        <div><dt>Sector</dt><dd>${escapeHtml(sector)}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(item.location)}</dd></div>
        <div><dt>Duration</dt><dd>${escapeHtml(item.duration)}</dd></div>
        <div><dt>Pay / funding</dt><dd>${escapeHtml(item.fundingDetails || item.paid)}</dd></div>
        <div><dt>Deadline / status</dt><dd>${escapeHtml(item.deadline)}${soon}</dd></div>
        <div><dt>Citizenship / work rights</dt><dd>${escapeHtml(item.citizenshipDetails || item.citizenship || "Not stated")}${item.simulated ? " (simulated)" : ""}</dd></div>
        <div><dt>Year of study</dt><dd>${escapeHtml(item.studyYear || "Not stated")}${item.simulated ? " (simulated)" : ""}</dd></div>
      </dl><div class="application-detail"><h4>Who can apply</h4><p>${escapeHtml(item.eligibilityDetails)}</p></div>
      <div class="application-detail"><h4>Application details</h4><p>${escapeHtml(item.application)}</p></div>
      ${provenanceMarkup(item)}
      <div class="opportunity-actions">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official application details ↗</a>` : `<strong class="simulation-note">Simulated listing · applications unavailable</strong>`}
        ${isPinned(item) ? `<button class="locate-program" type="button">View on map</button>` : ""}<small>${escapeHtml(reviewed)}</small></div>
      </div></details>${state.profile ? `<div class="score"><span>${item.score}% profile fit</span></div>` : ""}`;
    bindProgramCard(card, item);
    els.results.appendChild(card);
  });
}

function bindProgramCard(card, item) {
  const select = () => {
    focusProgram(item);
  };
  card.addEventListener("click", (event) => {
    if (event.target.closest(".locate-program")) select();
    if (!event.target.closest("a, button, summary, input")) select();
  });
  card.addEventListener("keydown", (event) => {
    if (event.target !== card) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); }
  });
}

function bindOpeningCards(items) {
  items.forEach((item) => {
    const card = document.getElementById("opportunity-" + item.id);
    if (!card || typeof card.addEventListener !== "function") return;
    bindProgramCard(card, item);
  });
}

function renderOpeningSoon() {
  const inWindow = confirmedFuture;
  const items = filteredFuture();
  if (els.openingSoonHead) els.openingSoonHead.hidden = items.length === 0;
  if (!els.openingSoonList) return;
  if (!items.length) {
    els.openingSoonList.innerHTML = inWindow.length
      ? `<article class="result"><h3>No matches yet</h3><p>Try broadening the region, type, or funding filters.</p></article>`
      : openingSoonMarkup([]);
    return;
  }
  els.openingSoonList.innerHTML = openingSoonMarkup(items);
  bindOpeningCards(items);
}

function renderUnconfirmed() {
  const items = filteredUnconfirmed();
  els.recurringList.innerHTML = items.length ? items.map(openingSoonRow).join('')
    : '<p class="opening-empty">No recurring or unconfirmed future programmes have been recorded yet.</p>';
  bindOpeningCards(items);
}

function renderTabs() {
  const opening = state.catalog !== "open";
  const download = document.getElementById("download-csv");
  if (download) {
    download.disabled = opening;
    download.title = opening ? "Use the separate future compilation download for planning records" : "Download the filtered current catalog";
  }
  [[els.tabOpen, els.panelOpen, state.catalog === 'open'], [els.tabOpening, els.panelOpening, state.catalog === 'opening'], [els.tabRecurring, els.panelRecurring, state.catalog === 'recurring']].forEach(([tab, panel, selected]) => {
    if (tab) {
      const value = selected ? "true" : "false";
      if (typeof tab.setAttribute === "function") tab.setAttribute("aria-selected", value);
      tab.ariaSelected = value;
      tab.tabIndex = selected ? 0 : -1;
    }
    if (panel) panel.hidden = !selected;
  });
  if (els.openCount) els.openCount.textContent = String(filteredItems().length);
  if (els.openingCount) els.openingCount.textContent = String(filteredFuture().length);
  if (els.recurringCount) els.recurringCount.textContent = String(filteredUnconfirmed().length);
  const scanLabel = document.getElementById('scan-label');
  if (scanLabel) scanLabel.textContent = radarCatalog.settings?.mode === 'demo' ? 'simulated programs' : state.catalog === 'open' ? 'accepting vacancies and registers' : state.catalog === 'opening' ? 'confirmed future programs' : 'unconfirmed planning records';
}

function selectCatalog(catalog) {
  const next = ['opening', 'recurring'].includes(catalog) ? catalog : "open";
  if (state.catalog === next) return;
  state.catalog = next;
  const visible = new Set(activeProgrammes().map((item) => item.id));
  if (state.selectedId && !visible.has(state.selectedId)) state.selectedId = null;
  render();
}

function renderOrganisationFilter() {
  const banner = document.getElementById('organisation-program-filter');
  if (!banner) return;
  banner.hidden = !state.directoryOrganisation;
  if (state.directoryOrganisation) {
    document.getElementById('organisation-filter-label').textContent = `Opportunities at ${state.directoryOrganisation.name}`;
  }
}

function showOrganisationPrograms(name, programIds) {
  const ids = [...new Set(programIds)].filter(id => programmeById(id));
  if (!ids.some(id => opportunities.some(item => item.id === id))) return false;
  resetFilters();
  state.directoryOrganisation = {name, programIds: ids};
  state.catalog = 'open';
  state.selectedId = null;
  render();
  if (window.location?.hash !== '#programs') window.history?.pushState(null, '', '#programs');
  const heading = document.getElementById('organisation-filter-label') || document.querySelector('#programs h2');
  if (heading) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
  (document.getElementById('organisation-program-filter') || document.getElementById('programs'))?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'
  });
  return true;
}

document.getElementById('clear-organisation-filter')?.addEventListener('click', resetFilters);

function onCatalogTabKeydown(event) {
  const tabs = [els.tabOpen, els.tabOpening, els.tabRecurring].filter(Boolean);
  const index = tabs.indexOf(event.currentTarget);
  if (index < 0) return;
  let nextIndex = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;
  event.preventDefault();
  const next = tabs[nextIndex];
  selectCatalog(next === els.tabOpening ? "opening" : next === els.tabRecurring ? 'recurring' : "open");
  if (typeof next.focus === "function") next.focus();
}

function render() {
  renderOrganisationFilter();
  document.getElementById("profile-summary").hidden = !state.profile;
  document.getElementById("clear-profile").hidden = !state.profile;
  document.getElementById("apply-profile").disabled = !(els.homeRegion.value || state.interests.size || els.needsInternational.checked || els.needsFunded.checked);
  document.getElementById("apply-profile").textContent = state.profile ? "Update profile" : "Apply profile";
  renderChips();
  renderDetail();
  renderTabs();
  renderResults();
  renderOpeningSoon();
  renderUnconfirmed();
  syncMap();
}

function applyProfile() {
  if (!(els.homeRegion.value || state.interests.size || els.needsInternational.checked || els.needsFunded.checked)) return;
  state.profile = {
    homeRegion: els.homeRegion.value,
    interests: new Set(state.interests),
    needsInternational: els.needsInternational.checked,
    needsFunded: els.needsFunded.checked
  };
  render();
}

function clearProfile() {
  state.profile = null;
  state.interests.clear();
  els.homeRegion.value = "";
  els.needsInternational.checked = false;
  els.needsFunded.checked = false;
  updateState();
}

function updateState() {
  state.query = els.query.value.trim();
  state.region = els.regionFilter.value;
  state.type = els.typeFilter.value;
  state.eligibility = els.eligibilityFilter.value;
  state.paid = els.paidFilter.value;
  state.sector = els.sectorFilter?.value || "All";
  state.citizenship = els.citizenshipFilter?.value || "All";
  state.studyYear = els.studyYearFilter?.value || "All";
  state.homeRegion = els.homeRegion.value;
  state.needsInternational = els.needsInternational.checked;
  state.needsFunded = els.needsFunded.checked;
  render();
}

function resetFilters() {
  state.directoryOrganisation = null;
  els.query.value = "";
  for (const control of [els.sectorFilter, els.citizenshipFilter, els.studyYearFilter]) if (control) control.value = "All";
  els.regionFilter.value = "All";
  els.typeFilter.value = "All";
  els.eligibilityFilter.value = "All";
  els.paidFilter.value = "All";
  updateState();
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const reportError = (error) => console.warn("WebMCP registration failed", error);
  const lifecycle = new AbortController();
  const filterSchema = {
    type: "object",
    properties: {
      query: { type: "string" },
      sector: { type: "string" }, citizenship: { type: "string" }, studyYear: { type: "string" },
      region: { type: "string" },
      type: { type: "string" },
      eligibility: { type: "string" },
      paid: { type: "string" }
    },
    additionalProperties: false
  };
  const profileSchema = {
    type: "object",
    properties: {
      homeRegion: { type: "string" },
      interests: { type: "array", items: { type: "string" } },
      needsInternational: { type: "boolean" },
      needsFunded: { type: "boolean" }
    },
    additionalProperties: false
  };
  const safeSet = (select, value) => {
    if (!value) return;
    const option = [...select.options].find((candidate) => candidate.value === value);
    if (option) select.value = value;
  };

  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: "filter_opportunities",
          title: "Filter opportunities",
          description: "Apply opportunity filters and return the current ranked result list.",
          inputSchema: filterSchema,
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input = {}) {
            if (typeof input.query === "string") els.query.value = input.query;
            safeSet(els.sectorFilter, input.sector);
            safeSet(els.citizenshipFilter, input.citizenship);
            safeSet(els.studyYearFilter, input.studyYear);
            safeSet(els.regionFilter, input.region);
            safeSet(els.typeFilter, input.type);
            safeSet(els.eligibilityFilter, input.eligibility);
            safeSet(els.paidFilter, input.paid);
            updateState();
            return { count: filteredItems().length, results: filteredItems().slice(0, 8).map(({ organisation, program, country, type, score }) => ({ organisation, program, country, type, ...(score == null ? {} : { score }) })) };
          }
        },
        { signal: lifecycle.signal }
      )
    ).catch(reportError);
    void Promise.resolve(
      context.registerTool(
        {
          name: "set_profile_match",
          title: "Set profile match",
          description: "Apply profile preferences explicitly supplied by the user and return matching opportunities. Do not infer or invent a profile.",
          inputSchema: profileSchema,
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input = {}) {
            if (!Object.keys(input).some(key => ["homeRegion", "interests", "needsInternational", "needsFunded"].includes(key))) return { error: "Provide profile preferences first." };
            safeSet(els.homeRegion, input.homeRegion);
            if (Array.isArray(input.interests)) {
              state.interests = new Set(input.interests.filter((item) => typeOrder.includes(item)));
            }
            if (typeof input.needsInternational === "boolean") els.needsInternational.checked = input.needsInternational;
            if (typeof input.needsFunded === "boolean") els.needsFunded.checked = input.needsFunded;
            updateState();
            applyProfile();
            return { topMatches: filteredItems().slice(0, 5).map(({ organisation, program, country, score }) => ({ organisation, program, country, score })) };
          }
        },
        { signal: lifecycle.signal }
      )
    ).catch(reportError);
  } catch (error) {
    reportError(error);
  }
}

fillSelect(els.regionFilter, unique("region"));
fillSelect(els.typeFilter, typeOrder);
if (els.studyYearFilter) fillSelect(els.studyYearFilter, unique("studyYear"));
if (els.sectorFilter && typeof radarRegistry !== "undefined") {
  radarRegistry.sectors.forEach(sector => {
    const option = document.createElement("option"); option.value = sector.id; option.textContent = sector.label;
    els.sectorFilter.appendChild(option);
  });
}

[els.query, els.sectorFilter, els.citizenshipFilter, els.studyYearFilter, els.regionFilter, els.typeFilter, els.eligibilityFilter, els.paidFilter, els.homeRegion, els.needsInternational, els.needsFunded].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", updateState);
  el.addEventListener("change", updateState);
});

els.reset.addEventListener("click", resetFilters);
[els.tabOpen, els.tabOpening, els.tabRecurring].filter(Boolean).forEach((tab) => {
  tab.addEventListener("click", () => selectCatalog(tab === els.tabOpening ? "opening" : tab === els.tabRecurring ? 'recurring' : "open"));
  tab.addEventListener("keydown", onCatalogTabKeydown);
});
document.getElementById("apply-profile").addEventListener("click", applyProfile);
document.getElementById("clear-profile").addEventListener("click", clearProfile);

if (typeof IntersectionObserver !== "undefined") {
  const sections = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      document.querySelectorAll("nav a").forEach(link => {
        if (link.getAttribute("href") === "#" + entry.target.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-15% 0px -65% 0px" });
  document.querySelectorAll("main > section").forEach(section => sections.observe(section));
}

render();
initMap();
registerWebMcpTools();
