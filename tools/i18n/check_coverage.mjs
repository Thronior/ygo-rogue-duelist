// Fails when a duel option string or a hover text has no translation in one of the 8 languages (2026-11-18: a Chinese
// player on itch.io saw Yu-Jo Friendship's and Poison of the Old Man's options in English).
// Option strings: every effect string of every card in the game (content.json cards and tokens: SELECT_OPTION buttons,
// Yes/No questions, selection hints), the engine's fixed choice labels (engine.js is not scanned by the extractor) and
// the shapes engine.js builds from them ("1: …", "Activate · Name — …"), checked through the real i18n.js lookup.
// Hover texts: every title attribute in android/web/*.js and index.html, static or a template ({0} patterns), the
// string literals inside its ${…} expressions, and every .title= / setAttribute('title',…) value.
// Prompt audit (2026-11-18): every string the end-of-run card draws on its canvas, the randomized cards' option texts
// and activation labels (and that each randomizer.lua prompt names a text), the defeat reasons and the pack summaries.
// Usage: runtime/ai/node.exe tools/i18n/check_coverage.mjs [--list]   (--list prints every checked string)
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),web=path.join(root,'android/web');
const LANGS=['de','es','fr','it','ja','ko','pt','zh'];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const LETTER=/[A-Za-z]/;

// ---- Option strings -------------------------------------------------------------------------------------------------
const content=JSON.parse(read('android/web/content.json'));
const cards=[...content.cards,...content.tokenCards];
const cardStrings=new Map();
for(const c of cards)(c.strings||[]).forEach((s,i)=>{const k=norm(s);if(k&&LETTER.test(k)&&!cardStrings.has(k))cardStrings.set(k,`${c.name} [${c.id}] str${i+1}`)});
// Shapes engine.js builds around a card string, checked with real cards that have one.
const sample=cards.find(c=>c.name==='Yu-Jo Friendship')||cards.find(c=>c.strings?.[0]);
const sampleChain=cards.find(c=>c.name==='Poison of the Old Man')||sample;
// [built text, English parts that must not survive the lookup]
const shapes=[[`1: ${sample.strings[0]}`,[sample.strings[0]]],[`2: ${sample.strings[1]||sample.strings[0]}`,[sample.strings[1]||sample.strings[0]]],
 ['1: Resolve effect',['Resolve effect']],['Your monster zone 1',['Your','monster zone']],['Opponent’s spell / trap zone 3',['Opponent','spell / trap zone']],
 [`Activate · ${sampleChain.name} — ${sampleChain.strings[0]}`,['Activate',sampleChain.name,sampleChain.strings[0]]],
 [`Chain · ${sampleChain.name} — ${sampleChain.strings[1]||sampleChain.strings[0]}`,['Chain',sampleChain.name,sampleChain.strings[1]||sampleChain.strings[0]]]];

// ---- Hover texts ----------------------------------------------------------------------------------------------------
// Minimal JS tokenizer (as in extract_ui_strings.mjs): strings and templates with their ${…} sources, nested ones
// included, skipping comments and regex literals.
const KEYWORDS=new Set(['return','typeof','case','in','of','new','delete','void','throw','else','do','instanceof','yield','await']);
function scan(src){
 const out=[];let i=0;
 const regexAllowed=prev=>!prev||/[(,=:[!&|?{};+\-*%<>~^]$/.test(prev)||KEYWORDS.has(prev);
 function readString(q){const start=i;let s='';i++;while(i<src.length&&src[i]!==q){if(src[i]==='\\'){s+=src.slice(i,i+2);i+=2;continue}s+=src[i++]}i++;out.push({type:'str',quasis:[s],exprs:[],start,end:i})}
 function readRegex(){i++;let cls=false;while(i<src.length){const c=src[i];if(c==='\\'){i+=2;continue}if(c==='[')cls=true;else if(c===']')cls=false;else if(c==='/'&&!cls)break;else if(c==='\n')break;i++}i++;while(/[a-z]/i.test(src[i]||''))i++}
 function readTemplate(){
  const start=i;i++;const quasis=[''],exprs=[];
  while(i<src.length&&src[i]!=='`'){
   if(src[i]==='\\'){quasis[quasis.length-1]+=src.slice(i,i+2);i+=2;continue}
   if(src[i]==='$'&&src[i+1]==='{'){i+=2;const s=i;readExpr('}');exprs.push(src.slice(s,i));i++;quasis.push('');continue}
   quasis[quasis.length-1]+=src[i++];
  }
  i++;out.push({type:'tpl',quasis,exprs,start,end:i});
 }
 function readExpr(end){let depth=0,prev='';while(i<src.length){const c=src[i];if(c===end&&depth===0)return;if(c==='{'||c==='('||c==='['){depth++;prev=c;i++;continue}if(c==='}'||c===')'||c===']'){depth--;prev=c;i++;continue}if(step(prev)){prev='x';continue}if(/\s/.test(c)){i++;continue}if(/[A-Za-z_$0-9]/.test(c)){let w='';while(/[A-Za-z_$0-9]/.test(src[i]||''))w+=src[i++];prev=w;continue}prev=c;i++}}
 function step(prev){
  const c=src[i],n=src[i+1];
  if(c==='/'&&n==='/'){while(i<src.length&&src[i]!=='\n')i++;return true}
  if(c==='/'&&n==='*'){const e=src.indexOf('*/',i+2);i=e<0?src.length:e+2;return true}
  if(c==='"'||c==="'"){readString(c);return true}
  if(c==='`'){readTemplate();return true}
  if(c==='/'&&regexAllowed(prev)){readRegex();return true}
  return false;
 }
 let prev='';
 while(i<src.length){const c=src[i];if(step(prev)){prev='x';continue}if(/\s/.test(c)){i++;continue}if(/[A-Za-z_$0-9]/.test(c)){let w='';while(/[A-Za-z_$0-9]/.test(src[i]||''))w+=src[i++];prev=w;continue}prev=c;i++}
 return out;
}
const unescapeJs=s=>s.replace(/\\(u\{[0-9a-f]+\}|u[0-9a-f]{4}|x[0-9a-f]{2}|.)/gi,(m,e)=>/^u\{/i.test(e)?String.fromCodePoint(parseInt(e.slice(2,-1),16)):/^[ux]/i.test(e)?String.fromCharCode(parseInt(e.slice(1),16)):({n:'\n',t:'\t'}[e]??e));
const entities=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(m,d)=>String.fromCodePoint(+d));
const markupOf=tok=>tok.quasis.map(unescapeJs).reduce((s,q,k)=>s+(k?`\u0000${k-1}\u0000`:'')+q,'');
// Prose: a letter-bearing text that is not a class name, key or URL.
const prose=s=>{const t=s.replace(/\{\d+\}/g,'').trim();return LETTER.test(t)&&t.length>1&&!/^[a-z][\w-]*$/.test(t)&&!/^(https?:|assets\/|\.\/)/.test(t)&&!/[<>=]/.test(t)};
const hover=new Map();
const addHover=(text,where)=>{const t=norm(entities(text));if(prose(t)&&!hover.has(t))hover.set(t,where)};
// A title value given as code (a ${…} inside the attribute, or the right side of .title=): its plain string literals
// and templates (with {n} for their own expressions).
function valuesIn(code,where){
 for(const tok of scan(code)){if(tok.type==='str'||!tok.quasis.join('').includes('<')){let n=0;addHover(markupOf(tok).replace(/\u0000\d+\u0000/g,()=>`{${n++}}`),where)}}
}
// title="…" inside a markup string or template; ${…} parts become {n}, and literals inside them are values too.
function scanMarkup(markup,exprs,where){
 for(const m of markup.matchAll(/\btitle\s*=\s*"([^"]*)"/g)){
  let n=0;const used=[];
  const pattern=m[1].replace(/\u0000(\d+)\u0000/g,(x,k)=>{used.push(exprs[+k]);return `{${n++}}`});
  // A sample with the first literal of each expression (Final Countdown's 'yours'), else a number.
  const sample=used.length?m[1].replace(/\u0000(\d+)\u0000/g,(x,k)=>{const lit=scan(exprs[+k]).find(t=>t.type==='str'&&LETTER.test(t.quasis[0]));return lit?lit.quasis[0]:'3'}):null;
  addHover(pattern,sample?{where,sample:norm(entities(sample))}:where);
  for(const e of used)valuesIn(e,where);
 }
}
// Run cards keep their heading in a canvas field named title (run-card.js d.title), not a hover text.
const NOT_HOVER=/^(d|r|v|row|entry|item|meta|opts|options)\.title$/;
const files=fs.readdirSync(web).filter(f=>f.endsWith('.js')&&f!=='i18n.js');
for(const f of files){
 const src=fs.readFileSync(path.join(web,f),'utf8');
 for(const tok of scan(src)){const markup=markupOf(tok);if(/\btitle\s*=\s*"/.test(markup))scanMarkup(markup,tok.exprs,f)}
 // el.title=…  and  setAttribute('title',…)
 for(const m of src.matchAll(/([\w$.\]\)]+)\.title\s*=(?!=)|setAttribute\(\s*['"]title['"]\s*,/g)){
  if(m[1]&&(NOT_HOVER.test(m[1]+'.title')||/document$/.test(m[1])))continue;
  let i=m.index+m[0].length,depth=0;const start=i;
  for(;i<src.length;i++){const c=src[i];if('([{'.includes(c))depth++;else if(')]}'.includes(c)){if(!depth)break;depth--}else if(!depth&&(c===';'||c===','||c==='\n'))break;else if(c==="'"||c==='"'||c==='`'){const t=scan(src.slice(i,i+4000)).find(x=>x.start===0);if(t)i+=t.end-1}}
  valuesIn(src.slice(start,i),f);
 }
}
const html=read('android/web/index.html').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'');
scanMarkup(html,[],'index.html');
// engine.js choice labels: the literals passed to add()/addlist() in choices().
const engineSrc=read('android/web/engine.js');
const choicesSrc=engineSrc.slice(engineSrc.indexOf('choices(m=this.pending)'),engineSrc.indexOf('auto(m=this.pending)'));
const engineLabels=new Set();
for(const tok of scan(choicesSrc))if(tok.type==='str'){const v=norm(tok.quasis[0]);if(/[A-Za-z]/.test(v)&&/ |^[A-Z][a-z]+$/.test(v)&&!/^[A-Z_]+$/.test(v))engineLabels.add(v)}
// Zone words are checked as the whole zone label below; rock-paper-scissors never reaches the screen (the core never
// asks for it: the game decides who goes first itself).
for(const s of ['Your','Opponent’s','monster','spell / trap','Rock','Paper','Scissors'])engineLabels.delete(s);
// Helpers whose label becomes the title: mobile.js btn() with a navigation icon, and duelConfirm/duelCancel/duelDecision.
const navIcons=['draft','settings','shop','character-settings'];
for(const f of files){
 const src=fs.readFileSync(path.join(web,f),'utf8');
 for(const m of src.matchAll(/\b(btn|duelConfirm|duelCancel|duelDecision)\(\s*(?=['"`])/g)){
  const toks=scan(src.slice(m.index+m[0].length,m.index+m[0].length+4000)),first=toks.find(x=>x.start===0);if(!first)continue;
  const rest=src.slice(m.index+m[0].length+first.end,m.index+m[0].length+first.end+40);
  if(m[1]==='btn'&&!navIcons.some(a=>new RegExp(`^\\s*,\\s*'${a}'`).test(rest)))continue;
  let n=0;addHover(markupOf(first).replace(/\u0000\d+\u0000/g,()=>`{${n++}}`),`${f} ${m[1]}()`);
 }
}
// Titles built from values the scan cannot follow: [shown text, where, English parts that must not survive].
const relic=Object.values(content.artifacts).find(a=>a?.[0]&&a?.[2]);
const DYNAMIC=[
 ...['Chain','Chain sometimes','No chain','Always chain (held)'].map(s=>[s,'mobile.js chainLabel()']),
 ...['Marked Yes','Marked No','Mark this card'].map(s=>[s,'card-marks.js MARKS']),
 ['You own 1 copy','shop-badges.js',['own','copy']],['You own 2 copies','shop-badges.js',['own','copies']],
 ['Duel 3 · Win · 8,000 LP · Boss','run-progress.js tip()',['Duel','Win','Boss']],
 ['Duel 4 · Loss','run-progress.js tip()',['Duel','Loss']],['Duel 5 · Next duel','run-progress.js tip()',['Duel','Next duel']],
 [`${relic[0]}: ${relic[2]}`,'draft-ui.js relicTip()',[relic[2]]],
];
for(const [s,where,parts] of DYNAMIC)if(!hover.has(s))hover.set(s,parts?{where,parts}:where);

// ---- Prompt audit (2026-11-18) ---------------------------------------------------------------------------------------
// The end-of-run card is drawn on a canvas, so the DOM translator never sees it: run-card.js passes every string through
// i18n.t() on the way to fillText. Draw it for a set of runs (won, lost in each way, Tag, flawless, relicless, secret,
// champion, loop) with the imports stubbed and a recording canvas, and check every string it draws.
const canvasText=new Map();
{
 const src=read('android/web/run-card.js').replace(/^import .*$/gm,'').replace(/^/,"const replayVersion='0.0.0',tr=s=>s,currentLocale=()=>'en-US',saveDeckImage=async()=>'',curseIconFile=k=>k;\n");
 const runCard=await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
 let where='';const noop=()=>{},grad={addColorStop:noop};
 const ctx=new Proxy({measureText:()=>({width:0}),createLinearGradient:()=>grad,createRadialGradient:()=>grad,fillText:s=>{if(!canvasText.has(String(s)))canvasText.set(String(s),where)}},
  {get:(o,k)=>k in o?o[k]:noop,set:()=>true,has:(o,k)=>k==='letterSpacing'||k==='filter'||k in o});
 const chars=content.characters,ids=Object.keys(chars).map(Number).filter(i=>chars[i]?.name),byId=new Map(content.cards.map(c=>[c.id,c]));
 const card=id=>{const c=byId.get(id);return c&&{...c,data:{type:c.type}}},killer=content.cards.find(c=>c.name==='Blue-Eyes White Dragon')||content.cards[0];
 const timeline=(n,won)=>Array.from({length:n},(_,i)=>({duel:i+1,opponent:ids[(i+3)%ids.length],won:won||i<n-1,lp_after_healing:8000,curses:['drain']}));
 const base={character:ids[0],challenge_level:2,round:8,started_at:1700000000,finished_at:1700004000,artifacts:Object.keys(content.artifacts).filter(k=>content.artifactInfo[k]).slice(0,3),
  stats:{damage_dealt:1,attacks_declared:1,monsters_summoned:1,cards_activated:1,bosses_defeated:1,packs_bought:1,coins_earned:1,coins_spent:1,damage_taken:5},gold:3,selected:[0],pool:[killer.id]};
 const lost={...base,stage:'gameover',timeline:timeline(9)},won={...base,stage:'complete',round:9,timeline:timeline(9,true)},tag={mode:'tag',partner:ids[1]},flawless={stats:{...base.stats,damage_taken:0}};
 const runs={attacked:{...lost,loss:{text:`Attacked by ${killer.name} — 3,000 damage`,card:killer.id,damage:3000}},effect:{...lost,loss:{text:`Defeated by the effect of "${killer.name}"`,card:killer.id}},
  'no duel played':{...lost,round:0,timeline:[],artifacts:[]},'decked out':{...lost,round:1,timeline:timeline(2),loss:{text:'Decked out: unable to draw during the Draw Phase'}},
  'Tag loss':{...lost,...tag,round:4,timeline:timeline(5),loss:{text:'Your life points reached 0'}},won,flawless:{...won,...flawless},'flawless Tag':{...won,...tag,...flawless},
  'Tag win':{...won,...tag,finished_at:1700009000},relicless:{...won,challenge_level:-1},secret:{...won,secret_challenge:true},
  champion:{...won,encore_won:true,loop:1,timeline:timeline(9,true).map(x=>({...x,loop:2}))},'2004 champion':{...won,encore_won:true,encore_opponent:0}};
 const finalChallengeName=r=>(r.encore_opponent??(r.encore_won?0:r.loop>=1?75:0))===75?(chars[75]?.name||'Obelisk the Tormenter'):'2004 World Champion';
 for(const [name,r] of Object.entries(runs)){
  where=`run-card.js (${name})`;
  const d=runCard.runCardData(r,{content,character:chars[r.character],card,cardImage:()=>null,relicImage:()=>null,finalChallengeName});
  runCard.drawRunCard({getContext:()=>ctx},{...d,portrait:null,tag:d.tag&&{...d.tag,portrait:null},relics:d.relics.map(x=>({...x,img:null})),curses:d.curses.map(x=>({...x,img:null})),
   deck:d.deck&&{main:[],extra:[]},outcome:d.outcome&&{...d.outcome,card:null},textures:{}});
 }
}
// Names stay as they are (characters; cards are translated by the card database), as do the roman duel numbers and the
// game's name in the footer.
const properNames=new Set([...Object.values(content.characters).map(c=>c?.name),...content.cards.map(c=>c.name)].filter(Boolean).flatMap(n=>[n,n.toUpperCase()]));
const keptAsIs=s=>!LETTER.test(s)||properNames.has(s)||/^[IVXLCDM]+$/.test(s)||/^YGO ROGUE DUELIST/.test(s);
for(const [s] of canvasText)if(keptAsIs(s))canvasText.delete(s);

// Randomized cards: the option and question texts randomizer.lua shows (data/randomizer/prompt-strings.json, merged into
// the system strings), every activation label randomizer.py gives a card, and its upkeep question.
const promptStrings=JSON.parse(read('data/randomizer/prompt-strings.json'));
const randomizedPrompts=new Map(Object.entries(promptStrings).filter(([k])=>!k.startsWith('_')).map(([k,v])=>[v,`prompt-strings.json ${k}`]));
{
 const py=read('randomizer.py');
 for(const m of py.matchAll(/\blabel='([^']+)'/g))randomizedPrompts.set(m[1],'randomizer.py ACTS label');
 randomizedPrompts.set('Pay LP to keep "{0}"?','randomizer.py _strings');
}
// randomizer.lua prompts must name a text: a card string that exists (aux.Stringid of a real card), an R.Text entry, or a
// system string. A bare 0/1 description showed "1: Resolve effect" / "2: Normal Summon" (2026-11-18).
const luaProblems=[];
{
 const lua=read('data/randomizer/randomizer.lua'),textIds=new Set(Object.keys(promptStrings)),byIdAll=new Map(cards.map(c=>[c.id,c]));
 const rText=Object.fromEntries([.../(\w+)=(19\d{8})/g[Symbol.matchAll](lua.slice(lua.indexOf('R.Text={'),lua.indexOf('}',lua.indexOf('R.Text={'))))].map(m=>[m[1],m[2]]));
 for(const m of lua.matchAll(/R\.Text\.(\w+)/g))if(!textIds.has(rText[m[1]]||''))luaProblems.push(`R.Text.${m[1]} has no text in prompt-strings.json`);
 for(const m of lua.matchAll(/aux\.Stringid\((\d+),(\d+)\)/g)){const c=byIdAll.get(+m[1]);if(!c?.strings?.[+m[2]])luaProblems.push(`aux.Stringid(${m[1]},${m[2]}): ${c?`"${c.name}" has no string ${m[2]}`:'card not in the game'}`)}
 // A randomized card holds only 2 strings (randomizer.py _strings: its activation label and the upkeep question), so a
 // block asking with its own string 2 or above shows an empty text once it joins the random rotation (real-card blocks
 // do, randomizer.py ROTATION). Name the text: aux.Stringid(<real card id>,n) or R.Text.
 for(const m of lua.matchAll(/aux\.Stringid\((e:GetHandler\(\):GetOriginalCode\(\)|c:GetOriginalCode\(\)|c:GetCode\(\)|id|code),(\d+)\)/g))if(+m[2]>=2)luaProblems.push(`${m[0]}: a randomized card has no string ${m[2]}`);
 for(const m of lua.matchAll(/Duel\.(SelectOption|SelectYesNo)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)){
  const args=m[2].split(',').slice(1).map(a=>a.trim());
  if(args.some(a=>/^\d+$/.test(a)&&+a<20))luaProblems.push(`Duel.${m[1]}(${m[2]}): a description of ${args.find(a=>/^\d+$/.test(a)&&+a<20)} has no text`);
 }
}

// Defeat reasons (loss_reason.py): the run history line and the run card's cause of defeat.
const lossReasons=new Map();
{
 const killer=content.cards.find(c=>c.name==='Blue-Eyes White Dragon')||content.cards[0];
 for(const s of ['Your life points reached 0','Decked out: unable to draw during the Draw Phase',`Attacked by ${killer.name}`,`Defeated by the effect of ${killer.name}`,
  `Decked out by the effect of ${killer.name}`,`Attacked by ${killer.name} — 3,000 damage`,'Attacked by','Defeated by the effect of','Decked out by the effect of'])lossReasons.set(s,'loss_reason.py');
 // Action Field and Deck Masters rules never run in this game.
 for(const [id,s] of Object.entries(JSON.parse(read('data/victory-reasons.json'))))if(!s.includes('%')&&!/rules of/.test(s))lossReasons.set(s.replace('Victory by','Defeated by'),`victory-reasons.json ${id}`);
}

// Pack hover summaries (experience-ui.js packSummary): one text run per pack, translated by generated {0} patterns
// (add_nov18_pack_summary_terms.mjs). A pack whose cards changed needs that script rerun; this names it.
// Imported as a module: packSummary reads its pieces from pack-summary.js (2026-11-19).
const {packSummary}=await import(pathToFileURL(path.join(web,'experience-ui.js')).href);
const packSummaries=new Map(content.packs.map(p=>[packSummary(content,p.id),`pack ${p.id}`]).filter(([s])=>s));

// ---- Lookup through the real i18n.js --------------------------------------------------------------------------------
globalThis.localStorage={getItem(){return null},setItem(){}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['en'],language:'en'}});
globalThis.MutationObserver=class{observe(){}disconnect(){}};
globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.document={documentElement:{lang:''},body:null,title:'',createTreeWalker(){return {nextNode(){return null}}}};
globalThis.fetch=async p=>{const m=/i18n\/([a-z]{2})\.json/.exec(String(p));return m?{ok:true,json:async()=>JSON.parse(read(`android/web/i18n/${m[1]}.json`))}:{ok:false,status:404}};
const i18n=await import(`data:text/javascript;base64,${Buffer.from(read('android/web/i18n.js')).toString('base64')}`);

const groups={'option strings (card effects)':cardStrings,'engine choice labels':new Map([...engineLabels].map(s=>[s,'engine.js choices()'])),
 'built option shapes':new Map(shapes.map(([s,parts])=>[s,parts])),'hover texts (title)':hover,
 'run card (canvas)':canvasText,'randomized card prompts':randomizedPrompts,'defeat reasons':lossReasons,'pack summaries':packSummaries};
// Built texts checked part by part: the whole text, or each " · " part, must have an entry (an identity entry counts:
// French keeps "Duel"), a matching pattern, or a translation; names and numbers stay.
const PARTWISE=new Set(['run card (canvas)','defeat reasons']);
// A string counts as translated when the lookup changes it, or the dictionary keeps it on purpose (an identity entry).
// A built text fails when an English part survives that the language translates on its own (French keeps "Duel").
const problems=[];
for(const lang of LANGS){
 await i18n.setLanguage(lang,{remember:false});i18n.attachContent(content);
 const ui=JSON.parse(read(`android/web/i18n/${lang}.json`)).ui;
 // The language keeps this English word itself: its own translation contains it, or an identity entry.
 const keeps=p=>{const v=i18n.t(p);return v!==p?v.includes(p):p in ui};
 const patterns=Object.keys(ui).filter(k=>/\{\d+\}/.test(k)).map(k=>new RegExp('^'+k.split(/\{\d+\}/).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('(.*?)')+'$'));
 const known=p=>p in ui||i18n.t(p)!==p||patterns.some(re=>re.test(p));
 for(const [group,map] of Object.entries(groups))for(const [s,where] of map){
  if(PARTWISE.has(group)){if(!known(s)&&s.split(' · ').some(part=>LETTER.test(part)&&!keptAsIs(part)&&!known(part)))problems.push({lang,group,s,where});continue}
  // A pack summary must translate, and no Type or archetype word may stay English unless the language keeps it.
  if(group==='pack summaries'){const out=i18n.t(s),words=(s.match(/(?:types|Archetypes|Support): ([^.]+)\./g)||[]).flatMap(x=>x.replace(/^[^:]+: /,'').slice(0,-1).split(', '));
   if(out===s||words.some(w=>out.includes(w)&&!keeps(w)&&!properNames.has(w)))problems.push({lang,group,s,where:where+' → '+out});continue}
  // A pattern needs its own entry, or a more specific one that matches its sample.
  if(/\{\d+\}/.test(s)){if(!(s in ui)&&!(where?.sample&&i18n.t(where.sample)!==where.sample))problems.push({lang,group,s,where:where?.where||where});continue}
  const parts=Array.isArray(where)?where:where?.parts;
  if(parts){const out=i18n.t(s);if(parts.some(part=>out.includes(part)&&!keeps(part)))problems.push({lang,group,s,where:(where.where||'engine.js choices()')+' → '+out});continue}
  if(s in ui)continue;
  if(i18n.t(s)===s)problems.push({lang,group,s,where});
 }
}
if(process.argv.includes('--list'))for(const [group,map] of Object.entries(groups)){console.log(`# ${group} (${map.size})`);for(const [s,where] of map)console.log(`${s}\t${where?.where||where}`)}
const counts=Object.fromEntries(Object.entries(groups).map(([g,m])=>[g,m.size]));
for(const p of luaProblems)console.log('RANDOMIZER PROMPT	'+p);
if(problems.length||luaProblems.length){
 const byString=new Map();for(const p of problems){const k=`${p.group}\t${p.s}\t${p.where}`;byString.set(k,[...(byString.get(k)||[]),p.lang])}
 for(const [k,langs] of byString)console.log(`MISSING [${langs.length===8?'all':langs.join(',')}]\t${k}`);
 console.log(`${byString.size} strings lack a translation (${problems.length} language entries), ${luaProblems.length} randomizer prompts have no text. Checked:`,counts);
 process.exit(1);
}
console.log('i18n coverage passed for',LANGS.length,'languages:',counts);
