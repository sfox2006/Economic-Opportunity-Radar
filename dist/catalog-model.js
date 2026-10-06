/* Shared by the browser, build script and future agent integrations. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.RadarModel = model;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const types = ['Cadetship', 'Internship', 'Vacationer Program', 'Summer Vacation', 'Industry Placement', 'Scholarship', 'Research assistantship', 'Fellowship', 'Training', 'Tutoring / Casual Academic', 'Other', 'Graduate Program', 'Graduate Job', 'Professional Job'];
  const currentStatuses = ['open', 'rolling', 'on-demand', 'interest-register'];
  const futureStatuses = ['upcoming', 'confirmed-future', 'recurring-unconfirmed'];
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
  function validTimestamp(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value)
      && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
  }
  function validate(records, registry, settings) {
    if (!['demo', 'live'].includes(settings.mode)) throw new Error('mode must be demo or live');
    if (!Number.isInteger(settings.maxVerificationAgeDays) || settings.maxVerificationAgeDays < 1 || settings.maxVerificationAgeDays > 30) throw new Error('Verification age must be 1-30 days');
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
      if (![...currentStatuses, ...futureStatuses, 'closed', 'unknown'].includes(item.status)) throw new Error(`${item.id}: unsupported status`);
      for (const field of ['program', 'description', 'location', 'duration', 'paid', 'deadline', 'eligibilityDetails', 'application', 'country', 'region', 'studyYear']) {
        if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`${item.id}: missing ${field}`);
      }
      if (item.experienceDetails !== undefined && (typeof item.experienceDetails !== 'string' || !item.experienceDetails.trim())) throw new Error(`${item.id}: experienceDetails must be a nonempty string`);
      if (!['Required', 'Not required', 'Restrictions', 'Not stated'].includes(item.citizenship)) throw new Error(`${item.id}: invalid citizenship requirement`);
      if (!['Yes', 'No', 'Some restrictions', 'Not stated'].includes(item.eligibility)) throw new Error(`${item.id}: invalid international eligibility`);
      if (item.region !== 'Online' && item.mapped !== false) {
        if (!Number.isFinite(item.lat) || Math.abs(item.lat) > 90 || !Number.isFinite(item.lon) || Math.abs(item.lon) > 180) throw new Error(`${item.id}: invalid coordinates`);
      }
      for (const field of ['deadlineOn', 'opensOn', 'opensFrom', 'opensBy', 'expectedOpensFrom', 'expectedOpensBy']) if (item[field] && !validDate(item[field])) throw new Error(`${item.id}: invalid ${field}`);
      for (const [from, to] of [['opensFrom', 'opensBy'], ['expectedOpensFrom', 'expectedOpensBy']]) {
        if ((item[from] || item[to]) && (!validDate(item[from]) || !validDate(item[to]) || item[from] > item[to])) throw new Error(`${item.id}: invalid opening range`);
      }
      if (item.opensOn && (item.opensFrom || item.opensBy)) throw new Error(`${item.id}: use an exact opening date or a confirmed range, not both`);
      if (item.closesAt && !validTimestamp(item.closesAt)) throw new Error(`${item.id}: closesAt must be a valid timestamp with a time zone`);
      if (settings.mode === 'demo') {
        if (item.simulated !== true || item.url || item.verification || item.reviewedAt) throw new Error(`${item.id}: demo records must be simulated, with no application URL or verification claims`);
      } else {
        if (item.simulated !== false) throw new Error(`${item.id}: simulated record forbidden in live mode; simulated must be false`);
        if (item.url && !https(item.url)) throw new Error(`${item.id}: supplied programme URLs must be HTTPS`);
        if (item.verification?.sources && (!Array.isArray(item.verification.sources) || item.verification.sources.some(source => !https(source.url) || typeof source.claim !== 'string' || !source.claim.trim()))) throw new Error(`${item.id}: evidence sources need HTTPS URLs and claim notes`);
      }
      if (item.status === 'confirmed-future' && !item.opensOn && !item.opensFrom && !(typeof item.openingWindow === 'string' && item.openingWindow.trim())) throw new Error(`${item.id}: confirmed future opening requires an exact date, confirmed range or official qualitative window`);
      if (item.status === 'recurring-unconfirmed' && (item.opensOn || item.opensFrom || item.opensBy)) throw new Error(`${item.id}: unconfirmed cycles must use expected dates, not confirmed opening fields`);
      if (item.status === 'upcoming' && !item.opensOn && !item.opensFrom) {
        if (!validDate(item.expectedOpensFrom) || !validDate(item.expectedOpensBy) || item.expectedOpensFrom > item.expectedOpensBy || !item.openingEvidence) throw new Error(`${item.id}: expected opening needs a dated range and supporting note`);
      }
    }
  }
  function select(records, settings, now = new Date()) {
    const today = dateKey(now, settings.timeZone);
    const end = windowEnd(today);
    const opportunities = [], openingSoon = [], confirmedFuture = [], recurringUnconfirmed = [], futureCompilation = [], excluded = [];
    for (const item of records) {
      let reason;
      const future = futureStatuses.includes(item.status);
      const recurring = item.status === 'recurring-unconfirmed' || (item.status === 'upcoming' && !item.opensOn && !item.opensFrom);
      const current = currentStatuses.includes(item.status);
      const evidence = item.verification;
      if (['closed', 'unknown'].includes(item.status)) reason = item.status;
      if (!reason && settings.mode === 'live' && item.simulated !== false) reason = 'simulated';
      if (!reason && settings.mode === 'live' && item.publicationApproved === false) reason = 'independent-review-not-approved';
      if (!reason && settings.mode === 'live') {
        const checked = evidence && Date.parse(evidence.checkedAt);
        if (item.simulated !== false) reason = 'simulated';
        else if (current && !https(item.url)) reason = 'application-route-unconfirmed';
        else if (!evidence || evidence.state !== 'verified' || !https(evidence.sourceUrl) || typeof evidence.notes !== 'string' || !evidence.notes.trim() || !validTimestamp(evidence.checkedAt)) reason = 'unverified';
        else if (checked > now.getTime()) reason = 'future-verification';
        else if (now.getTime() - checked > settings.maxVerificationAgeDays * 86400000) reason = 'review-expired';
        else if (item.country !== 'Australia' && (evidence.australianAudienceEligible !== true || typeof evidence.audienceEvidence !== 'string' || !evidence.audienceEvidence.trim())) reason = 'australian-audience-unconfirmed';
        else if (current && evidence.acceptingApplications !== true) reason = 'not-accepting-applications';
        else if ((item.deadlineOn || item.closesAt) && evidence.deadlineConfirmed !== true) reason = 'deadline-unconfirmed';
        else if (current && !item.deadlineOn && !item.closesAt && evidence.noDeadlinePublished !== true) reason = 'deadline-evidence-missing';
        else if (future && item.opensOn && evidence.openingDateConfirmed !== true) reason = 'opening-unconfirmed';
        else if (future && item.opensFrom && evidence.openingWindowConfirmed !== true) reason = 'opening-window-unconfirmed';
        else if (future && !recurring && !item.opensOn && !item.opensFrom && evidence.openingWindowConfirmed !== true) reason = 'opening-window-unconfirmed';
        else if (recurring && evidence.recurringProgramConfirmed !== true && evidence.expectedWindowSupported !== true) reason = 'recurring-program-unverified';
        else if (current && (item.opensOn || item.opensFrom) > today) reason = 'not-yet-open';
      }
      if (!reason && settings.mode === 'live' && item.closesAt && Date.parse(item.closesAt) <= now.getTime()) reason = 'deadline-passed';
      if (!reason && settings.mode === 'live' && item.deadlineOn && item.deadlineOn < today) reason = 'deadline-passed';
      const from = item.opensOn || item.opensFrom || item.expectedOpensFrom;
      const to = item.opensOn || item.opensBy || item.expectedOpensBy;
      if (!reason && future) {
        if (!recurring && from && settings.mode === 'live' && from <= today) reason = 'opening-needs-recheck';
        else if (to && to < today) reason = recurring ? 'expected-window-ended' : 'opening-needs-recheck';
      }
      const checked = evidence && Date.parse(evidence.checkedAt);
      const reviewedAt = Number.isFinite(checked) && checked <= now.getTime() ? dateKey(new Date(checked), settings.timeZone) : null;
      const category = current ? 'open' : recurring ? 'recurring-unconfirmed' : 'confirmed-future';
      const record = { ...item, ...(settings.mode === 'live' ? { reviewedAt } : {}), publicationState: reason ? 'held' : category, ...(reason ? { holdReason: reason } : {}) };
      if (!reason) delete record.holdReason;
      if (!reason && current) opportunities.push(record);
      if (future && reason !== 'simulated') {
        // Keep every future candidate for compilation, even beyond three months or after its check expires.
        futureCompilation.push(record);
        if (!reason && recurring) recurringUnconfirmed.push(record);
        if (!reason && !recurring) {
          confirmedFuture.push(record);
          if (from <= end) openingSoon.push(record);
        }
      }
      if (reason) excluded.push({ id: item.id, reason });
    }
    const byOpening = (a, b) => String(a.opensOn || a.opensFrom || a.expectedOpensFrom || '9999').localeCompare(String(b.opensOn || b.opensFrom || b.expectedOpensFrom || '9999')) || a.organisation.localeCompare(b.organisation) || a.program.localeCompare(b.program);
    confirmedFuture.sort(byOpening); recurringUnconfirmed.sort(byOpening); futureCompilation.sort(byOpening);
    return { opportunities, openingSoon, confirmedFuture, recurringUnconfirmed, futureCompilation, excluded };
  }
  return { types, currentStatuses, futureStatuses, dateKey, validDate, validTimestamp, windowEnd, validate, select };
});
