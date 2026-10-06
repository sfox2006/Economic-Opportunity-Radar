const opportunities = radarCatalog.opportunities;
const openingSoon = radarCatalog.openingSoon;
const typeOrder = ["Internship", "Research assistantship", "Predoctoral program", "Fellowship", "Scholarship", "Summer school", "Conference", "Essay competition", "Online course", "Seminar"];

const openStatuses = new Set(["open", "rolling", "on-demand"]);

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

function isOpeningSoon(item, today = new Date()) {
  if (!item || openStatuses.has(item.status)) return false;
  const opens = parseIsoDate(item.opensOn);
  if (!opens || !(today instanceof Date) || Number.isNaN(today.getTime())) return false;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = addCalendarMonths(start, 3);
  return opens.getTime() >= start.getTime() && opens.getTime() <= end.getTime();
}

function sourceLabel(item) {
  const reviewed = parseIsoDate(item?.reviewedAt);
  if (reviewed) return `Official source reviewed ${formatOpeningDate(item.reviewedAt)}`;
  return item?.source || "Review date not recorded";
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

function isClosingSoon(item, today = new Date()) {
  const deadline = closingDeadline(item);
  const now = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  if (!deadline) return false;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 14);
  return deadline.getTime() >= start.getTime() && deadline.getTime() <= end.getTime();
}

function closingSoonBadge(item, today = new Date()) {
  return isClosingSoon(item, today) ? `<span class="closing-soon">Closing soon</span>` : "";
}

// Same pin rule as the open catalogue: coordinates are required, and online, global, or explicitly unmapped programmes stay off the globe.
function isPinned(item) {
  return !!item
    && item.mapped !== false
    && item.region !== "Online"
    && item.country !== "Global"
    && Number.isFinite(item.lat)
    && Number.isFinite(item.lon);
}

function programmesOpeningSoon(today = new Date(), records = openingSoon) {
  const openIds = new Set(opportunities.map((item) => item.id));
  return records
    .filter((item) => item && item.id && !openIds.has(item.id) && isOpeningSoon(item, today))
    .sort((a, b) => String(a.opensOn).localeCompare(String(b.opensOn))
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

function openingSoonRow(item) {
  const opens = formatOpeningDate(item.opensOn);
  const url = typeof item.url === "string" && item.url.startsWith("https://") ? item.url : "";
  const pinned = isPinned(item);
  const active = item.id === state.selectedId ? " active" : "";
  return `<article class="result${active}" id="opportunity-${escapeHtml(item.id)}" tabindex="0">
    <details class="program-disclosure">
    <summary class="program-row">
      <h3>${escapeHtml(item.program)}</h3>
      <span class="row-organisation">${escapeHtml(item.organisation)}</span>
      <span class="pill">${escapeHtml(item.type || "")}</span>
      <span class="row-location">${escapeHtml(item.country || "")}</span>
      <span class="row-reviewed opens-date">Opens ${escapeHtml(opens)}</span>
    </summary>
    <div class="program-body">
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      <dl class="opportunity-facts">
        <div><dt>Applications open</dt><dd>Opens ${escapeHtml(opens)}</dd></div>
        ${item.location ? `<div><dt>Location</dt><dd>${escapeHtml(item.location)}</dd></div>` : ""}
        ${item.deadline ? `<div><dt>Deadline / status</dt><dd>${escapeHtml(item.deadline)}</dd></div>` : ""}
      </dl>
      ${url || pinned ? `<div class="opportunity-actions">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official programme details</a>` : ""}${pinned ? `<button class="locate-program" type="button">View on globe</button>` : ""}</div>` : ""}
    </div>
    </details>
  </article>`;
}

function openingSoonMarkup(items) {
  if (!items.length) {
    return `<p class="opening-empty">No reviewed programmes have a confirmed opening date in the next three months right now.</p>`;
  }
  return items.map(openingSoonRow).join("");
}

const state = {
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
  catalog: "open"
};

const els = {
  canvas: document.getElementById("globe"),
  query: document.getElementById("query"),
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
  panelOpen: document.getElementById("panel-open"),
  panelOpening: document.getElementById("panel-opening"),
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
  const sourceItems = state.catalog === "opening" ? filteredOpeningSoon() : filteredItems();
  const items = sourceItems.filter(item => markerLayers.includes("pin-" + item.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const offsets = separateDots(items.map(item => map.project([item.lon, item.lat])));
  items.forEach((item, index) => map.setPaintProperty("pin-" + item.id, "circle-translate", offsets[index]));
}

function unique(key) {
  return [...new Set([...opportunities, ...openingSoon].map((item) => item[key]).filter(Boolean))].sort();
}

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function matchScore(item) {
  if (!state.profile) return null;
  const profile = state.profile;
  let score = 30;
  if (profile.interests.has(item.type)) score += 22;
  if (item.region === profile.homeRegion || item.country === profile.homeRegion) score += 18;
  if (profile.needsInternational && item.eligibility !== "No") score += 14;
  if (!profile.needsInternational) score += 6;
  if (profile.needsFunded && /Paid|stipend|Free|Scholarship|Prize/i.test(item.paid)) score += 14;
  if (/Rolling|Applications open|Apply early/i.test(item.deadline)) score += 6;
  return Math.min(score, 99);
}

function passesFilters(item) {
  const haystack = `${item.country} ${item.region} ${item.organisation} ${item.program} ${item.type} ${item.deadline} ${item.paid} ${item.description} ${item.location} ${item.eligibilityDetails} ${item.application}`.toLowerCase();
  const paidPass =
    state.paid === "All" ||
    (state.paid === "Paid" && /Paid|stipend|Scholarship|Prize/i.test(item.paid)) ||
    (state.paid === "Free" && /Free/i.test(item.paid)) ||
    (state.paid === "No" && item.paid === "No");
  return (
    (!state.query || haystack.includes(state.query.toLowerCase())) &&
    (state.region === "All" || item.region === state.region) &&
    (state.type === "All" || item.type === state.type) &&
    (state.eligibility === "All" || item.eligibility === state.eligibility) &&
    paidPass
  );
}

function filteredCatalog(records) {
  const items = records.filter(passesFilters);
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

function activeProgrammes() {
  return state.catalog === "opening" ? filteredOpeningSoon() : filteredItems();
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
      "circle-color": ["case", ["get", "selected"], "#b8925f", "#1f3d2b"],
      "circle-translate-anchor": "viewport",
      "circle-stroke-color": "#f5f1e8", "circle-stroke-width": 2
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
      center: [25, 20],
      zoom: window.innerWidth < 720 ? 0.7 : 1.5,
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
        if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#f5f1e8");
        if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", /water/i.test(layer.id) ? "#e4dccb" : "#f5f1e8");
        if (layer.type === "line" && /boundary|border/i.test(layer.id)) map.setPaintProperty(layer.id, "line-color", "#b8a98c");
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
          "circle-color": "#1f3d2b", "circle-stroke-color": "#f5f1e8", "circle-stroke-width": 2
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
      map.flyTo({ center: [25, 20], zoom: window.innerWidth < 720 ? 0.7 : 1.5, bearing: 0, pitch: 0, duration: 1000 });
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
    || programmesOpeningSoon().find((candidate) => candidate.id === id)
    || null;
}

function renderDetail() {
  let item = programmeById(state.selectedId);
  if (els.legendSelected) els.legendSelected.hidden = !item;
  if (!item) {
    if (els.selectionStrip) els.selectionStrip.hidden = true;
    els.detail.innerHTML = "";
    return;
  }
  if (!item.source || item.deadline == null) {
    item = { ...item, source: item.source || "", deadline: item.deadline || "" };
  }
  if (els.selectionStrip) els.selectionStrip.hidden = false;
  const score = matchScore(item);
  const reviewed = sourceLabel(item);
  els.detail.innerHTML = `
    <p class="eyebrow">${reviewed}</p>
    <h2>${item.organisation}</h2>
    <p><strong>${item.program}</strong></p>
    <div class="detail-meta">
      <span class="pill">${item.country}</span>
      <span class="pill">${item.type}</span>
      <span class="pill">${item.deadline}</span>
      ${closingSoonBadge(item)}
      ${item.opensOn ? `<span class="pill">Opens ${formatOpeningDate(item.opensOn)}</span>` : ""}
      ${score === null ? "" : `<span class="pill">${score}% profile fit</span>`}
    </div>
    <p>${item.description}</p>
  `;
}

function renderResults() {
  const items = filteredItems();
  els.results.innerHTML = "";
  if (!items.length) {
    els.results.innerHTML = opportunities.length
      ? `<article class="result empty-state"><h3>No matches yet</h3><p>Try broadening the region, type, or funding filters.</p></article>`
      : `<article class="result empty-state"><h3>Economics opportunities are coming soon</h3><p>We are preparing the first verified listings. Check back for internships, research assistantships and other economics programs.</p></article>`;
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = `result ${item.id === state.selectedId ? "active" : ""}`;
    card.id = "opportunity-" + item.id;
    card.tabIndex = 0;
    const reviewed = sourceLabel(item);
    const soon = closingSoonBadge(item);
    card.innerHTML = `
      <details class="program-disclosure">
      <summary class="program-row">
        <h3>${item.program}${soon}</h3>
        <span class="row-organisation">${item.organisation}</span>
        <span class="pill">${item.type}</span>
        <span class="row-location">${item.country}</span>
        <span class="row-reviewed">${reviewed.replace(/^Official source reviewed /, "")}</span>
      </summary>
      <div class="program-body">
      <p>${item.description}</p>
      <dl class="opportunity-facts">
        <div><dt>Location</dt><dd>${item.location}</dd></div>
        <div><dt>Duration</dt><dd>${item.duration}</dd></div>
        <div><dt>Funding / cost</dt><dd>${item.fundingDetails || item.paid}</dd></div>
        <div><dt>Deadline / status</dt><dd>${item.deadline}${soon}</dd></div>
      </dl>
      <div class="application-detail"><h4>Who can apply</h4><p>${item.eligibilityDetails}</p></div>
      <div class="application-detail"><h4>Application details</h4><p>${item.application}</p></div>
      <div class="opportunity-actions"><a href="${item.url}" target="_blank" rel="noopener noreferrer">Official programme details</a><button class="locate-program" type="button">View on globe</button><small>${reviewed}</small></div>
      </div>
      </details>
      ${state.profile ? `<div class="score">
        <span>${item.score}% profile fit</span>
        <div class="score-bar" aria-hidden="true"><span style="width:${item.score}%"></span></div>
      </div>` : ""}
    `;
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
  const inWindow = programmesOpeningSoon();
  const items = inWindow.length ? filteredOpeningSoon() : [];
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

function renderTabs() {
  const opening = state.catalog === "opening";
  [[els.tabOpen, els.panelOpen, !opening], [els.tabOpening, els.panelOpening, opening]].forEach(([tab, panel, selected]) => {
    if (tab) {
      const value = selected ? "true" : "false";
      if (typeof tab.setAttribute === "function") tab.setAttribute("aria-selected", value);
      tab.ariaSelected = value;
      tab.tabIndex = selected ? 0 : -1;
    }
    if (panel) panel.hidden = !selected;
  });
  if (els.openCount) els.openCount.textContent = String(filteredItems().length);
  if (els.openingCount) els.openingCount.textContent = String(filteredOpeningSoon().length);
}

function selectCatalog(catalog) {
  const next = catalog === "opening" ? "opening" : "open";
  if (state.catalog === next) return;
  state.catalog = next;
  const visible = new Set(activeProgrammes().map((item) => item.id));
  if (state.selectedId && !visible.has(state.selectedId)) state.selectedId = null;
  render();
}

function onCatalogTabKeydown(event) {
  const tabs = [els.tabOpen, els.tabOpening].filter(Boolean);
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
  selectCatalog(next === els.tabOpening ? "opening" : "open");
  if (typeof next.focus === "function") next.focus();
}

function render() {
  document.getElementById("profile-summary").hidden = !state.profile;
  document.getElementById("clear-profile").hidden = !state.profile;
  document.getElementById("apply-profile").disabled = !(els.homeRegion.value || state.interests.size || els.needsInternational.checked || els.needsFunded.checked);
  document.getElementById("apply-profile").textContent = state.profile ? "Update profile" : "Apply profile";
  renderChips();
  renderDetail();
  renderTabs();
  renderResults();
  renderOpeningSoon();
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
  state.homeRegion = els.homeRegion.value;
  state.needsInternational = els.needsInternational.checked;
  state.needsFunded = els.needsFunded.checked;
  render();
}

function resetFilters() {
  els.query.value = "";
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

[els.query, els.regionFilter, els.typeFilter, els.eligibilityFilter, els.paidFilter, els.homeRegion, els.needsInternational, els.needsFunded].forEach((el) => {
  el.addEventListener("input", updateState);
  el.addEventListener("change", updateState);
});

els.reset.addEventListener("click", resetFilters);
[els.tabOpen, els.tabOpening].forEach((tab) => {
  tab.addEventListener("click", () => selectCatalog(tab === els.tabOpening ? "opening" : "open"));
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
