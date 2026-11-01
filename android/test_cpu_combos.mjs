// CPU combos in the real core. Each duel is staged with Debug.AddCard; seat 1 is the CPU, seat 0 passes every prompt.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const e=await new MobileDuel(all).init([data,scripts]);let checks=0;
const POS={a:'POS_FACEUP_ATTACK',d:'POS_FACEUP_DEFENSE',s:'POS_FACEDOWN_DEFENSE',b:'POS_FACEDOWN',u:'POS_FACEUP'};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
const item=x=>Array.isArray(x)?{n:x[0],pos:x[1]}:{n:x,pos:'a'};
const fill=Array(12).fill('Battle Ox');
function play({cpu={},opp={},lp=[8000,8000],turns=1}){
 let t=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${lp[0]},0,0)\nDebug.SetPlayerInfo(1,${lp[1]},0,0)\n`;
 for(const [s,c] of [[0,opp],[1,cpu]]){
  (c.field||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_MZONE',POS[pos],i)});
  (c.back||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_SZONE',POS[pos==='a'?'b':pos],i)});
  if(c.fieldSpell)t+=add(c.fieldSpell,s,'LOCATION_SZONE',POS.u,5);
  (c.hand||[]).forEach(n=>t+=add(n,s,'LOCATION_HAND',POS.b));
  (c.grave||[]).forEach(n=>t+=add(n,s,'LOCATION_GRAVE',POS.u));
  (c.extra||[]).forEach(n=>t+=add(n,s,'LOCATION_EXTRA',POS.b));
  [...fill,...(c.deck||[])].forEach(n=>t+=add(n,s,'LOCATION_DECK',POS.b));
 }
 e.start([],[],lp[0],lp[1],0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
 const steps=[];let seen=0,last=-1;
 for(let i=0;i<600&&e.pending&&!e.finished;i++){
  const m=e.pending;
  if(e.player===1&&e.turn!==last){last=e.turn;if(++seen>turns)break}
  if(e.player===0&&seen>=turns&&e.turn>1)break;
  if(m.player===0){
   const r=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:m.to_bp?I.TO_BP:I.TO_EP,index:null}:m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null}:m.type===M.SELECT_CHAIN?{type:R.SELECT_CHAIN,index:m.forced?0:null}:e.choices(m).at(m.type===M.SELECT_EFFECTYN||m.type===M.SELECT_YESNO?-1:0)?.response??e.auto(m);
   e.respond(r);continue;
  }
  const r=e.auto(m);
  if(m.type===M.SELECT_IDLECMD){const l={[I.SELECT_SUMMON]:['summon',m.summons],[I.SELECT_SPECIAL_SUMMON]:['special',m.special_summons],[I.SELECT_MONSTER_SET]:['set',m.monster_sets],[I.SELECT_ACTIVATE]:['activate',m.activates],[I.SELECT_POS_CHANGE]:['flip',m.pos_changes]}[r.action];if(l)steps.push(`${l[0]} ${e.name(l[1][r.index].code)}`)}
  e.respond(r);
 }
 const names=(s,l)=>e.query(s,l).filter(Boolean).map(c=>e.name(c.code));
 assert.deepEqual(e.errors.filter(x=>x.trim()),[],'no script errors');
 return {steps,field:names(1,L.MZONE),hand:names(1,L.HAND),grave:names(1,L.GRAVE),back:names(1,L.SZONE),theirs:names(0,L.MZONE),lp:[...e.lp],won:e.finished&&e.lp[0]<=0};
}
const ok=(v,why)=>{assert.ok(v,why);checks++};
const inOrder=(r,...want)=>{let at=-1;for(const w of want){const i=r.steps.indexOf(w,at+1);assert.ok(i>at,`${w} in order: ${r.steps.join(' > ')}`);at=i}checks++};
const never=(r,w)=>{assert.ok(!r.steps.includes(w),`${w} must not happen: ${r.steps.join(' > ')}`);checks++};
const BEWD='Blue-Eyes White Dragon',FLUTE='The Flute of Summoning Dragon',LORD='Lord of D.';
const Q="Queen's Knight",K="King's Knight",J="Jack's Knight",JOKER='Arcana Knight Joker';

// The payoff is what counts: Kaibaman with Blue-Eyes is scored as a 3000 ATK summon.
let r=play({cpu:{hand:['Kaibaman',BEWD]},opp:{field:['Summoned Skull']}});
inOrder(r,'summon Kaibaman');ok(r.field.includes(BEWD),'Kaibaman became Blue-Eyes');
// ...including lethal: Blue-Eyes beats Vorse Raider and Battle Ox goes direct, which Kaibaman's 1200 never could.
r=play({cpu:{hand:['Kaibaman',BEWD],field:['Battle Ox']},opp:{field:['Vorse Raider']},lp:[2800,8000]});ok(r.won,'lethal through a blocker counts the Blue-Eyes');
r=play({cpu:{hand:['Kaibaman']},opp:{field:['Summoned Skull']}});ok(!r.field.includes(BEWD),'no Blue-Eyes, no line');

// Lord of D. + Flute: two Dragons for one card.
r=play({cpu:{hand:[LORD,FLUTE,BEWD,BEWD,'Gemini Elf']},opp:{field:['Summoned Skull']}});
inOrder(r,`summon ${LORD}`,`activate ${FLUTE}`);ok(r.field.filter(n=>n===BEWD).length===2,'both Blue-Eyes arrive');ok(r.hand.includes('Gemini Elf'),'the spare monster stays in hand');
r=play({cpu:{hand:[FLUTE,BEWD],field:[[LORD,'s']]},opp:{field:['Summoned Skull']}});inOrder(r,`flip ${LORD}`,`activate ${FLUTE}`);ok(r.field.includes(BEWD),'a Set Lord is flipped first');
r=play({cpu:{hand:[LORD,FLUTE,'Petit Dragon']},opp:{field:['Summoned Skull']}});never(r,`activate ${FLUTE}`);never(r,`summon ${LORD}`);
r=play({cpu:{hand:[FLUTE,BEWD]},opp:{field:['Summoned Skull']}});never(r,`activate ${FLUTE}`);
r=play({cpu:{hand:[LORD,FLUTE,BEWD]},opp:{field:['Spell Canceller']}});never(r,`activate ${FLUTE}`);ok(!r.field.includes(BEWD),'spells are negated, so the line stops');

// Level Up!: face-up first, then as far as the copies in hand reach.
const H='Horus the Black Flame Dragon LV';
r=play({cpu:{hand:[H+4,'Level Up!','Level Up!'],deck:[H+6,H+8]},opp:{field:['Vorse Raider']}});
inOrder(r,`summon ${H}4`,'activate Level Up!','activate Level Up!');ok(r.field.includes(H+8),'LV4 to LV8 in a turn');
r=play({cpu:{hand:['Silent Magician LV4','Level Up!'],deck:['Silent Magician LV8']},opp:{field:['Vorse Raider']}});ok(r.field.includes('Silent Magician LV8'),'Silent Magician LV8');
r=play({cpu:{hand:['Silent Magician LV4','Level Up!']},opp:{field:['Vorse Raider']}});never(r,'activate Level Up!');never(r,'summon Silent Magician LV4');

// Elegant Egotist.
r=play({cpu:{hand:['Harpie Lady','Elegant Egotist'],deck:['Harpie Lady Sisters']},opp:{field:['Vorse Raider']}});inOrder(r,'summon Harpie Lady','activate Elegant Egotist');ok(r.field.includes('Harpie Lady Sisters'),'Sisters from the Deck');
r=play({cpu:{hand:['Birdface','Elegant Egotist']},opp:{field:['Vorse Raider']}});never(r,'activate Elegant Egotist');

// Arcana Knight Joker: Queen, King, Jack from the Deck, Polymerization.
r=play({cpu:{hand:[K,'Polymerization'],field:[Q],deck:[J],extra:[JOKER]},opp:{field:['Summoned Skull']}});inOrder(r,`summon ${K}`,'activate Polymerization');ok(r.field.includes(JOKER),'Joker');
r=play({cpu:{hand:[K,Q,'Polymerization'],deck:[J],extra:[JOKER]},opp:{field:['Vorse Raider']},turns:2});
inOrder(r,`set ${Q}`,`flip ${Q}`,`summon ${K}`,'activate Polymerization');ok(r.field.includes(JOKER),'Set Queen, then the whole line next turn');
r=play({cpu:{hand:[K,'Polymerization'],field:[Q],deck:[J],extra:[JOKER]},opp:{field:[['Battle Ox','s']]}});never(r,'activate Polymerization');ok(r.field.length===3,'nothing stops the three Knights, so they stay separate');
r=play({cpu:{hand:[K,'Polymerization'],field:[Q],extra:[JOKER]},opp:{field:['Summoned Skull']}});never(r,'activate Polymerization');

// XYZ: the missing piece is summoned rather than Set, and Y-Dragon Head is not equipped away.
const X='X-Head Cannon',Y='Y-Dragon Head',Z='Z-Metal Tank',XYZ=['XYZ-Dragon Cannon','XY-Dragon Cannon','XZ-Tank Cannon','YZ-Tank Dragon'];
r=play({cpu:{hand:[Z],field:[X,Y],extra:XYZ},opp:{field:['Summoned Skull']}});inOrder(r,`summon ${Z}`,'special XYZ-Dragon Cannon');ok(r.field.includes('XYZ-Dragon Cannon'),'XYZ');

// Free Tribute bodies.
r=play({cpu:{hand:['Gilasaurus','Dark Driceratops']},opp:{field:['Vorse Raider']}});inOrder(r,'special Gilasaurus','summon Dark Driceratops');
r=play({cpu:{hand:['Gilasaurus','Dark Driceratops']},opp:{field:['Vorse Raider'],grave:[BEWD]}});never(r,'special Gilasaurus');
r=play({cpu:{hand:['Obelisk the Tormentor','Gilasaurus'],field:['Rescue Cat'],deck:['Hyena','Hyena']},opp:{field:['Vorse Raider']}});inOrder(r,'activate Rescue Cat','special Gilasaurus','summon Obelisk the Tormentor');
r=play({cpu:{hand:[BEWD],field:['Kaiser Sea Horse','Mechanicalchaser']},opp:{field:['Vorse Raider']}});ok(r.field.includes(BEWD)&&r.field.includes('Mechanicalchaser'),'Kaiser alone pays for a LIGHT monster');
r=play({cpu:{hand:['Summoned Skull'],field:['Kaiser Sea Horse']},opp:{field:['Battle Ox']}});ok(r.field.includes('Kaiser Sea Horse')||r.field.includes('Summoned Skull'),'a DARK monster gets no discount but still plays normally');

// Marauding Captain brings a friend.
r=play({cpu:{hand:['Marauding Captain','Warrior Dai Grepher']},opp:{field:['Hitotsu-Me Giant']}});inOrder(r,'summon Marauding Captain');ok(r.field.length===2,'two bodies');
r=play({cpu:{hand:['Marauding Captain','Warrior Dai Grepher']},opp:{field:['Vorse Raider']}});never(r,'summon Marauding Captain');

// Scapegoat + Metamorphosis.
r=play({cpu:{hand:['Metamorphosis','Sangan'],back:['Scapegoat'],extra:['Thousand-Eyes Restrict']},opp:{field:[BEWD]}});inOrder(r,'activate Metamorphosis');ok(r.field.includes('Thousand-Eyes Restrict'),'a Sheep Token buys Thousand-Eyes Restrict');ok(r.back.includes(BEWD),'and it takes their best monster');
r=play({cpu:{hand:['Metamorphosis'],field:['Sangan']},opp:{field:[BEWD]}});never(r,'activate Metamorphosis');

// Fire Princess: the burn needs her face-up before the heal.
r=play({cpu:{hand:['Fire Princess','Dian Keto the Cure Master']},opp:{}});inOrder(r,'summon Fire Princess','activate Dian Keto the Cure Master');ok(r.lp[0]<8000,'heal burns');
r=play({cpu:{hand:['Fire Princess','Dian Keto the Cure Master']},opp:{field:['Vorse Raider']}});never(r,'activate Dian Keto the Cure Master');ok(r.hand.includes('Dian Keto the Cure Master'),'the heal waits for her');
r=play({cpu:{hand:['Fire Princess','Dian Keto the Cure Master']},opp:{field:['Vorse Raider']},lp:[500,8000]});ok(r.won,'the burn is lethal, so she comes out anyway');

// A Spirit given away with Creature Swap comes home.
r=play({cpu:{hand:['Asura Priest','Creature Swap']},opp:{field:[BEWD]}});inOrder(r,'summon Asura Priest','activate Creature Swap');ok(r.field.includes(BEWD),'took Blue-Eyes');ok(r.hand.includes('Asura Priest'),'Asura Priest went back to hand');
r=play({cpu:{hand:['Asura Priest','Creature Swap']},opp:{field:[BEWD,'Battle Ox']}});never(r,'activate Creature Swap');

// Lava Golem needs a lock in play, and takes their two best.
r=play({cpu:{hand:['Lava Golem']},opp:{field:[BEWD,'Summoned Skull']}});never(r,'special Lava Golem');
r=play({cpu:{hand:['Lava Golem'],back:[['Gravity Bind','u']]},opp:{field:[BEWD,'Summoned Skull','Battle Ox']}});inOrder(r,'special Lava Golem');ok(r.theirs.includes('Lava Golem')&&r.theirs.includes('Battle Ox'),'their two best are gone');

// Dark Magician support.
r=play({cpu:{hand:["Knight's Title"],field:['Dark Magician'],deck:['Dark Magician Knight']},opp:{field:[BEWD]}});ok(r.field.includes('Dark Magician Knight')&&!r.theirs.length,"Knight's Title removes Blue-Eyes");
r=play({cpu:{hand:["Sage's Stone"],field:['Dark Magician Girl'],deck:['Dark Magician']},opp:{field:['Vorse Raider']}});ok(r.field.includes('Dark Magician'),"Sage's Stone");

// Fusing a board that cannot get past their wall, and leaving it alone when it can.
const POLY='Polymerization',REX='Two-Headed King Rex',CRAWL='Crawling Dragon #2';
r=play({cpu:{hand:[POLY],field:[REX,CRAWL],extra:['Bracchio-raidus']},opp:{field:['Vorse Raider']}});inOrder(r,'activate Polymerization');ok(r.field.includes('Bracchio-raidus'),'two 1600s become the 2200 that beats 1900');
r=play({cpu:{hand:[POLY],field:[REX,CRAWL],extra:['Bracchio-raidus']},opp:{field:['Hitotsu-Me Giant']}});never(r,'activate Polymerization');
r=play({cpu:{hand:[POLY],field:[REX,CRAWL],extra:['Bracchio-raidus']},opp:{field:[BEWD]}});never(r,'activate Polymerization');
r=play({cpu:{hand:[POLY],field:['Red-Eyes Black Dragon','Summoned Skull'],extra:['Black Skull Dragon']},opp:{field:[BEWD]}});ok(r.field.includes('Black Skull Dragon'),'Black Skull beats Blue-Eyes');
r=play({cpu:{hand:[POLY],field:[BEWD,BEWD,BEWD],extra:['Blue-Eyes Ultimate Dragon']},opp:{field:['Obelisk the Tormentor']}});ok(r.field.includes('Blue-Eyes Ultimate Dragon'),'Ultimate from the field');

// Valkyrion: split only when the three Magnets are lethal.
const V='Valkyrion the Magna Warrior',MAG=['Alpha The Magnet Warrior','Beta The Magnet Warrior','Gamma the Magnet Warrior'];
r=play({cpu:{field:[V],grave:MAG},lp:[4000,8000]});ok(r.won,'4600 beats 4000 where 3500 did not');
r=play({cpu:{field:[V],grave:MAG},lp:[6000,8000]});never(r,`activate ${V}`);
r=play({cpu:{field:[V],grave:MAG.slice(0,2)},lp:[4000,8000]});never(r,`activate ${V}`);

// Tribute and LP lethals.
r=play({cpu:{field:['The Agent of Judgment - Saturn'],fieldSpell:'The Sanctuary in the Sky'},opp:{field:['Vorse Raider']},lp:[1500,8000]});ok(r.won,'Saturn burns for the LP gap');
r=play({cpu:{field:['The Agent of Judgment - Saturn'],fieldSpell:'The Sanctuary in the Sky'},opp:{field:['Vorse Raider']},lp:[5000,8000]});never(r,'activate The Agent of Judgment - Saturn');
r=play({cpu:{field:['Cannon Soldier','Battle Ox']},opp:{field:['Summoned Skull']},lp:[1000,8000]});ok(r.won,'Cannon Soldier feeds the other monster first');
r=play({cpu:{field:['Catapult Turtle',BEWD]},opp:{field:['Obelisk the Tormentor']},lp:[1500,8000]});ok(r.won,'Catapult Turtle');
r=play({cpu:{field:['Catapult Turtle',BEWD]},opp:{field:['Obelisk the Tormentor']},lp:[4000,8000]});never(r,'activate Catapult Turtle');

// Order and setup.
r=play({cpu:{hand:["Harpies' Hunting Ground",'Harpie Lady','Elegant Egotist'],deck:['Harpie Lady Sisters']},opp:{field:['Battle Ox'],back:[['Mirror Force','b']]}});
inOrder(r,"activate Harpies' Hunting Ground",'summon Harpie Lady','activate Elegant Egotist');ok(e.query(0,L.SZONE).filter(Boolean).length===0,'the Field Spell goes first, so the summon pops their Set card');
r=play({cpu:{hand:['Obelisk the Tormentor','Gilasaurus','Gilasaurus'],field:['Hyena']},opp:{field:['Battle Ox']}});inOrder(r,'special Gilasaurus','special Gilasaurus','summon Obelisk the Tormentor');
r=play({cpu:{hand:['Magical Dimension','Dark Magician','Rogue Doll']},opp:{field:['Vorse Raider']}});inOrder(r,'summon Rogue Doll');ok(r.field.includes('Dark Magician')&&!r.theirs.length,'Rogue Doll pays for Dark Magician and the removal');
r=play({cpu:{hand:['Magical Dimension','Dark Magician']},opp:{field:['Vorse Raider']}});ok(!r.field.includes('Dark Magician'),'no Spellcaster out, no Dimension');
r=play({cpu:{hand:['Burst Stream of Destruction'],field:[BEWD]},opp:{field:['Vorse Raider','Summoned Skull','Battle Ox']}});inOrder(r,'activate Burst Stream of Destruction');ok(!r.theirs.length,'Burst Stream clears what one attack cannot');
r=play({cpu:{hand:['Burst Stream of Destruction'],field:[BEWD]},opp:{field:['Vorse Raider']}});never(r,'activate Burst Stream of Destruction');
r=play({cpu:{hand:['Mirror of Yata','Asura Priest']},opp:{field:['Hitotsu-Me Giant']}});inOrder(r,'summon Asura Priest','activate Mirror of Yata');ok(r.field.includes('Asura Priest'),'Mirror of Yata keeps the Spirit out');
r=play({cpu:{hand:['Green Gadget'],deck:['Red Gadget']}});inOrder(r,'summon Green Gadget');ok(r.hand.includes('Red Gadget'),'Gadgets are summoned for the search');
r=play({cpu:{field:['Paladin of White Dragon'],deck:[BEWD]},opp:{field:['Summoned Skull']}});ok(r.field.includes(BEWD),'Paladin swaps for Blue-Eyes');
r=play({cpu:{field:['Paladin of White Dragon']},opp:{field:['Summoned Skull']}});never(r,'activate Paladin of White Dragon');

// Hidden information: their hand and Set cards change nothing the CPU does.
const board=extra=>play({cpu:{hand:[LORD,FLUTE,BEWD,'Kaibaman']},opp:{field:['Vorse Raider'],...extra}}).steps.join();
assert.equal(board({}),board({hand:['Raigeki','Mirror Force',BEWD],back:[['Mirror Force','b']]}),'hidden cards do not steer the line');checks++;

e.destroy();
console.log(`PASS CPU combos: ${checks} checks`);
