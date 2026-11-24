// 10K player survey (user, 2026-11-24). It opens once on the main menu, after the new version's patch notes, and stays
// in the bell's patch notes window until it is sent. Every step can be skipped. Only what the player picks is sent:
// a random response ID (so a retry never counts twice), the optional country and the answers, as English names. The
// game never sends its language, version, device or save. Answers wait in localStorage until the server takes them.
// Grids stay cheap on low-end phones: one grid in the DOM at a time, lazy images, and a tap only touches two tiles.
import {currentLanguage,t as translate,foldSearch} from './i18n.js';
import {servers} from './servers.js';
import {relicImage} from './ui-art.js';
import {COLLECTOR_MENU_CARD} from './collector-roster.js';
export const SURVEY_ID='10k-2026';
const SEEN='ygo-survey-10k-seen',DRAFT='ygo-survey-10k-draft',OUTBOX='ygo-survey-10k-outbox',DONE='ygo-survey-10k-done';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch{}};
// Local QA (tools/serve_qa.py) points this at its own CSV recorder. Releases send to the stats Worker.
const endpoint=()=>globalThis.YGO_SURVEY_ENDPOINT||servers.stats+'/v1/survey';
// ISO 3166-1 alpha-2; names come from the browser in the player's language (Intl.DisplayNames).
const COUNTRIES='AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
const regionNames=lang=>{try{return new Intl.DisplayNames([lang],{type:'region'})}catch{return null}};
const countryName=(code,lang='en')=>{try{return regionNames(lang)?.of(code)||code}catch{return code}};

let dialogFn=null,contentRef=null,modal=null,state=null,bound=false,sending=false;
// mobile.js calls this on every main menu; only the first call binds anything.
export function initSurvey(dialog,content){
 dialogFn=dialog;contentRef=content;
 if(!bound){bound=true;modal=document.querySelector('#modal');modal?.addEventListener('click',onClick);modal?.addEventListener('input',onInput);modal?.addEventListener('close',onClose);void flush()}
}
export const surveyDone=()=>!!read(DONE);
// The card at the top of the bell window, until the survey is sent.
export function surveyBanner(){
 if(surveyDone()||!contentRef)return '';
 const started=read(DRAFT)?.step>1;
 return `<div class="survey-banner"><div><h3>10K player survey</h3><p>Tell me your favourite characters, opponents and relics, and what to add next.</p></div><button class="primary" data-survey="start">${started?'Continue survey':'Take survey now'}</button></div>`;
}
// Once per player, on the main menu when nothing else is open. It counts as seen only when the player closes it, says
// "No thank you" or starts it (user, 2026-11-24: "make sure it doesn't disappear because of the new update patch
// notes"). It waits for the new version's notes to close, and if another window (the notes, a notice queued behind
// them) takes its place, it comes back when that window closes, or at the next start.
let retryCanShow=null;
// Patch notes are showing: the survey opens after they (and anything queued behind them) are closed.
export function queueSurvey(canShow){retryCanShow=canShow}
export function maybeShowSurvey(canShow){
 retryCanShow=canShow;
 if(!dialogFn||!contentRef||read(SEEN)||surveyDone()||!canShow())return false;
 open(0);return true;
}
function onClose(){
 modal.classList.remove('survey-modal');
 if(modal.querySelector('.survey-intro'))write(SEEN,1);
 // Let any window queued behind the one that closed open first (notices wait ~300 ms), then try again.
 if(retryCanShow&&!read(SEEN)&&!surveyDone())setTimeout(()=>{if(retryCanShow&&!modal.open)maybeShowSurvey(retryCanShow)},450);
}

// The questions. Each grid is built from the shipped content, so new characters and relics join on their own.
let asked=null;
function questions(){
 const lang=currentLanguage();if(asked?.content===contentRef&&asked.lang===lang)return asked.list;
 const c=contentRef,ch=c.characters,fused=new Set(c.fusedRelics||[]),retired=new Set(c.retiredArtifacts||[]);
 const uniq=list=>{const seen=new Set();return list.filter(x=>x&&!seen.has(x.name)&&seen.add(x.name))};
 const person=i=>ch[i]&&{key:String(i),name:ch[i].name,src:`assets/${ch[i].sprite}`,face:true};
 const playable=uniq(c.playable.map(person));
 // Opponents: every character with its own CPU deck, boss decks or a tier, minus the Fallen Collectors (player decks).
 const uc=new Set(c.ultimateCollectors||[]);
 const ids=[...new Set([...Object.keys(c.cpuDecks||{}),...Object.keys(c.bossDeckNames||{}),...ch.map((x,i)=>'tier' in x?String(i):null)].filter(Boolean).map(Number))];
 const opponents=uniq(ids.filter(i=>!uc.has(i)&&!ch[i]?.copycat).sort((a,b)=>a-b).map(person));
 const relic=k=>({key:k,name:c.artifacts[k][0],src:relicImage(c.artifactInfo[k]?.art)});
 const keys=Object.keys(c.artifacts).filter(k=>!retired.has(k)&&c.artifactInfo[k]);
 // Relics sort by the name the player reads (i18n translates the tiles' text on screen).
 const shown=new Map(),label=x=>shown.get(x)??shown.set(x,String(translate(x)||x)).get(x),byName=(a,b)=>label(a.name).localeCompare(label(b.name),lang);
 const normal=keys.filter(k=>!k.startsWith('cursed_')&&!fused.has(k)).map(relic).sort(byName);
 const shadow=keys.filter(k=>k.startsWith('cursed_')).map(relic).sort(byName);
 const fusedList=keys.filter(k=>fused.has(k)).map(relic).sort(byName);
 const modes=[['tag','Tag Duels',81332143],['draft','Draft Duels',3549275],['collector','Ultimate Collector',COLLECTOR_MENU_CARD[1]]].map(([key,name,art])=>({key,name,src:`assets/menu/${art}.jpg`}));
 const list=[
  {id:'fav_character',q:'Who is your favourite character to play as?',items:playable},
  {id:'least_character',q:'Who is your least favourite character to play as?',items:playable},
  {id:'fav_relic',q:'What is your favourite normal relic?',items:normal,search:true},
  {id:'fav_shadow_relic',q:'What is your favourite shadow relic?',items:shadow,search:true},
  {id:'fav_fused_relic',q:'What is your favourite fused relic?',items:fusedList,search:true},
  {id:'fav_opponent',q:'Who is your favourite opponent?',items:opponents,search:true},
  {id:'least_opponent',q:'Who is your least favourite opponent?',items:opponents,search:true},
  {id:'fav_online_mode',q:'What is your favourite online game mode?',items:modes,wide:true},
 ];
 asked={content:c,lang,list};return list;
}
// Steps: 0 intro, 1 country, 2..9 the eight grids, 10 the wish box, 11 thanks.
const LAST_GRID=9,WISH=10,THANKS=11;
// Step 0 is the intro; the bell's button resumes an unfinished survey where it stopped.
function open(step){
 if(step)write(SEEN,1);
 const saved=read(DRAFT);
 state=step===0||!saved?{step,answers:{},country:''}:saved;
 render();
}
function save(){write(DRAFT,state)}
function footer({back=true,skip=true,next='Next',nextOn=true}={}){
 return `<div class="survey-actions">${back?'<button data-survey="back">Back</button>':'<span></span>'}<span class="survey-spacer"></span>${skip?'<button data-survey="skip">Skip</button>':''}<button class="primary" data-survey="next" ${nextOn?'':'disabled'}>${next}</button></div>`;
}
const counter=n=>`<p class="survey-count">Question ${n} of 9</p>`;
function render(){
 const s=state.step;let title='10K player survey',body='';
 if(s===0){
  title='10K players!';
  body=`<div class="survey survey-intro"><p>To celebrate 10K total players, I'm running a player survey to find out what your favourite and least favourite characters, opponents and relics are, and what I can still implement to make the game better.</p><div class="survey-actions"><span class="survey-spacer"></span><button data-do="close">No thank you</button><button class="primary" data-survey="begin">Take survey now</button></div></div>`;
 }else if(s===1){
  const lang=currentLanguage(),names=regionNames(lang),list=COUNTRIES.map(code=>({code,name:names?.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name,lang));
  body=`<div class="survey"><p class="survey-count">Before we start</p><h3>Which country are you from?</h3><p class="muted">Optional. You can skip this, like every question.</p><select class="survey-country" data-no-i18n aria-label="Country"><option value="">—</option>${list.map(x=>`<option value="${x.code}" ${x.code===state.country?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${footer({back:false,nextOn:!!state.country})}</div>`;
 }else if(s<=LAST_GRID){
  const q=questions()[s-2],picked=state.answers[q.id]?.key;
  body=`<div class="survey">${counter(s-1)}<h3>${esc(q.q)}</h3>${q.search?'<input class="survey-search" type="search" placeholder="Search" aria-label="Search">':''}<div class="survey-grid ${q.wide?'wide':''}">${q.items.map(x=>`<button class="survey-tile ${x.face?'face':''} ${x.key===picked?'picked':''}" data-survey="pick" data-key="${esc(x.key)}" aria-pressed="${x.key===picked}"><img loading="lazy" decoding="async" src="${esc(x.src)}" alt=""><span>${esc(x.name)}</span></button>`).join('')}</div>${footer({nextOn:!!picked})}</div>`;
 }else if(s===WISH){
  body=`<div class="survey">${counter(9)}<h3>What would you like to see added to the game?</h3><textarea class="survey-wish" maxlength="1000" rows="6" placeholder="Your ideas"></textarea>${footer({next:'Send',nextOn:true})}</div>`;
 }else{
  body=`<div class="survey survey-thanks"><h3>Thank you for taking the survey!</h3><p>To celebrate 10K players, the next update will feature a special cosmetic for everyone.</p><div class="survey-actions"><span class="survey-spacer"></span><button class="primary" data-do="close">Close</button></div></div>`;
 }
 dialogFn(title,body,s!==THANKS);
 modal?.classList.add('survey-modal');
 // Set as a value, not markup, so the translator never rewrites what the player wrote.
 const wish=modal?.querySelector('.survey-wish');if(wish)wish.value=state.wish||'';
}
function go(step){state.step=step;save();render();modal?.querySelector('.survey')?.scrollIntoView?.({block:'start'})}
function onInput(e){
 const t=e.target;
 if(t.matches?.('.survey-country')){state.country=t.value;modal.querySelector('[data-survey="next"]').disabled=!t.value;save()}
 else if(t.matches?.('.survey-search')){const q=foldSearch(t.value.trim());for(const b of modal.querySelectorAll('.survey-tile'))b.hidden=!!q&&!foldSearch(b.textContent).includes(q)}
 else if(t.matches?.('.survey-wish'))state.wish=t.value.slice(0,1000);
}
function onClick(e){
 const el=e.target.closest?.('[data-survey]');if(!el||!modal.contains(el))return;
 const a=el.dataset.survey;
 if(a==='start'){open(1);return}
 if(a==='begin'){write(SEEN,1);state={step:1,answers:{},country:''};go(1);return}
 if(!state)return;
 const s=state.step;
 if(a==='pick'){
  const q=questions()[s-2],item=q?.items.find(x=>x.key===el.dataset.key);if(!item)return;
  const old=modal.querySelector('.survey-tile.picked');if(old&&old!==el){old.classList.remove('picked');old.setAttribute('aria-pressed','false')}
  el.classList.add('picked');el.setAttribute('aria-pressed','true');state.answers[q.id]={key:item.key,name:item.name};
  modal.querySelector('[data-survey="next"]').disabled=false;save();return;
 }
 if(a==='back'){go(Math.max(1,s-1));return}
 if(a==='skip'){
  if(s===1)state.country='';else if(s<=LAST_GRID)delete state.answers[questions()[s-2].id];else if(s===WISH)state.wish='';
  if(s===WISH){submit();return}
  go(s+1);return;
 }
 if(a==='next'){if(s===WISH){state.wish=(modal.querySelector('.survey-wish')?.value||'').slice(0,1000);submit();return}go(s+1)}
}
// One row per player. The draft is replaced by the outbox, which waits until the server confirms it.
function submit(){
 const answers=Object.fromEntries(questions().map(q=>[q.id,state.answers[q.id]?.name||'']));
 const row={survey:SURVEY_ID,id:crypto.randomUUID?.()||String(Date.now())+Math.random().toString(16).slice(2),country:state.country||'',countryName:state.country?countryName(state.country):'',answers,wish:(state.wish||'').trim().slice(0,1000)};
 write(OUTBOX,row);write(DONE,1);write(DRAFT,null);state.step=THANKS;render();void flush();
}
async function flush(){
 const row=read(OUTBOX);if(!row||sending)return;sending=true;
 try{const r=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(row)});if(r.ok||[400,409,410].includes(r.status))write(OUTBOX,null)}catch{}
 finally{sending=false}
}
