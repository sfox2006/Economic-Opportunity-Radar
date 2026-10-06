/* Browser interaction only: prompts stay local, shared links return to this site. */
(function(){
  const dialog=document.getElementById('opportunity-action-dialog');
  const text=document.getElementById('opportunity-action-text');
  const title=document.getElementById('opportunity-action-title');
  const message=document.getElementById('opportunity-action-message');
  const status=document.getElementById('opportunity-action-status');
  const copy=document.getElementById('copy-opportunity-action');
  let pending='';
  const announce=value=>{status.textContent=value;};
  function show(value,heading,description){pending=value;text.value=value;text.setSelectionRange(0,0);title.textContent=heading;message.textContent=description;copy.textContent=heading==='Share opportunity'?'Copy link':'Copy prompt';dialog.showModal();text.scrollTop=0;}
  async function copyText(value){
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;}}catch{}
    text.focus();text.select();
    try{return document.execCommand('copy');}catch{return false;}
  }
  copy.addEventListener('click',async()=>{const done=await copyText(pending);message.textContent=done?'Copied. Paste it where you need it.':'Select the text and press Ctrl+C or Command+C to copy.';if(!done){text.focus();text.select();}});
  document.getElementById('close-opportunity-action').addEventListener('click',()=>dialog.close());
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-opportunity-action]');if(!button)return;
    const item=programmeById(button.dataset.opportunityId);if(!item)return;
    if(button.dataset.opportunityAction==='prompt'){
      show(RadarOpportunity.applicationPrompt(item),'AI application prompt','Paste this prompt alongside your CV into your chosen AI tool. This site does not receive or upload your CV.');return;
    }
    const url=RadarOpportunity.opportunityUrl(item,window.location.href);
    try{if(navigator.share){await navigator.share({title:item.program,text:item.displayOrganisation||item.organisation,url});announce('Opportunity link shared.');return;}}catch(error){if(error.name==='AbortError')return;}
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);announce('Opportunity link copied.');return;}}catch{}
    show(url,'Share opportunity','Copy this link to return directly to this opportunity on Economic Opportunity Radar.');
  });
  function showLinkedOpportunity(){
    const id=new URL(window.location.href).searchParams.get('opportunity');if(!id)return;
    if(window.location.hash && window.location.hash!=='#programs')return;
    const notice=document.getElementById('opportunity-link-notice');
    const record=programmeById(id);
    if(!record){
      const previous=(radarCatalog.records||[]).find(item=>item.id===id);
      const exclusion=currentCatalog.excluded?.find(item=>item.id===id);
      notice.hidden=false;
      notice.textContent=previous?`${previous.program} at ${previous.displayOrganisation||previous.organisation} is no longer in the accepting list. ${exclusion?.reason==='deadline-passed'?'Its recorded deadline has passed.':'Its availability needs a fresh check.'} Recorded deadline: ${previous.deadline}.`:'This opportunity is missing or no longer published. Browse the current list or search its organisation.';
      if(previous?.url?.startsWith('https://')){const link=document.createElement('a');link.href=previous.url;link.textContent='Check the official source';link.target='_blank';link.rel='noopener noreferrer';notice.appendChild(document.createTextNode(' '));notice.appendChild(link);}
      notice.tabIndex=-1;notice.focus({preventScroll:true});notice.scrollIntoView({block:'center'});return;
    }
    notice.hidden=true;resetFilters();
    state.catalog=opportunities.some(item=>item.id===id)?'open':confirmedFuture.some(item=>item.id===id)?'opening':'recurring';
    state.selectedId=id;render();
    const card=document.getElementById('opportunity-'+id);if(!card)return;
    const disclosure=card.querySelector('.program-disclosure');if(disclosure)disclosure.open=true;
    card.focus({preventScroll:true});card.scrollIntoView({block:'center',behavior:'auto'});
  }
  window.addEventListener('popstate',showLinkedOpportunity);
  window.addEventListener('hashchange',showLinkedOpportunity);
  showLinkedOpportunity();
})();
