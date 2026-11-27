// 10K player survey results (user, 2026-11-27), opened from the thank-you popup or the bell window (survey.js). Loaded
// only when opened. It plays its own track, opens with Magical Hats and a few spotlights, then runs a short Family Feud
// style quiz: each round shows one of the survey's multiple-choice questions with its top answers hidden on a board, the
// player picks the answer they think most players gave, and scores the % of players who gave it. A canvas score
// image (copy / download, run-card.js's helpers) and the full results page follow. The tallies are a frozen snapshot
// (survey-results.json, tools/survey_results_snapshot.py); nothing is fetched from a server and nothing is sent.
// Low-end phones: one screen in the DOM at a time, lazy images, and only transform/opacity animate.
import {t,currentLocale,currentLanguage,foldSearch} from './i18n.js';
import {relicImage} from './ui-art.js';
import {COLLECTOR_MENU_CARD} from './collector-roster.js';
// juice.js plays at the game's volumes; it touches the page when loaded, so it loads with the first sound.
let juice=null;const fx=(fn,...args)=>{(juice??=import('./juice.js')).then(m=>m[fn](...args)).catch(()=>{})};
const effectSound=(path,gain)=>fx('effectSound',path,gain),summonVoice=code=>fx('summonVoice',code);
import {copyRunCard,saveRunCard,displayFont} from './run-card.js';
import {replayVersion} from './replay-version.js';

// The Dark Magician Girl music (user, 2026-11-27): the playlist her Legendary summon switches the duel to
// (legendary-summon.js, music-config.js "summon-cute").
export const QUIZ_MUSIC='summon-cute';
const DMG=38033121,BOARD=5,SEARCH_FROM=13;
// Quiz rounds, in survey order. `label` is the short name on the score image.
export const ROUNDS=[
 {id:'fav_character',q:'Who is your favourite character to play as?',label:'Favourite character'},
 {id:'least_character',q:'Who is your least favourite character to play as?',label:'Least favourite character'},
 {id:'fav_relic',q:'What is your favourite normal relic?',label:'Favourite normal relic'},
 {id:'fav_shadow_relic',q:'What is your favourite shadow relic?',label:'Favourite shadow relic'},
 {id:'fav_fused_relic',q:'What is your favourite fused relic?',label:'Favourite fused relic'},
 {id:'fav_opponent',q:'Who is your favourite opponent?',label:'Favourite opponent'},
 {id:'least_opponent',q:'Who is your least favourite opponent?',label:'Least favourite opponent'},
 {id:'fav_online_mode',q:'What is your favourite online game mode?',label:'Favourite online mode'},
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toLocaleString(currentLocale?.()||undefined);
// Points for an answer: the whole-number % of the players who answered that question (Family Feud style).
export const points=(count,answered)=>answered?Math.round(count*100/answered):0;
// Everything the survey offered for a question, as English names (the same lists its grids showed), so the player can
// pick any of them (user, 2026-11-27: "pick an answer out of all the characters, not just a limited list").
export function surveyOptions(content,id){
 const c=content,ch=c.characters||[],fused=new Set(c.fusedRelics||[]),retired=new Set(c.retiredArtifacts||[]);
 if(/character$/.test(id))return [...new Set((c.playable||[]).map(i=>ch[i]?.name).filter(Boolean))];
 if(/opponent$/.test(id)){
  // Every character with its own CPU deck, boss decks or a tier, minus the Fallen Collectors and Copycat.
  const uc=new Set(c.ultimateCollectors||[]);
  const ids=[...new Set([...Object.keys(c.cpuDecks||{}),...Object.keys(c.bossDeckNames||{}),...ch.map((x,i)=>x&&'tier' in x?String(i):null)].filter(Boolean).map(Number))];
  return [...new Set(ids.filter(i=>!uc.has(i)&&ch[i]&&!ch[i].copycat).sort((a,b)=>a-b).map(i=>ch[i].name))];
 }
 if(id==='fav_online_mode')return ['Tag Duels','Draft Duels','Ultimate Collector'];
 const keys=Object.keys(c.artifacts||{}).filter(k=>!retired.has(k)&&c.artifactInfo?.[k]);
 const pick=id==='fav_shadow_relic'?k=>k.startsWith('cursed_'):id==='fav_fused_relic'?k=>fused.has(k):k=>!k.startsWith('cursed_')&&!fused.has(k);
 return [...new Set(keys.filter(pick).map(k=>c.artifacts[k][0]))];
}
// A round: its board (the top answers) and every choice, sorted by the name the player reads. An answer the survey
// recorded but the game no longer offers still joins the choices, so every board answer can be picked.
export function roundOptions(question,names=[],label=x=>x,lang){
 const counts=new Map(question.counts),entry=name=>({name,count:counts.get(name)||0,pts:points(counts.get(name)||0,question.answered)});
 const board=question.counts.slice(0,BOARD).map(([name])=>entry(name));
 const choices=[...new Set([...names,...question.counts.map(([n])=>n)])].map(entry);
 if(names.length>3)choices.sort((a,b)=>String(label(a.name)).localeCompare(String(label(b.name)),lang));
 return {board,choices,all:choices};
}
// Best possible score: the top answer of every round.
export const bestScore=data=>ROUNDS.reduce((n,r)=>n+(roundOptions(data.questions[r.id]).board[0]?.pts||0),0);
export function rankTitle(score,best){const k=best?score/best:0;return k>=.85?'Survey Master':k>=.6?'Crowd Reader':k>=.35?'Rising Duelist':'Wild Card'}

let data=null,ctx=null,quiz=null,run=0,bound=false,css=null;
const loadData=()=>data?Promise.resolve(data):fetch('survey-results.json').then(r=>{if(!r.ok)throw Error('Survey results missing');return r.json()}).then(d=>data=d);
// The stylesheet loads with the module, never at boot.
function loadCss(){css??=new Promise(resolve=>{const l=document.createElement('link');l.rel='stylesheet';l.href='survey-results.css';l.onload=l.onerror=resolve;document.head.append(l)});return css}
const later=(ms,fn)=>{const id=run;setTimeout(()=>{if(id===run&&ctx.modal.open&&ctx.modal.classList.contains('feud-modal'))fn()},ms)};
const reduced=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// English answer name -> picture, the same ones the survey's tiles showed.
let art=null;
function picture(name){
 if(!art){
  art=new Map();const c=ctx.content;
  for(const ch of c.characters||[])if(ch?.sprite&&!art.has(ch.name))art.set(ch.name,{src:`assets/${ch.sprite}`,face:true});
  for(const [k,row] of Object.entries(c.artifacts||{})){const a=c.artifactInfo?.[k]?.art;if(a&&!art.has(row[0]))art.set(row[0],{src:relicImage(a)})}
  for(const [name,code] of [['Tag Duels',81332143],['Draft Duels',3549275],['Ultimate Collector',COLLECTOR_MENU_CARD[1]]])art.set(name,{src:`assets/menu/${code}.jpg`});
 }
 return art.get(name)||{src:''};
}
const img=(name,cls='')=>{const p=picture(name);return p.src?`<img class="${cls} ${p.face?'face':''}" loading="lazy" decoding="async" src="${esc(p.src)}" alt="">`:`<span class="${cls}"></span>`};

export async function openSurveyResults(what,context){
 ctx=context;
 if(!bound){bound=true;ctx.modal.addEventListener('click',onClick);ctx.modal.addEventListener('input',onSearch)}
 await Promise.all([loadData(),loadCss()]);
 ctx.hooks.music?.(QUIZ_MUSIC);
 if(what==='results')results();else intro();
}
function show(html,cls=''){
 run++;
 ctx.dialog('',`<div class="feud ${cls}">${html}</div>`);
 ctx.modal.classList.remove('survey-modal');ctx.modal.classList.add('feud-modal');
 ctx.modal.scrollTop=0;
}
const lights='<div class="feud-lights" aria-hidden="true"><i></i><i></i><i></i></div>';

// Magical Hats: three hats shuffle, the middle one lifts and Dark Magician Girl comes out, then the lights come on.
function intro(){
 const hat='<img class="feud-hat" src="assets/random-hat.png" alt="">';
 show(`${lights}<div class="feud-intro"><div class="feud-hats" aria-hidden="true"><div class="feud-hat-slot a">${hat}</div><div class="feud-hat-slot b"><img class="feud-dmg" src="assets/cards/${DMG}.jpg" alt="">${Array.from({length:10},(_,i)=>`<i class="feud-spark" style="--a:${i*36}deg;--d:${(i%3)*.12}s"></i>`).join('')}${hat}</div><div class="feud-hat-slot c">${hat}</div></div><div class="feud-title"><p class="feud-kicker">10K player survey</p><h2>Survey says!</h2><p>${esc(`We asked ${num(data.players)} players. Guess their most popular answers: each pick scores the % of players who gave it.`)}</p><button class="primary feud-go" data-feud="start">Start the quiz</button><button class="feud-link" data-feud="results">Skip to the results</button></div></div>`,`feud-stage-intro ${reduced()?'still':''}`);
 effectSound('assets/sfx/rare-shimmer.wav',.8);
 later(reduced()?0:1500,()=>{summonVoice(DMG)});
}

function startQuiz(){quiz={round:0,score:0,picks:[]};round()}
function round(){
 const r=ROUNDS[quiz.round],q=data.questions[r.id],o=roundOptions(q,surveyOptions(ctx.content,r.id),t,currentLanguage());quiz.options=o;quiz.picked=false;
 const panel=(x,i)=>x?`<div class="feud-panel" data-name="${esc(x.name)}"><div class="feud-flip"><div class="feud-front"><b>${i+1}</b></div><div class="feud-back">${img(x.name,'feud-panel-img')}<span class="feud-answer">${esc(x.name)}</span><em>${x.pts}</em></div></div></div>`:'<div class="feud-panel empty"></div>';
 show(`${lights}<div class="feud-round"><div class="feud-top"><span class="feud-kicker">${esc(`Round ${quiz.round+1} of ${ROUNDS.length}`)}</span><span class="feud-score"><span>Score</span> <b>${quiz.score}</b></span></div><p class="feud-asked">${esc(`We asked ${num(q.answered)} players:`)}</p><h3 class="feud-question">${esc(r.q)}</h3><div class="feud-board ${o.board.length<4?'short':''}">${o.board.map(panel).join('')}<div class="feud-strike" aria-hidden="true">✕</div></div><p class="feud-hint">Pick the answer you think most players gave.</p><div class="feud-after"></div>${o.choices.length>=SEARCH_FROM?'<input class="feud-search" type="search" placeholder="Search" aria-label="Search">':''}<div class="feud-choices ${r.id==='fav_online_mode'?'wide':''}">${o.choices.map(x=>`<button class="feud-choice" data-feud="pick" data-name="${esc(x.name)}">${img(x.name)}<span>${esc(x.name)}</span></button>`).join('')}</div></div>`,'feud-stage-round');
}
function pick(name){
 if(quiz.picked)return;quiz.picked=true;
 const r=ROUNDS[quiz.round],o=quiz.options,choice=o.all.find(x=>x.name===name);if(!choice)return;
 const root=ctx.modal,onBoard=o.board.some(x=>x.name===name);
 for(const b of root.querySelectorAll('.feud-choice')){b.disabled=true;b.classList.toggle('picked',b.dataset.name===name)}
 const search=root.querySelector('.feud-search');if(search)search.disabled=true;
 root.querySelector('.feud-asked')?.scrollIntoView?.({block:'start',behavior:reduced()?'auto':'smooth'});
 quiz.score+=choice.pts;quiz.picks.push({id:r.id,name,pts:choice.pts,onBoard});
 const after=root.querySelector('.feud-after'),hint=root.querySelector('.feud-hint');
 if(hint)hint.innerHTML='<span class="feud-says">Survey says…</span>';
 const flip=el=>el?.classList.add('open');
 later(reduced()?150:800,()=>{
  if(onBoard){const mine=[...root.querySelectorAll('.feud-panel')].find(p=>p.dataset.name===name);mine?.classList.add('mine');flip(mine);effectSound('assets/sfx/reward-ding.wav')}
  else{root.querySelector('.feud-strike')?.classList.add('on');effectSound('assets/sfx/negation.wav')}
  const s=root.querySelector('.feud-score b');if(s){s.textContent=quiz.score;s.parentElement.classList.add('bump')}
  if(hint)hint.innerHTML=onBoard?`<span class="feud-gain">+${choice.pts}</span> <span>${esc(`${choice.pts}% of players picked it.`)}</span>`:`<span class="feud-miss">Not on the board!</span> <span>${esc(!choice.count?'No one picked it.':!choice.pts?'Less than 1% of players picked it.':`Only ${choice.pts}% of players picked it.`)}</span>`;
  const rest=[...root.querySelectorAll('.feud-panel:not(.open):not(.empty)')];
  rest.forEach((p,i)=>later((reduced()?0:500)+i*(reduced()?0:260),()=>{flip(p);if(!i)effectSound('assets/sfx/card-reveal.wav',.7)}));
  later((reduced()?0:600)+rest.length*(reduced()?0:260),()=>{if(after)after.innerHTML=`<button class="primary" data-feud="next">${quiz.round+1<ROUNDS.length?'Next question':'See your score'}</button>`});
 });
}
function next(){quiz.round++;if(quiz.round<ROUNDS.length)round();else finish()}

function finish(){
 const best=bestScore(data),title=rankTitle(quiz.score,best);
 ctx.saveQuiz({score:quiz.score,best,picks:quiz.picks,at:Date.now()});
 show(`${lights}<div class="feud-final"><p class="feud-kicker">10K player survey</p><h2>Your score</h2><p class="feud-big">${quiz.score}</p><p class="feud-rank">${esc(title)}</p><p class="muted">${esc(`Best possible: ${best}`)}</p><canvas class="run-card-canvas feud-canvas" width="1080" height="1350" aria-label="Your survey quiz score"></canvas><p class="run-card-status feud-status" role="status"></p><div class="survey-actions feud-share"><button data-feud="copy" disabled>Copy image</button><button data-feud="save" disabled>Download</button><span class="survey-spacer"></span><button class="primary" data-feud="results">Continue to results</button></div></div>`,'feud-stage-final');
 effectSound('assets/sfx/perfect-chime.wav');
 const canvas=ctx.modal.querySelector('.feud-canvas');
 drawShareImage(canvas,{score:quiz.score,best,title,picks:quiz.picks}).then(()=>{if(canvas.isConnected)ctx.modal.querySelectorAll('[data-feud="copy"],[data-feud="save"]').forEach(b=>b.disabled=false)}).catch(e=>{console.error(e);const s=ctx.modal.querySelector('.feud-status');if(s)s.textContent='The score image could not be drawn.'});
}

// ---- Score image (1080 × 1350, like the run card) ----
const W=1080,H=1350,GOLD='#ffd76e',INK='#f4f8ff',SOFT='#a9bde0',DISPLAY='Impact,"YGO Display","Arial Black",sans-serif',UI='Arial,"Helvetica Neue",sans-serif';
const loadImage=src=>new Promise(resolve=>{if(!src)return resolve(null);const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src});
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function fit(c,text,max,size,font){let s=size;do{c.font=font.replace('{s}',s)}while(c.measureText(text).width>max&&--s>12);return s}
export async function drawShareImage(canvas,{score,best,title,picks}){
 const pics=await Promise.all(picks.map(p=>loadImage(picture(p.name).src)));
 const hat=await loadImage('assets/random-hat.png');await displayFont();
 const c=canvas.getContext('2d');
 // Studio: deep blue, two gold spotlights from the top corners.
 let g=c.createRadialGradient(W/2,H*.35,80,W/2,H*.45,H*.85);g.addColorStop(0,'#1f3c8f');g.addColorStop(.55,'#0c1a4a');g.addColorStop(1,'#040818');c.fillStyle=g;c.fillRect(0,0,W,H);
 for(const [x,dir] of [[0,1],[W,-1]]){c.save();c.globalCompositeOperation='lighter';const b=c.createLinearGradient(x,0,x+dir*700,H*.8);b.addColorStop(0,'rgba(255,224,140,.28)');b.addColorStop(1,'rgba(255,224,140,0)');c.fillStyle=b;c.beginPath();c.moveTo(x,0);c.lineTo(x+dir*760,H*.85);c.lineTo(x+dir*420,H*.95);c.closePath();c.fill();c.restore()}
 // Frame of bulbs.
 c.strokeStyle=GOLD;c.lineWidth=10;rr(c,22,22,W-44,H-44,34);c.stroke();
 c.fillStyle='#fff3c4';for(let i=0;i<26;i++){const x=60+i*(W-120)/25;for(const y of [22,H-22]){c.beginPath();c.arc(x,y,6,0,7);c.fill()}}
 if(hat)c.drawImage(hat,W-250,64,170,138);
 c.textAlign='center';c.textBaseline='alphabetic';
 c.fillStyle=SOFT;fit(c,t('10K player survey').toUpperCase(),W-420,40,`700 {s}px ${UI}`);c.fillText(t('10K player survey').toUpperCase(),W/2,118);
 c.fillStyle=GOLD;fit(c,t('Survey says!'),W-360,96,`700 {s}px ${DISPLAY}`);c.fillText(t('Survey says!'),W/2,206);
 c.fillStyle=SOFT;fit(c,t('Family Feud style quiz'),W-200,32,`{s}px ${UI}`);c.fillText(t('Family Feud style quiz'),W/2,252);
 // Score board.
 const bx=190,by=286,bw=W-380,bh=220;g=c.createLinearGradient(0,by,0,by+bh);g.addColorStop(0,'#2a5bd7');g.addColorStop(1,'#122c7a');c.fillStyle=g;rr(c,bx,by,bw,bh,28);c.fill();c.strokeStyle=GOLD;c.lineWidth=6;c.stroke();
 c.fillStyle=SOFT;c.font=`700 30px ${UI}`;c.fillText(t('Your score').toUpperCase(),W/2,by+52);
 c.fillStyle='#ffffff';c.font=`150px ${DISPLAY}`;c.fillText(String(score),W/2,by+182);
 c.fillStyle=GOLD;fit(c,t(title),bw-40,40,`700 {s}px ${UI}`);c.fillText(t(title),W/2,by+bh+52);
 c.fillStyle=SOFT;c.font=`26px ${UI}`;c.fillText(t(`Best possible: ${best}`),W/2,by+bh+90);
 // One row per round: picture, question, the pick and its points (a red ✕ when it was not on the board).
 const top=by+bh+122,rowH=72,P=52;
 picks.forEach((p,i)=>{
  const y=top+i*rowH,round=ROUNDS.find(r=>r.id===p.id);
  c.fillStyle=i%2?'rgba(20,40,100,.75)':'rgba(30,58,140,.75)';rr(c,70,y,W-140,rowH-8,14);c.fill();
  const pic=pics[i];if(pic){c.save();rr(c,82,y+6,P,P,10);c.clip();const s=Math.max(P/pic.width,P/pic.height),w=pic.width*s,h=pic.height*s;c.drawImage(pic,82+(P-w)/2,y+6+(picture(p.name).face?0:(P-h)/2),w,h);c.restore()}
  c.textAlign='left';c.fillStyle=SOFT;fit(c,t(round?.label||''),W-430,20,`{s}px ${UI}`);c.fillText(t(round?.label||''),150,y+26);
  c.fillStyle=INK;fit(c,t(p.name),W-430,30,`700 {s}px ${UI}`);c.fillText(t(p.name),150,y+55);
  c.textAlign='center';
  if(!p.onBoard){c.fillStyle='#ff5a5a';c.font=`48px ${DISPLAY}`;c.fillText('✕',W-212,y+50)}
  c.fillStyle=p.onBoard?'#ffffff':'#d7deef';rr(c,W-170,y+8,86,rowH-24,10);c.fillStyle=p.onBoard?'#e2a21b':'#3b4a72';c.fill();c.fillStyle='#fff';c.font=`40px ${DISPLAY}`;c.fillText(String(p.pts),W-127,y+48);
 });
 c.textAlign='center';c.fillStyle=SOFT;c.font=`24px ${UI}`;c.fillText(`YGO Rogue Duelist · v${replayVersion} · ${t(`${num(data.players)} players answered`)}`,W/2,H-52);
 canvas.dataset.ready='1';
 // Shown as an <img> too, so a long-press / right-click "Copy image" works where scripts can't copy.
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(blob&&canvas.isConnected){const im=new Image();im.className='feud-canvas-image';im.alt=t('Your survey quiz score');im.src=URL.createObjectURL(blob);await im.decode().catch(()=>{});if(canvas.isConnected){canvas.style.display='none';canvas.after(im)}}
}

// ---- Full results, in the style of the survey report (tools/survey_report_template.html) ----
const pct=(n,total)=>total?Math.round(n*1000/total)/10:0;
function diverging(favKey,leastKey,all=false){
 const f=data.questions[favKey],l=data.questions[leastKey],fm=new Map(f.counts),lm=new Map(l.counts);
 const names=[...new Set([...fm.keys(),...lm.keys()])];
 const rows=names.map(n=>({n,f:fm.get(n)||0,l:lm.get(n)||0})).sort((a,b)=>(b.f-b.l)-(a.f-a.l)||b.f-a.f);
 const max=Math.max(1,...rows.map(r=>Math.max(r.f,r.l))),limit=8,shown=all||rows.length<=limit*2?rows:[...rows.slice(0,limit),...rows.slice(-limit)];
 const row=r=>`<div class="svr-row"><div class="svr-who">${img(r.n,'svr-face')}<span>${esc(r.n)}</span></div><div class="svr-half l" title="${pct(r.l,l.answered)}%">${r.l?`<span class="svr-n">${r.l}</span>`:''}<i style="width:${r.l/max*85}%"></i></div><div class="svr-half r" title="${pct(r.f,f.answered)}%"><i style="width:${r.f/max*85}%"></i>${r.f?`<span class="svr-n">${r.f}</span>`:''}</div><div class="svr-net">${r.f-r.l>0?'+':''}${r.f-r.l}</div></div>`;
 return `<div class="svr-legend"><span><i class="svr-key least"></i><span>Least favourite</span> (${num(l.answered)})</span><span><i class="svr-key fav"></i><span>Favourite</span> (${num(f.answered)})</span></div><div class="svr-dv">${shown.map(row).join('')}</div>${rows.length>limit*2?`<button class="feud-link" data-feud="${all?'less':'more'}" data-pair="${favKey}">${all?esc('Show top and bottom only'):esc(`Show all ${rows.length}`)}</button>`:''}`;
}
function podium(key,title){
 const q=data.questions[key],top=q.counts.slice(0,10),[a,b,c]=top;
 const step=(x,cls,place)=>x?`<div class="svr-step ${cls}">${img(x[0])}<span class="svr-nm">${esc(x[0])}</span><div class="svr-plinth">${place} · ${pct(x[1],q.answered)}%</div></div>`:'<div></div>';
 const max=top[0]?.[1]||1;
 return `<div class="svr-card"><h3>${esc(title)}</h3><p class="svr-sub">${esc(`${num(q.answered)} answers`)}</p><div class="svr-podium">${step(b,'second',2)}${step(a,'first',1)}${step(c,'third',3)}</div>${top.slice(3).map(([n,v])=>`<div class="svr-hbar"><span class="svr-t">${esc(n)}</span><span class="svr-track"><i style="width:${v/max*100}%"></i><em>${pct(v,q.answered)}%</em></span></div>`).join('')}</div>`;
}
function results(){
 const q=data.questions,modes=q.fav_online_mode,colors=['var(--svr-s1)','var(--svr-s2)','var(--svr-s3)'];
 const places=data.places;
 const placeMax=places.top[0]?.[1]||1,mine=ctx.quizResult();
 show(`<div class="svr"><header class="svr-head"><div><h2>10K player survey results</h2><p class="svr-sub">${esc(`${num(data.players)} players answered. Thank you!`)}</p></div>${mine?`<p class="svr-mine"><span>Your quiz score</span> <b>${mine.score}</b></p>`:''}</header>
<section class="svr-tiles"><div class="svr-tile"><b>${num(data.players)}</b><span>players answered</span></div><div class="svr-tile"><b>${num(places.count)}</b><span>places represented</span></div><div class="svr-tile"><b class="word">${esc(q.fav_character.counts[0]?.[0]||'—')}</b><span>most loved character</span></div><div class="svr-tile"><b class="word">${esc(modes.counts[0]?.[0]||'—')}</b><span>favourite online mode</span></div></section>
<section class="svr-card"><h3>Characters: loved vs. disliked</h3><p class="svr-sub">Favourite picks grow right, least favourite picks grow left.</p><div data-pair-box="fav_character">${diverging('fav_character','least_character')}</div></section>
<section class="svr-card"><h3>Opponents: loved vs. disliked</h3><p class="svr-sub">Who players enjoy facing, and who they dread.</p><div data-pair-box="fav_opponent">${diverging('fav_opponent','least_opponent')}</div></section>
<h3 class="svr-section">Favourite relics</h3><section class="svr-grid3">${podium('fav_relic','Favourite normal relic')}${podium('fav_shadow_relic','Favourite shadow relic')}${podium('fav_fused_relic','Favourite fused relic')}</section>
<section class="svr-card"><h3>Favourite online mode</h3><p class="svr-sub">${esc(`${num(modes.answered)} answers`)}</p><div class="svr-stack">${modes.counts.map(([n,v],i)=>`<div style="flex:${v};background:${colors[i%3]}">${pct(v,modes.answered)}%</div>`).join('')}</div><div class="svr-modes">${modes.counts.map(([n,v],i)=>`<div class="svr-mode">${img(n)}<div><b style="color:${colors[i%3]}">${pct(v,modes.answered)}%</b><span>${esc(n)}</span></div></div>`).join('')}</div></section>
<section class="svr-card"><h3>Where players are from</h3><p class="svr-sub">${esc(`${num(places.answered)} players told us`)}</p><div class="svr-places"><div class="svr-map-box"><div class="svr-map" data-no-i18n aria-label="${esc(t('World map of where players are from'))}"></div><div class="svr-map-tip" data-no-i18n role="status" hidden></div><div class="svr-zoom"><button type="button" data-zoom="in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" data-zoom="out" aria-label="Zoom out" title="Zoom out">−</button><button type="button" data-zoom="reset" aria-label="Reset zoom" title="Reset zoom">⟲</button></div><div class="svr-legend svr-map-legend"><i class="svr-swatch"></i><span>No players</span><i class="svr-ramp" style="background:${RAMP_CSS}"></i><span>25%+</span><span class="svr-map-hint">Hover or tap a country. Scroll or pinch to zoom.</span></div></div><div class="svr-place-list" data-no-i18n>${places.top.slice(0,12).map(([code,v])=>`<div class="svr-hbar" data-c="${code}"><span class="svr-t">${esc(regionName(code))}</span><span class="svr-track"><i style="width:${v/placeMax*100}%"></i><em>${pct(v,places.answered)}%</em></span></div>`).join('')}</div></div></section>
<div class="survey-actions svr-actions"><button data-feud="start">${mine?'Play the quiz again':'Play the quiz'}</button><span class="survey-spacer"></span><button class="primary" data-do="close">Close</button></div></div>`,'feud-stage-results');
 void drawMap();
}

// ---- Where players are from: a world map (survey-map.json, tools/survey_map.py; Natural Earth, public domain) ----
// Each country's blue deepens with its share of the players who answered: white at 0%, dark blue at 25% or more (user,
// 2026-11-27). Hover or tap shows the count. One SVG, colours set once; hovering only moves the tooltip.
let map=null,regions=null;
const loadMap=()=>map??=fetch('survey-map.json').then(r=>{if(!r.ok)throw Error('Map missing');return r.json()}).catch(e=>{map=null;throw e});
function regionName(code){
 if(regions?.lang!==currentLanguage()){let f=null;try{f=new Intl.DisplayNames([currentLanguage()],{type:'region'})}catch{}regions={lang:currentLanguage(),f}}
 try{return regions.f?.of(code)||code}catch{return code}
}
// White at 0 players, bright blue from 1 player, dark blue (#08306b) at 25% or more (user, 2026-11-27: "white is 0
// players, bright blue is 1 player and dark blue is 25% of players"). The square root spreads the many small shares
// apart, so 2% and 8% don't look the same.
const RAMP=[[105,195,255],[40,130,235],[16,76,160],[8,48,107]];
export function placeColor(share){
 if(!(share>0))return 'rgb(255,255,255)';
 const k=Math.sqrt(Math.min(1,share/25))*(RAMP.length-1),i=Math.min(RAMP.length-2,Math.floor(k)),f=k-i;
 return `rgb(${RAMP[i].map((a,j)=>Math.round(a+(RAMP[i+1][j]-a)*f)).join(',')})`;
}
export const RAMP_CSS=`linear-gradient(90deg,${RAMP.map(c=>`rgb(${c})`).join(',')})`;
function placeInfo(code){
 const p=data.places,n=new Map(p.top).get(code);
 if(n)return {n,share:n*100/p.answered,text:t(`${num(n)} players (${pct(n,p.answered)}%)`)};
 if(p.few.includes(code))return {n:0,share:1.5*100/p.answered,text:t('1–2 players')};
 return {n:0,share:0,text:t('No players')};
}
async function drawMap(){
 const box=ctx.modal.querySelector('.svr-map');if(!box)return;
 let m;try{m=await loadMap()}catch{box.closest('.svr-map-box')?.remove();return}
 if(!box.isConnected)return;
 const shape=([code,d])=>`<path d="${d}" data-c="${code}" fill="${code?placeColor(placeInfo(code).share):'#ffffff'}"/>`;
 const dot=([code,x,y])=>`<circle cx="${x}" cy="${y}" r="3.2" data-c="${code}" fill="${placeColor(placeInfo(code).share)}"/>`;
 box.style.aspectRatio=`${m.w}/${m.h}`;box.innerHTML=`<svg viewBox="0 0 ${m.w} ${m.h}" role="img" aria-hidden="true"><g class="svr-lands">${m.paths.map(shape).join('')}</g><g class="svr-dots">${m.dots.map(dot).join('')}</g></svg>`;
 const svg=box.firstElementChild,tip=ctx.modal.querySelector('.svr-map-tip'),dots=[...svg.querySelectorAll('circle')];let pinned=null,current=null;
 const show=(el,e)=>{
  const code=el?.dataset.c;
  if(current&&current!==el)current.classList.remove('on');
  if(!code){current=null;tip.hidden=true;return}
  // Only a new country touches the DOM; moving within one just moves the tooltip.
  if(el!==current){current=el;el.classList.add('on');if(el.tagName==='path')el.parentNode.append(el);const info=placeInfo(code);tip.innerHTML=`<b>${esc(regionName(code))}</b><span>${esc(info.text)}</span>`;tip.hidden=false}
  const r=box.parentElement.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,er=el.getBoundingClientRect();
  const x=e?e.clientX-r.left:er.left+er.width/2-r.left,y=e?e.clientY-r.top:er.top+er.height/2-r.top;
  tip.style.left=Math.max(4,Math.min(r.width-w-4,x+12))+'px';tip.style.top=Math.max(4,y-h-10)+'px';
 };
 // Zoom and pan (user, 2026-11-27) by moving the viewBox: mouse wheel, pinch, drag, and the + / − / reset buttons.
 // Up to 12×; dots keep their size on screen. Zoomed out, one finger still scrolls the page.
 const W=m.w,H=m.h,MAX=12,view={x:0,y:0,w:W,h:H};let frame=0;
 const apply=()=>{frame=0;svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);const r=(3.2*view.w/W).toFixed(2);for(const c of dots)c.setAttribute('r',r);
  const zoomed=view.w<W-.5;svg.style.touchAction=zoomed?'none':'pan-y';box.classList.toggle('zoomed',zoomed)};
 const clamp=()=>{view.w=Math.max(W/MAX,Math.min(W,view.w));view.h=view.w*H/W;view.x=Math.max(0,Math.min(W-view.w,view.x));view.y=Math.max(0,Math.min(H-view.h,view.y))};
 const schedule=()=>{clamp();frame||=requestAnimationFrame(apply)};
 const point=(cx,cy)=>{const r=svg.getBoundingClientRect();return [(cx-r.left)/r.width,(cy-r.top)/r.height]};
 const zoomAt=(factor,fx=.5,fy=.5)=>{const nw=Math.max(W/MAX,Math.min(W,view.w/factor)),nh=nw*H/W;view.x+=(view.w-nw)*fx;view.y+=(view.h-nh)*fy;view.w=nw;schedule()};
 svg.addEventListener('wheel',e=>{e.preventDefault();const [fx,fy]=point(e.clientX,e.clientY);zoomAt(Math.pow(1.0015,-e.deltaY*(e.deltaMode===1?33:1)),fx,fy)},{passive:false});
 const touches=new Map();let drag=null,moved=false,pinch=null;
 svg.addEventListener('pointerdown',e=>{
  touches.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
  if(touches.size===2){const [a,b]=[...touches.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,w:view.w};drag=null}
  else if(touches.size===1)drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};
 });
 svg.addEventListener('pointermove',e=>{
  const p=touches.get(e.pointerId);
  if(p){p.x=e.clientX;p.y=e.clientY;
   const r=svg.getBoundingClientRect();
   if(pinch&&touches.size===2){const [a,b]=[...touches.values()],[fx,fy]=point((a.x+b.x)/2,(a.y+b.y)/2),target=pinch.w*pinch.d/(Math.hypot(a.x-b.x,a.y-b.y)||1);moved=true;zoomAt(view.w/target,fx,fy);return}
   if(drag&&(moved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)&&view.w<W-.5){
    if(!moved){moved=true;svg.setPointerCapture?.(e.pointerId);show(null);pinned=null}
    view.x=drag.vx-(e.clientX-drag.x)*view.w/r.width;view.y=drag.vy-(e.clientY-drag.y)*view.h/r.height;schedule();return}
  }
  if(e.pointerType==='mouse'&&!pinned&&!moved)show(e.target.closest('[data-c]'),e);
 });
 const lift=e=>{touches.delete(e.pointerId);if(touches.size<2)pinch=null;if(!touches.size)drag=null};
 svg.addEventListener('pointerup',lift);svg.addEventListener('pointercancel',lift);
 svg.addEventListener('pointerleave',()=>{if(!pinned&&!touches.size)show(null)});
 // A tap (or click) keeps the country shown until another one, or the sea, is tapped. A drag is not a tap.
 svg.addEventListener('click',e=>{if(moved){moved=false;return}const el=e.target.closest('[data-c]');pinned=el?.dataset.c?el:null;show(pinned,e)});
 box.parentElement.querySelector('.svr-zoom')?.addEventListener('click',e=>{const b=e.target.closest('[data-zoom]');if(!b)return;const z=b.dataset.zoom;
  if(z==='reset'){view.x=view.y=0;view.w=W;schedule()}else zoomAt(z==='in'?1.6:1/1.6)});
 // Hovering a row of the list lights its country on the map.
 const list=ctx.modal.querySelector('.svr-place-list');
 list?.addEventListener('pointerover',e=>{const row=e.target.closest('[data-c]');if(!row||pinned)return;const el=svg.querySelector(`[data-c="${row.dataset.c}"]`);if(el)show(el)});
 list?.addEventListener('pointerleave',()=>{if(!pinned)show(null)});
 apply();
}

// Search the choices by the names on screen (translated), accent-insensitive like the survey's grids.
function onSearch(e){
 if(!e.target.matches?.('.feud-search'))return;
 const q=foldSearch(e.target.value.trim());
 for(const b of ctx.modal.querySelectorAll('.feud-choice'))b.hidden=!!q&&!foldSearch(b.textContent).includes(q);
}
function onClick(e){
 const el=e.target.closest?.('[data-feud]');if(!el||!ctx.modal.contains(el)||!ctx.modal.classList.contains('feud-modal'))return;
 const a=el.dataset.feud;
 if(a==='start')startQuiz();
 else if(a==='pick')pick(el.dataset.name);
 else if(a==='next')next();
 else if(a==='results')results();
 else if(a==='more'||a==='less'){const box=el.closest('[data-pair-box]'),fav=box?.dataset.pairBox;if(fav)box.innerHTML=diverging(fav,fav==='fav_character'?'least_character':'least_opponent',a==='more')}
 else if(a==='copy'||a==='save'){const canvas=ctx.modal.querySelector('.feud-canvas'),status=ctx.modal.querySelector('.feud-status');(a==='copy'?copyRunCard:saveRunCard)(canvas,'ygo-rogue-10k-survey-quiz').then(m=>{if(status)status.textContent=m}).catch(err=>{if(status)status.textContent=err.message||'Could not copy the image.'})}
}
