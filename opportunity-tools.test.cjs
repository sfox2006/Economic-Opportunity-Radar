const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const tools=require('./dist/opportunity-tools.js');
const records=JSON.parse(fs.readFileSync('data/live-opportunities.json','utf8'));
test('human-friendly type labels preserve original keys and relevant acronyms',()=>{
 assert.equal(tools.typeLabel('graduate_job'),'Graduate Job');
 assert.equal(tools.typeLabel('research_assistantship'),'Research Assistantship');
 assert.equal(tools.typeLabel('PhD / MPhil Scholarship'),'PhD / MPhil Scholarship');
 for(const r of records)assert.doesNotMatch(tools.typeLabel(r.typeDetails||r.type),/_/);
});
test('every prompt includes actual source facts, uncertainty, questions and truthful structure-preserving drafting',()=>{
 for(const r of records){
  const prompt=tools.applicationPrompt(r);
  for(const fact of [r.program,r.displayOrganisation||r.organisation,r.url,r.deadline,r.eligibilityDetails,r.verification.notes].filter(Boolean))assert.ok(prompt.includes(fact),r.id+' missing '+fact.slice(0,60));
  for(const instruction of ['Ask clarifying questions before drafting','wait for my answers','why I want THIS role','experiences and achievements','Do not invent skills','section order, layout and structure','Plain text cannot preserve fonts','grounded in my CV and answers','do not silently fill gaps'])assert.ok(prompt.includes(instruction));
 }
 assert.match(tools.applicationPrompt(records.find(r=>r.status==='interest-register')),/no vacancy or admission guarantee/);
 assert.match(tools.applicationPrompt(records.find(r=>r.status==='confirmed-future')),/applications are not verified open/);
});
test('share URLs return to the precise site opportunity, without retaining unrelated filters or external application URLs',()=>{
 const item={id:'imf-fip-economists-2027',url:'https://imf.example/apply'};
 const url=tools.opportunityUrl(item,'https://sfox2006.github.io/Economic-Opportunity-Radar/index.html?query=old#profile');
 assert.equal(url,'https://sfox2006.github.io/Economic-Opportunity-Radar/?opportunity=imf-fip-economists-2027#programs');
 assert.doesNotMatch(url,/imf\.example|query=old/);
});

test('professional preparation preserves experience and restrictions without inventing an employer age limit',()=>{
 const role={...records[0],program:'Manager, Economics and Evaluation',type:'Professional Job',
  studyYear:'Relevant degree required',experienceDetails:'Demonstrated evaluation experience; management experience preferred',
  eligibilityDetails:'Australian citizenship; security clearance; current employees only'};
 const prompt=tools.applicationPrompt(role);
 for(const fact of [role.program,role.studyYear,role.experienceDetails,role.eligibilityDetails])assert.ok(prompt.includes(fact));
 assert.match(prompt,/under-30 audience is not an employer age limit/);
 assert.match(prompt,/Preserve clearance, Indigenous-specific and internal-employee restrictions/);
 assert.match(prompt,/Distinguish mandatory requirements from preferences/);
});
