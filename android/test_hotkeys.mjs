// The keymap (web/hotkeys.js): defaults, key names, rebinding with swaps, refusals, saved overrides and the guards
// that keep hotkeys out of text fields and away from the browser's own shortcuts.
import assert from 'node:assert/strict';
const listeners=[];
globalThis.window={addEventListener:(type,f,capture)=>listeners.push({type,f,capture}),removeEventListener(){}};
const hk=await import('./web/hotkeys.js');
const {ACTIONS,resolve,overrides,conflicts,bind,reset,eventKey,keyLabel,matches,setSource,installHotkeys,captureKey,capturing,typing}=hk;

// Defaults: every id unique, every action in a group, no two actions sharing a key where their scopes meet.
const ids=ACTIONS.map(a=>a.id);assert.equal(new Set(ids).size,ids.length,'action ids are unique');
for(const a of ACTIONS){assert.ok(hk.GROUPS.includes(a.group),a.id+' has a group');assert.ok(a.keys.length<=hk.SLOTS)}
const defaults=resolve(null);
assert.deepEqual(conflicts(defaults),[],'the default keys never clash');
for(const a of ACTIONS)for(const k of defaults[a.id])if(k&&k!==a.fixed)assert.ok(hk.bindable(k),`${a.id}: ${k} is bindable`);
assert.deepEqual(defaults['duel.next-phase'],['Space',''],'Space moves a phase, as before');
assert.deepEqual(defaults['duel.confirm'],['Enter','']);
assert.deepEqual(defaults['duel.chain'],['c','']);assert.deepEqual(defaults['duel.log'],['l','']);
assert.deepEqual(defaults['back'],['Escape','Backspace']);
assert.deepEqual(defaults['card.prev'],['ArrowLeft',''],'the card window keeps its arrows');
assert.deepEqual(defaults['run.restart'],['r',''],'hold R still restarts');

// Key names.
assert.equal(eventKey({key:' '}),'Space');assert.equal(eventKey({key:'E'}),'e','letters ignore Shift and Caps Lock');
assert.equal(eventKey({key:'&',code:'Digit1'}),'1','an AZERTY digit row still gives its digit');
assert.equal(eventKey({key:'End',code:'Numpad1'}),'1','the number pad gives its digit');
assert.equal(eventKey({key:'Shift'}),null,'a lone modifier is no key');assert.equal(eventKey({key:'Dead'}),null);
assert.equal(eventKey({key:'Esc'}),'Escape');assert.equal(eventKey({key:'ArrowLeft'}),'ArrowLeft');
assert.equal(keyLabel('Space'),'Space');assert.equal(keyLabel('e'),'E');assert.equal(keyLabel('ArrowLeft'),'←');assert.equal(keyLabel(''),'—');

// Rebinding. A free key just moves in.
let r=bind(defaults,'duel.battle',0,'v');assert.equal(r.error,null);assert.deepEqual(r.map['duel.battle'],['v','']);assert.deepEqual(r.swapped,[]);
assert.deepEqual(defaults['duel.battle'],['b',''],'bind never changes the map it was given');
// A key another duel action uses swaps: End turn takes Battle's old key.
r=bind(defaults,'duel.battle',0,'e');
assert.deepEqual(r.map['duel.battle'],['e','']);assert.deepEqual(r.map['duel.end-turn'],['b','']);assert.deepEqual(r.swapped,[{id:'duel.end-turn',slot:0}]);
assert.deepEqual(conflicts(r.map),[],'a swap leaves no clash');
// Scopes that never meet may share a key: B is Buy in the shop and Battle in a duel.
r=bind(defaults,'shop.buy',0,'e');assert.deepEqual(r.swapped,[],'Next tab (menus) and End turn (duel) keep E');assert.deepEqual(r.map['duel.end-turn'],['e','']);
// Moving Choose option 1's key onto R: Restart (draft, routes, duel) and Reroll (shop) both meet it? Only Restart does.
r=bind(defaults,'choice-1',0,'r');assert.deepEqual(r.swapped,[{id:'run.restart',slot:0}]);assert.deepEqual(r.map['run.restart'],['1',''],'Restart takes option 1\'s old key');assert.deepEqual(r.map['shop.reroll'],['r',''],'Reroll keeps R in the shop');
// Its own other slot: the two trade places.
r=bind(defaults,'title.prev',1,'ArrowLeft');assert.deepEqual(r.map['title.prev'],['ArrowUp','ArrowLeft']);
// Refusals: reserved keys, the fixed Escape slot, unknown actions. Delete (empty string) clears.
assert.equal(bind(defaults,'duel.log',0,'Tab').error,'reserved');assert.equal(bind(defaults,'duel.log',0,'F5').error,'reserved');assert.equal(bind(defaults,'duel.log',0,'Escape').error,'reserved');
assert.equal(bind(defaults,'back',0,'k').error,'fixed');assert.equal(bind(defaults,'nope',0,'k').error,'unknown');
r=bind(defaults,'duel.log',0,'');assert.deepEqual(r.map['duel.log'],['','']);
r=bind(defaults,'back',1,'');assert.deepEqual(r.map['back'],['Escape',''],'Back can lose Backspace but never Escape');
assert.deepEqual(reset(r.map,'back')['back'],['Escape','Backspace']);

// Saved overrides: only changed actions, and resolving them gives the same map back.
r=bind(defaults,'duel.battle',0,'e');const saved=overrides(r.map);
assert.deepEqual(Object.keys(saved).sort(),['duel.battle','duel.end-turn']);assert.deepEqual(resolve(saved),r.map);
assert.deepEqual(overrides(defaults),{});
// Bad saved data falls back safely: unknown ids dropped, reserved keys emptied, Escape forced back in, duplicates cleared.
const bad=resolve({'duel.log':['Tab','l'],'back':['k','Escape'],'shop.buy':['b','b'],'made.up':['z'],'duel.chain':'c','duel.cancel':[5,null]});
assert.deepEqual(bad['duel.log'],['','l']);assert.deepEqual(bad['back'],['Escape','']);assert.deepEqual(bad['shop.buy'],['b','']);
assert.equal(bad['made.up'],undefined);assert.deepEqual(bad['duel.chain'],['c',''],'a malformed row keeps the default');assert.deepEqual(bad['duel.cancel'],['','']);

// The live keymap follows the saved settings.
let settings={};setSource(()=>settings.hotkeys);
assert.ok(matches('duel.battle',{key:'b'}));
settings={hotkeys:overrides(bind(resolve(null),'duel.battle',0,'v').map)};
assert.ok(matches('duel.battle',{key:'V'}));assert.ok(!matches('duel.battle',{key:'b'}));
settings={};

// Text fields never get hotkeys; checkboxes and buttons do.
const field=sel=>({closest:s=>s.split(',').some(x=>x.trim().startsWith(sel))?{}:null});
assert.ok(typing(field('input')));assert.ok(typing(field('textarea')));assert.ok(!typing({closest:()=>null}));assert.ok(!typing(undefined));

// The dispatcher: right scope, plain keys only, not while typing, held keys only for repeat actions.
const keydown=listeners.filter(l=>l.type==='keydown'&&!l.capture);
let scope='shop',bought=0,tabs=0;
installHotkeys({scope:()=>scope,handlers:{'shop.buy':()=>{bought++;return true},'tab.next':()=>{tabs++;return true}},repeats:new Set(['tab.next'])});
const dispatch=listeners.filter(l=>l.type==='keydown'&&!l.capture).at(-1).f;
const press=(key,extra={})=>{let prevented=false;dispatch({key,target:{closest:()=>null},preventDefault(){prevented=true},...extra});return prevented};
assert.equal(press('b'),true);assert.equal(bought,1);
press('b',{ctrlKey:true});press('b',{altKey:true});press('b',{metaKey:true});assert.equal(bought,1,'Ctrl, Alt and Meta presses stay the browser\'s');
press('b',{target:{closest:()=>({})}});assert.equal(bought,1,'typing in a field is left alone');
press('b',{repeat:true});assert.equal(bought,1,'holding B buys once');
scope='duel';assert.equal(press('b'),false,'Buy only works in the shop');assert.equal(bought,1);
scope='menu';press('e');press('e',{repeat:true});assert.equal(tabs,2,'tabs step while held');
assert.equal(press('z'),false,'an unbound key is left alone');

// Rebinding capture: the next key goes to the window, Escape cancels, Delete clears, and no hotkey fires meanwhile.
const cap=listeners.find(l=>l.type==='keydown'&&l.capture).f;
const capPress=(key,extra={})=>{let stopped=false;const e={key,preventDefault(){},stopImmediatePropagation(){stopped=true},...extra};cap(e);return stopped};
let got=null,cancelled=0;
captureKey(k=>got=k,()=>cancelled++);assert.ok(capturing());
scope='shop';assert.equal(press('b'),false,'no hotkey while a key is being rebound');
capPress('Shift');assert.ok(capturing(),'a lone Shift waits for the real key');
assert.equal(capPress('K'),true);assert.equal(got,'k');assert.ok(!capturing());
captureKey(k=>got=k,()=>cancelled++);capPress('Escape');assert.equal(cancelled,1);assert.ok(!capturing());
captureKey(k=>got=k,()=>cancelled++);capPress('Delete');assert.equal(got,'','Delete clears the slot');
console.log('PASS hotkeys keymap, rebinding, conflicts and guards');
