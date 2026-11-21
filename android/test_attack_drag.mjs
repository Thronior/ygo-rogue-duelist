// Drag to attack: where a drop lands, which taps it replays, and that nothing else changes (attack-drag.js).
import assert from 'node:assert/strict';
import {dropTarget,dragTargets,dragAttackStep,installAttackDrag,DRAG_START_PX} from './web/attack-drag.js';

const M={SELECT_BATTLECMD:10,SELECT_YESNO:13,SELECT_EFFECTYN:12,SELECT_CARD:15,SELECT_CHAIN:16},L={MZONE:4,SZONE:8};
// Like a DOMRect, the fields are getters on the prototype, so spreading one copies nothing.
class Rect{constructor(left,top,w,h){this._={left,top,w,h}}get left(){return this._.left}get top(){return this._.top}get right(){return this._.left+this._.w}get bottom(){return this._.top+this._.h}get width(){return this._.w}get height(){return this._.h}}
const rect=(left,top,w=50,h=70)=>new Rect(left,top,w,h);
const zone=(player,loc,seq,occupied,r)=>({player,loc,seq,occupied,rect:r,el:{id:`${player},${loc},${seq}`}});
// Opponent: monsters on row y=0, Spell & Traps on row y=-80. Yours below.
const board=(enemyMonsters)=>[
 ...[0,1,2,3,4].map(i=>zone(1,L.MZONE,i,enemyMonsters.includes(i),rect(i*60,0))),
 ...[0,1,2,3,4].map(i=>zone(1,L.SZONE,i,false,rect(i*60,-80))),
 zone(0,L.MZONE,2,true,rect(120,200)),
];
const lp={rect:rect(400,-80,80,30),el:{id:'lp'}};

// Monsters present, no direct attack: only the monsters are targets.
let t=dragTargets({zones:board([1,3]),extras:[lp],canDirect:false,L});
assert.deepEqual(t.map(x=>x.kind+(x.seq??'')),['monster1','monster3']);
assert.equal(dropTarget(t,70,30)?.seq,1);
assert.equal(dropTarget(t,10,30),null,'an empty monster zone is no target while they have monsters');
assert.equal(dropTarget(t,70,-50),null,'their Spell & Traps do nothing without a direct attack');
assert.equal(dropTarget(t,130,230),null,'your own side is no target');

// Monsters present but this attacker may attack directly: their Spell & Trap Zones and LP mean a direct attack.
t=dragTargets({zones:board([1]),extras:[lp],canDirect:true,L});
assert.equal(dropTarget(t,70,30)?.kind,'monster');
assert.equal(dropTarget(t,10,-50)?.kind,'direct');
assert.equal(dropTarget(t,420,-70)?.kind,'direct');
assert.equal(dropTarget(t,10,30),null,'an empty monster zone beside their monster stays no target');

// Empty field: anywhere on their side, gaps included, is a direct attack.
t=dragTargets({zones:board([]),extras:[lp],canDirect:true,L});
assert.ok(!t.some(x=>x.kind==='monster'));
assert.equal(dropTarget(t,10,30)?.kind,'direct');
assert.equal(dropTarget(t,55,30)?.kind,'direct','the gap between two zones counts');
assert.equal(dropTarget(t,130,230),null);

// The taps a drop replays.
const ctx={M,L,hint:549,attacker:{player:0,sequence:2}};
const select={player:0,type:M.SELECT_CARD,selects:[{controller:1,location:L.MZONE,sequence:1},{controller:1,location:L.MZONE,sequence:3}]};
assert.deepEqual(dragAttackStep({attacker:2,target:3},select,ctx),{kind:'target',index:1});
assert.equal(dragAttackStep({attacker:2,target:4},select,ctx),null,'a target the engine does not offer leaves the tap prompt open');
assert.equal(dragAttackStep({attacker:1,target:3},select,ctx),null,'only the dragged attacker');
assert.equal(dragAttackStep({attacker:2,target:3},select,{...ctx,hint:500}),null,'only the attack-target prompt');
assert.equal(dragAttackStep({attacker:2,direct:true},select,ctx),null,'a direct drop never picks a monster');
const ask={player:0,type:M.SELECT_YESNO,description:31};
assert.deepEqual(dragAttackStep({attacker:2,direct:true},ask,ctx),{kind:'yesno',yes:true});
assert.deepEqual(dragAttackStep({attacker:2,target:1},ask,ctx),{kind:'yesno',yes:false},'"No — choose monster" first');
assert.equal(dragAttackStep({attacker:2,direct:true},{...ask,description:30},ctx),null);
assert.equal(dragAttackStep({attacker:2,target:1},{...select,player:1},ctx),null,'never answers the opponent');

// The wiring, with a tiny fake document: press, drag past the threshold, drop.
const listeners={};const on=(type,f)=>{(listeners[type]||=[]).push(f)};
const classList=()=>{const set=new Set();return {add:(...c)=>c.forEach(x=>set.add(x)),remove:(...c)=>c.forEach(x=>set.delete(x)),toggle:(c,v)=>v?set.add(c):set.delete(c),has:c=>set.has(c),contains:c=>set.has(c)}};
const el=(dataset,r,filled=true)=>({dataset,isConnected:true,classList:(()=>{const c=classList();if(!filled)c.add('empty');return c})(),getBoundingClientRect:()=>r,closest(sel){return sel.includes('can-attack')&&dataset.attack?this:null}});
const own=el({zone:'0,4,2',attack:1},rect(120,200));const ownImg={src:'card.jpg',getBoundingClientRect:()=>rect(122,202,46,66)};own.querySelector=s=>s==='img'?ownImg:null;
const enemy=[0,1,2,3,4].map(i=>el({zone:`1,4,${i}`},rect(i*60,0),i===3)).concat([0,1,2,3,4].map(i=>el({zone:`1,8,${i}`},rect(i*60,-80),false)));
let appended=[];
globalThis.document={addEventListener:on,createElement:tag=>({tag,className:'',style:{},classList:classList(),children:[],setAttribute(){},append(x){this.children.push(x)},set innerHTML(_){this.firstChild={style:{}};this.lastChild=this.firstChild},remove(){appended=appended.filter(x=>x!==this)}}),body:{append:x=>appended.push(x)}};
globalThis.window={addEventListener(){}};
globalThis.requestAnimationFrame=f=>(f(),0);globalThis.cancelAnimationFrame=()=>{};
const timers=[];globalThis.setTimeout=f=>(timers.push(f),timers.length);globalThis.clearTimeout=()=>{};
const run=()=>{while(timers.length)timers.shift()()};
let pending={player:0,type:M.SELECT_BATTLECMD,attacks:[{sequence:2,can_direct:false}]},log=[];
const drag=installAttackDrag({M,L,root:()=>({querySelectorAll:s=>s.startsWith('.zone')?enemy:[]}),active:loose=>!!loose||pending?.type===M.SELECT_BATTLECMD,
 pending:()=>pending,hint:()=>549,attacker:()=>({player:0,sequence:2}),busy:()=>false,
 attackFor:seq=>seq===2?{choice:{response:{type:'battle',action:0,index:0}},canDirect:pending.attacks[0].can_direct}:null,
 declare:(choice,seq)=>{log.push(['declare',seq]);pending=select},answerYesNo:yes=>log.push(['yesno',yes]),chooseTarget:i=>log.push(['target',i])});
const fire=(type,x,y,extra={})=>{for(const f of listeners[type]||[])f({type,isTrusted:true,isPrimary:true,button:0,pointerId:1,clientX:x,clientY:y,target:own,preventDefault(){},stopImmediatePropagation(){this.stopped=true},...extra})};

// A short wobble is still a tap: no drag, no response.
fire('pointerdown',145,235);fire('pointermove',145+DRAG_START_PX-2,235);assert.equal(drag.dragging,false);fire('pointerup',150,235);assert.deepEqual(log,[]);

// Drag onto their monster in zone 3: Attack, then the target, exactly as two taps would.
fire('pointerdown',145,235);fire('pointermove',160,180);assert.equal(drag.dragging,true);assert.equal(appended.length,2,'a trail and the lifted card');
const lifted=appended.find(x=>x.className==='attack-drag-card');assert.equal(lifted.children[0].src,'card.jpg','its own picture');assert.equal(lifted.style.left,'122px');assert.equal(lifted.style.width,'46px');
assert.match(lifted.style.transform,/translate3d\(15px,-55px,0\)/,'the card moves with the finger from where it was grabbed');
assert.ok(enemy[3].classList.has('attack-drag-target'));
fire('pointermove',200,30);assert.ok(enemy[3].classList.has('attack-drag-over'));assert.ok(lifted.classList.has('on-target'));assert.match(lifted.style.transform,/translate3d\(55px,-205px,0\)/);
fire('pointerup',200,30);assert.equal(drag.dragging,false);assert.equal(appended.length,0,'trail and card removed');
assert.ok(!enemy[3].classList.has('attack-drag-target'),'highlights removed');
const click={stopped:false};for(const f of listeners.click)f({...click,preventDefault(){},stopImmediatePropagation(){click.stopped=true}});assert.ok(click.stopped,'the click after a drag is swallowed');
drag.afterRender();run();
assert.deepEqual(log,[['declare',2],['target',1]]);

// Dropped elsewhere: nothing is sent.
log=[];pending={player:0,type:M.SELECT_BATTLECMD,attacks:[{sequence:2,can_direct:false}]};
fire('pointerdown',145,235);fire('pointermove',145,150);fire('pointerup',600,600);drag.afterRender();run();assert.deepEqual(log,[]);
// A cancelled pointer (the browser took the gesture) sends nothing either.
fire('pointerdown',145,235);fire('pointermove',145,150);fire('pointercancel',200,30);assert.equal(drag.dragging,false);assert.deepEqual(log,[]);
// Synthetic presses (the controller) never start a drag.
fire('pointerdown',145,235,{isTrusted:false});fire('pointermove',200,30);assert.equal(drag.dragging,false);
// Outside a battle command, nothing starts.
pending={player:0,type:M.SELECT_CHAIN};fire('pointerdown',145,235);fire('pointermove',200,30);assert.equal(drag.dragging,false);fire('pointerup',200,30);

// Direct attack past their monster: drop on a Spell & Trap Zone, answer "Attack directly?" with yes.
pending={player:0,type:M.SELECT_BATTLECMD,attacks:[{sequence:2,can_direct:true}]};log=[];
fire('pointerdown',145,235);fire('pointermove',100,-40);fire('pointerup',100,-40);
assert.deepEqual(log,[['declare',2]]);pending=ask;drag.afterRender();run();assert.deepEqual(log,[['declare',2],['yesno',true]]);
console.log('attack drag ok');
