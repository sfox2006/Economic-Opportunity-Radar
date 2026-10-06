/* Shared by the browser, build script and future agent integrations. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.RadarModel = model;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const types = ['Cadetship', 'Internship', 'Vacationer Program', 'Summer Vacation', 'Industry Placement', 'Scholarship', 'Research assistantship', 'Other', 'Graduate Program', 'Graduate Job'];
  function dateKey(now = new Date(), timeZone = 'Australia/Sydney') {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const parsed = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function windowEnd(today) {
    const start = new Date(today + 'T00:00:00Z');
    const targetMonth = start.getUTCMonth() + 3;
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(start.getUTCFullYear(), targetMonth, Math.min(start.getUTCDate(), lastDay))).toISOString().slice(0, 10);
  }
  function https(value) {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }
  function validate(records, registry, settings) {
    if (!['demo', 'live'].includes(settings.mode)) throw new Error('mode must be demo or live');
    if (!Number.isInteger(settings.maxVerificationAgeDays) || settings.maxVerificationAgeDays < 1 || settings.maxVerificationAgeDays > 30) throw new Error('Verification age must be 1–30 days');
    dateKey(new Date(), settings.timeZone);
    if (!Array.isArray(records)) throw new Error('Opportunity input must be an array');
    const orgs = new Map(registry.organisations.map(org => [org.id, org]));
    const ids = new Set();
    for (const item of records) {
      if (!/^[a-z0-9-]+$/.test(item.id || '') || ids.has(item.id)) throw new Error(`Invalid or duplicate ID: ${item.id}`);
      ids.add(item.id);
      const org = orgs.get(item.organisationId);
      if (!org || org.name !== item.organisation || org.sector !== item.sector) throw new Error(`${item.id}: organisation/sector mismatch`);
      if (!types.includes(item.type)) throw new Error(`${item.id}: unsupported type`);
      if (!['open', 'rolling', 'on-demand', 'upcoming', 'closed', 'unknown'].includes(item.status)) throw new Error(`${item.id}: unsupported status`);
      for (const field of ['program', 'description', 'location', 'duration', 'paid', 'deadline', 'eligibilityDetails', 'application', 'country', 'region', 'studyYear']) {
        if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`${item.id}: missing ${field}`);
      }
      if (!['Required', 'Not required', 'Restrictions', 'Not stated'].includes(item.citizenship)) throw new Error(`${item.id}: invalid citizenship requirement`);
      if (!['Yes', 'No', 'Some restrictions'].includes(item.eligibility)) throw new Error(`${item.id}: invalid international eligibility`);
      if (item.region !== 'Online' && item.mapped !== false) {
        if (!Number.isFinite(item.lat) || Math.abs(item.lat) > 90 || !Number.isFinite(item.lon) || Math.abs(item.lon) > 180) throw new Error(`${item.id}: invalid coordinates`);
      }
      for (const field of ['deadlineOn', 'opensOn', 'expectedOpensFrom', 'expectedOpensBy']) if (item[field] && !validDate(item[field])) throw new Error(`${item.id}: invalid ${field}`);
      if (item.closesAt && (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(item.closesAt) || !Number.isFinite(Date.parse(item.closesAt)))) throw new Error(`${item.id}: closesAt must have a time zone`);
      if (settings.mode === 'demo') {
        if (item.simulated !== true || item.url || item.verification || item.reviewedAt) throw new Error(`${item.id}: demo records must be simulated, with no application URL or verification claims`);
      } else {
        if (item.simulated) throw new Error(`${item.id}: simulated record forbidden in live mode`);
        if (!https(item.url)) throw new Error(`${item.id}: official HTTPS application URL required`);
        if (item.country !== 'Australia') throw new Error(`${item.id}: verify an Australian opportunity before publication`);
      }
      if (item.status === 'upcoming' && !item.opensOn) {
        if (!validDate(item.expectedOpensFrom) || !validDate(item.expectedOpensBy) || item.expectedOpensFrom > item.expectedOpensBy || !item.openingEvidence) throw new Error(`${item.id}: expected opening needs a dated range and supporting note`);
      }
    }
  }
  function select(records, settings, now = new Date()) {
    const today = dateKey(now, settings.timeZone);
    const end = windowEnd(today);
    const opportunities = [], openingSoon = [], excluded = [];
    for (const item of records) {
      let reason;
      if (['closed', 'unknown'].includes(item.status)) reason = item.status;
      if (!reason && settings.mode === 'live') {
        const evidence = item.verification;
        const checked = evidence && Date.parse(evidence.checkedAt);
        if (!evidence || evidence.state !== 'verified' || !https(evidence.sourceUrl) || !evidence.notes || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(evidence.checkedAt || '') || !Number.isFinite(checked)) reason = 'unverified';
        else if (checked > now.getTime()) reason = 'future-verification';
        else if (now.getTime() - checked > settings.maxVerificationAgeDays * 86400000) reason = 'review-expired';
        else if (item.status !== 'upcoming' && evidence.acceptingApplications !== true) reason = 'not-accepting-applications';
        else if ((item.deadlineOn || item.closesAt) && evidence.deadlineConfirmed !== true) reason = 'deadline-unconfirmed';
        else if (!item.deadlineOn && evidence.noDeadlinePublished !== true) reason = 'deadline-evidence-missing';
        else if (item.opensOn && evidence.openingDateConfirmed !== true) reason = 'opening-unconfirmed';
        else if (!item.opensOn && item.status === 'upcoming' && evidence.expectedWindowSupported !== true) reason = 'opening-window-unsupported';
      }
      if (!reason && settings.mode === 'live' && item.closesAt && Date.parse(item.closesAt) <= now.getTime()) reason = 'deadline-passed';
      if (!reason && settings.mode === 'live' && item.deadlineOn && item.deadlineOn < today) reason = 'deadline-passed';
      if (!reason && item.status === 'upcoming') {
        const from = item.opensOn || item.expectedOpensFrom;
        const to = item.opensOn || item.expectedOpensBy;
        if (to < today || (settings.mode === 'live' && item.opensOn && from <= today)) reason = 'opening-needs-recheck';
        else if (from > end) reason = 'outside-watchlist-window';
        else openingSoon.push(settings.mode === 'live' ? { ...item, reviewedAt: dateKey(new Date(item.verification.checkedAt), settings.timeZone) } : item);
      } else if (!reason) opportunities.push(settings.mode === 'live' ? { ...item, reviewedAt: dateKey(new Date(item.verification.checkedAt), settings.timeZone) } : item);
      if (reason) excluded.push({ id: item.id, reason });
    }
    return { opportunities, openingSoon, excluded };
  }
  return { types, dateKey, validDate, windowEnd, validate, select };
});
