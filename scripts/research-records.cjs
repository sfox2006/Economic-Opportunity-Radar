/* Reviewed corrections preserve the immutable audit input and availability gates. */
const fs=require('node:fs'),path=require('node:path');
const supported=new Set(['status','deadline','eligibility','duration','verification','citizenship','paid','workRights','experienceRequirements','qualifications','eligibilityDetails','openingWindow','application']);
const text=v=>typeof v==='string'?v:v&&typeof v==='object'?Object.entries(v).map(([k,v])=>`${k}: ${text(v)}`).join('; '):'';
const unique=values=>[...new Set(values.filter(v=>typeof v==='string'&&v.trim()))].join(' ');
function applyCorrections(records,projection){
  if(projection.schemaVersion!==1||!Array.isArray(projection.revisions))throw new Error('Invalid correction projection');
  if(!records.length)return [];
  const ids=new Set(records.map(r=>r.id)),revisions=new Map();let facts=0,priorities=0;
  for(const revision of projection.revisions){
    if(!ids.has(revision.recordId)||revisions.has(revision.recordId))throw new Error(`Unknown/duplicate correction ID: ${revision.recordId}`);
    for(const fact of revision.facts){
      if(!supported.has(fact.field)||typeof fact.value!=='string'||!fact.value.trim()||!Number.isFinite(Date.parse(fact.checkedAt))||!fact.sources.length||fact.sources.some(url=>!url.startsWith('https://')))throw new Error(`Invalid reviewed fact: ${revision.recordId}`);
      facts++;
    }
    if(revision.priority)priorities++;
    revisions.set(revision.recordId,revision);
  }
  if(facts!==projection.findingCount||priorities!==projection.priorityCount)throw new Error('Correction counts do not match');
  return records.map(original=>{
    const revision=revisions.get(original.id);if(!revision)return original;
    const item=structuredClone(original),oldQualifications=item.qualifications||item.studyYear;
    let changedRequirements=false;
    const applied=revision.facts.filter(f=>Date.parse(f.checkedAt)>=Date.parse(original.verification?.checkedAt||0));
    for(const fact of applied){
      const field=fact.field;
      let value=fact.value;
      if(value==='Official API typeOfEmployment id permanent, label Full-time; supports permanent full-time')value='Permanent, full-time employment';
      if(item.id.startsWith('nous-group-')&&field==='workRights'&&item.id!=='nous-group-8603687002')value='Australian right to work required';
      if(field==='paid'&&item.id==='citadel-securities-quantitative-developer-research-engineer')value='Multi-location advert states base salary $250,000–$350,000; Australian currency and placement applicability are not established.';
      if(field==='duration'&&item.id==='cbus-graduate-next-unconfirmed')value='Closed 2026 cohort: 12-month maximum-term, full-time programme. Next-intake terms remain unconfirmed.';
      if(field==='application'&&value.includes('canApply=true'))continue; // Route evidence supplements the existing human application instructions.
      if(['status','verification'].includes(field))continue;
      if(field==='qualifications'){item.qualifications=value;item.studyYear=value;changedRequirements=true;}
      else if(field==='experienceRequirements'){item.experienceRequirements=value;changedRequirements=true;}
      else if(field==='citizenship'){
        item.citizenshipDetails=value;
        item.citizenship=/regardless of nationality|All nationalities/i.test(value)?'Not required':/requires Australian citizenship/i.test(value)?'Required':'Restrictions';
        changedRequirements=true;
      }
      else if(field==='workRights'){item.workRights=value;changedRequirements=true;}
      else if(field==='eligibility')item.additionalEligibility=value;
      else if(field==='paid'){item.paid=value;if(item.fundingDetails)item.fundingDetails=value;}
      else item[field]=value;
      const timed={
        'ifs-research-economist-2027':['2026-11-08','2026-11-08T23:55:00Z'],
        'national-australia-bank-nab-senior-analyst-credit-strategy-809216':['2026-10-09','2026-10-09T23:55:00+11:00'],
        'national-australia-bank-nab-analyst-field-examiner-809289':['2026-10-13','2026-10-13T00:25:00+11:00']
      }[item.id];
      if(field==='deadline'&&timed){item.deadlineOn=timed[0];item.closesAt=timed[1];item.verification.deadlineConfirmed=true;}
    }
    const priority=revision.priority,priorityApplied=!!priority&&Date.parse(priority.checkedAt)>=Date.parse(original.verification?.checkedAt||0);
    if(priorityApplied){
      const changes=structuredClone(priority.changes),verification=changes.verification,review=changes.independentReview;
      delete changes.verification;delete changes.independentReview;Object.assign(item,changes);
      if(verification)item.verification={...item.verification,...verification};
      if(review)item.independentReview={...review,previousDecision:original.independentReview};
      changedRequirements||=['qualifications','studyYear','restrictions','citizenshipDetails'].some(k=>k in changes);
    }
    if(changedRequirements){
      if(item.qualifications&&item.eligibilityDetails.includes(oldQualifications))item.eligibilityDetails=item.eligibilityDetails.replaceAll(oldQualifications,item.qualifications);
      if(item.type==='professional_job'||item.experienceRequirements){
        const restrictions=typeof item.restrictions==='object'?Object.entries(item.restrictions||{}).filter(([k])=>k!=='workRights').map(([k,v])=>`${k}: ${text(v)}`).join('; '):text(item.restrictions);
        item.eligibilityDetails=unique([item.studyYear,item.experienceRequirements?`Experience: ${item.experienceRequirements}`:'',item.workRights?`Work rights: ${item.workRights}`:'',restrictions?`Other restrictions: ${restrictions}`:'',item.citizenshipDetails?`Citizenship: ${item.citizenshipDetails}`:'']);
        item.experienceDetails=unique([item.experienceRequirements?`Experience: ${item.experienceRequirements}`:original.experienceDetails,`Qualifications: ${item.studyYear}`,item.workRights?`Work rights: ${item.workRights}`:'',restrictions?`Restrictions: ${restrictions}`:'']);
      }
      if(item.workRights)item.citizenshipDetails=unique([item.citizenshipDetails||item.citizenship,`Work rights: ${item.workRights}`]);
    }
    if(item.additionalEligibility)item.eligibilityDetails=unique([item.eligibilityDetails,`Additional programme criteria: ${item.additionalEligibility}`]);
    if(applied.length)item.verification.notes=unique([item.verification.notes,`Additional field facts checked ${[...new Set(applied.map(f=>f.checkedAt))].join(', ')}: ${applied.map(f=>`${f.field}: ${f.value}`).join('; ')}`]);
    const sources=[...(item.verification.sources||[])];
    for(const fact of applied)for(const url of fact.sources)if(!sources.some(s=>s.url===url&&s.claim===`${fact.field}: ${fact.value}`))sources.push({url,claim:`${fact.field}: ${fact.value}`});
    item.verification.sources=sources;
    item.factReview={sourceLibraryFileId:projection.source.libraryFileId,version:projection.source.version,fieldFindingCount:applied.length,priorityApplied};
    return item;
  });
}
function readRecords(root){const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));return applyCorrections(read('live-opportunities.json'),read('opportunity-corrections.json'));}
module.exports={applyCorrections,readRecords};
