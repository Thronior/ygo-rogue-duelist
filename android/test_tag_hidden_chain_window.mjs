// A chain window the player is not offered shows nothing on screen, so only scheduleAI can pass it. duelEnding used to
// outlive a finished solo duel and stop that pass in online duels: the partner saw "the CPU" hang on a set Trap.
// Runs the real showTagDuel, scheduleAI and respond from mobile.js against a real TagSession and TagDuel.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
globalThis.document??={hidden:false,addEventListener(){}};globalThis.location??={href:'http://localhost/'};globalThis.window??={addEventListener(){}};
globalThis.Audio??=class{addEventListener(){}play(){return Promise.resolve()}pause(){}load(){}};
globalThis.localStorage??={getItem:()=>null,setItem(){},removeItem(){}};
const {TagSession}=await import('./web/tag-session.js');const {TagDuel}=await import('./web/tag-duel.js');const {MobileDuel,M,R,I,L}=await import('./web/duel.js');const {chainWindowAllowed,automaticChainResponse}=await import('./web/duel-presentation.js');
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),engineData=read('engine-data'),scripts=read('scripts'),id=n=>meta.cards.find(c=>c.name===n).id,byId=new Map(meta.cards.map(c=>[c.id,c]));
const source=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const slice=(from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a);assert(a>=0&&b>a,'mobile.js moved: '+from);return source.slice(a,b)};
const code=[slice('async function respond(response){','let chainMode='),slice('function offerChain(m){','function chainLabel()'),slice('function scheduleAI(){','let duelEnding=false'),slice('async function showTagDuel(','function tagConnectionBanner()')].join('\n');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// mobile.js's own functions over stubbed presentation. duelEnding starts as completeDuel leaves it.
function client(){
 let timers=0;
 const context=vm.createContext({M,R,I,L,MobileDuel,automaticChainResponse,chainWindowAllowed,content:{cards:meta.cards,tokenCards:[]},state:{settings:{}},card:code=>byId.get(code),loadEngineData:async()=>engineData,setTimeout:(...args)=>{timers++;return setTimeout(...args)},clearTimeout,
  // The slice also holds the solo stall watch's setInterval (2026-11-03). It never runs here: Tag duels are not watched.
  setInterval:()=>0,clearInterval(){},console,document:{querySelector:()=>null},inspectionPaused:()=>false,toast(message){throw Error(message)},track(){},screenMusic(){},renderDuel(){},playDuelCues:async()=>{},updateCoinMilestones:async()=>{},tagConnectionBanner(){},clearAnsweredPrompt(){}});
 vm.runInContext(`let duelEnding=true,tagUI=null,engine=null,snapshot=null,screen='tag',busy=false,aiTimer=0,chainMode='sometimes',rightClickNoChain=false,heldAlwaysChain=false,heldChainPrompt=null,manualChainTimer=0,manualChainPrompt=null,stagedChoice=null,promptHidden=false,tributeDefaultPrompt=null,placeSet=[];const pickSet=new Set();${code};globalThis.api={showTagDuel,scheduleAI,offerChain,enter(ui){tagUI=ui},solo(next){engine=next;screen='duel'}};`,context);
 return {api:context.api,timers:()=>timers};
}
// Host passes; on Turn 3 the partner sets Cemetary Bomb; the CPU's Sparks fill its Graveyard, which makes the Bomb legal
// in its next Draw Phase. Normal Traps are not offered there under the default "Chain sometimes".
const pass={type:R.SELECT_CHAIN,index:null},end={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
function toHiddenWindow(e){
 for(let i=0;i<150;i++){
  const m=e.pending,seat=e.respondingSeat;
  if(m.player===1){e.respond(e.auto(m));continue}
  if(m.type===M.SELECT_CHAIN&&seat===1&&e.turn===4&&m.selects.length)return;
  const response=m.type===M.SELECT_CHAIN?pass:m.type===M.SELECT_IDLECMD?(seat===1&&m.spell_sets.length?{type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:0}:end):e.auto(m);
  e.respondFor(seat,e.responseNumber,response);
 }
 assert.fail('Never reached the partner\'s Draw Phase window.');
}
const deck=name=>({main:Array(40).fill(id(name)),extra:[]});
const e=await new TagDuel(meta.cards).init([engineData,scripts]);
try{
 e.startTag({teams:[[deck('Battle Ox'),deck('Cemetary Bomb')],[deck('Sparks'),deck('Sparks')]],lp:8000,enemyLP:8000,seed:17});
 toHiddenWindow(e);e.visuals=[];
 const number=e.responseNumber,prompt=e.pending;
 assert.equal(prompt.type,M.SELECT_CHAIN);assert(!prompt.forced);assert.equal(e.respondingSeat,1,'the prompt belongs to the partner');assert.equal(e.player,1,'during the CPU\'s turn');assert.equal(e.name(prompt.selects[0].code),'Cemetary Bomb');
 const {api}=client(),session=new TagSession({endpoint:'http://localhost:8765',character:0,profile:{},content:{cards:[],tokenCards:[]},backend:async()=>null});
 Object.assign(session,{seat:1,code:'CHAIN',engine:e,greeted:true,connected:true,active:true});session.peer.send=()=>{};
 session.onDuel=(s,cues)=>api.showTagDuel(s,cues);
 api.enter({view:{phase:'duel',run:{round:0},opponents:[]},session});
 await session.present();
 assert.equal(api.offerChain(prompt),false,'no prompt is on screen, so nobody can answer this window by hand');
 for(let i=0;i<40&&e.pending===prompt;i++)await wait(50);
 assert.notEqual(e.pending,prompt,'the partner\'s client must pass a window it did not offer, after a solo duel as well');
 assert(e.responseNumber>number);
 for(let i=0;i<40&&e.pending?.player!==1;i++)await wait(50);
 assert.equal(e.pending?.player,1,'the CPU gets its turn back');
 // The same flag must still hold back a solo CPU while that duel plays its ending.
 const solo=client(),before=solo.timers();solo.api.solo({pending:{type:M.SELECT_IDLECMD,player:1},player:1});solo.api.scheduleAI();assert.equal(solo.timers(),before,'a solo ending schedules no CPU move');
 console.log('PASS hidden Tag chain windows are passed after a finished solo duel, and solo endings still stop the CPU');
}finally{e.destroy()}
