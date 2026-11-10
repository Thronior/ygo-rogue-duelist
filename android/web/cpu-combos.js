// Multi-card CPU lines. A line is judged by the board it ends on, as if that payoff could be
// summoned directly, so Kaibaman with Blue-Eyes in hand counts as a 3000 ATK play and not a 1200 one.
// Nothing is remembered between prompts: each prompt finds the next step again, so a line that gets
// interrupted simply stops being offered. Only the CPU's own hand, Deck and Extra Deck are read.
import {ritualLevelsReady} from './cpu-card-plans.js';
const HARPIES=new Set(['Harpie Lady','Harpie Lady 1','Cyber Harpie Lady']);
const HEALS=new Set(['Dian Keto the Cure Master','Poison of the Old Man','Gift of The Mystical Elf','Numinous Healer','Soul of the Pure','Mooyan Curry',"Goblin's Secret Remedy",'Red Medicine','Blue Medicine']);
const LOCKS=new Set(['Gravity Bind','Level Limit - Area B','Messenger of Peace','Swords of Revealing Light',"Nightmare's Steelcage"]);
const LIGHT=0x10,WATER=0x2;
export function comboPlanner(x){
 const {lethalCost=()=>false,e,p,L,q,name,data,atk,face,own,enemy,hand,back,theirBack,lvl,race,same,prompt,targetValue,effectsEnabled,spellsOk,exodiaPieces,specialOk,projectedAttack,planDamage,contactMaterials,contactUseful,fusionPlan,matchesRitual,ritualMaterialReady}=x;
 const has=(a,n)=>a.some(c=>name(c)===n),monster=c=>!!(data(c).type&1);
 const list=key=>prompt?.[key]||[],free=5-own.length;
 const fromPrompt=(key,n)=>list(key).findIndex(c=>name(c)===n);
 const up=n=>own.find(c=>face(c)&&name(c)===n&&!c.is_disabled),set=n=>own.find(c=>!face(c)&&name(c)===n);
 const flip=c=>list('pos_changes').findIndex(y=>y.sequence===c.sequence);
 const asSummoned=c=>({...c,controller:p,location:L.HAND});
 const power=c=>Math.max(0,projectedAttack(asSummoned(c)));
 const bestOf=a=>[...a].sort((b,c)=>power(c)-power(b));
 const deck=()=>q(p,L.DECK),extra=()=>q(p,L.EXTRA);
 const summonStep=n=>{const index=fromPrompt('summons',n);return index<0?null:{kind:'summon',index,code:name(list('summons')[index])}};
 const useStep=n=>{const index=fromPrompt('activates',n);return index<0||lethalCost(list('activates')[index])?null:{kind:'activate',index,code:n}};
 const specialStep=n=>{const index=fromPrompt('special_summons',n);return index<0?null:{kind:'special',index,code:n}};
 const flipStep=c=>{const index=flip(c);return index<0?null:{kind:'flip',index,code:name(c)}};
 // The step that gets `n` face-up on the field, or null. A set copy is flipped; otherwise it needs the Normal Summon.
 const reveal=n=>{const down=set(n);return down?flipStep(down):summonStep(n)};
 const setStep=n=>{const index=fromPrompt('monster_sets',n);return index<0?null:{kind:'set',index,code:n}};
 const normalLeft=()=>list('summons').length>0||list('monster_sets').length>0||e.normalSummonTurn?.[p]!==e.turn;
 const normalSummonable=c=>monster(c)&&!(data(c).type&0xc0)&&!/cannot be Normal Summoned/i.test(e.cards.get(c.code)?.desc||'');
 const tributes=c=>{const level=lvl(c);return /^(?:Slifer the Sky Dragon|Obelisk the Tormentor|The Winged Dragon of Ra)$/.test(name(c))?3:level>6?2:level>4?1:0};
 const cheapest=()=>[...own].sort((a,b)=>Math.max(0,atk(a))-Math.max(0,atk(b)));

 function kaibamanLine(){
  const dragon=hand.find(c=>name(c)==='Blue-Eyes White Dragon');if(!dragon)return [];
  const start=up('Kaibaman')?useStep('Kaibaman'):reveal('Kaibaman');
  return start?[{id:'kaibaman',start,payoff:[dragon],normal:start.kind==='summon',lost:up('Kaibaman')?[up('Kaibaman')]:[]}]:[];
 }
 function fluteLine(){
  if(!spellsOk||!has(hand,'The Flute of Summoning Dragon'))return [];
  const lord=up('Lord of D.'),room=lord?free:free-1,dragons=bestOf(hand.filter(c=>monster(c)&&race(c)==='Dragon'&&name(c)!=='Lord of D.'&&specialOk(c)&&atk(c)>=1200)).slice(0,Math.min(2,room));
  if(!dragons.length)return [];
  const start=lord?useStep('The Flute of Summoning Dragon'):reveal('Lord of D.');if(!start)return [];
  const body=lord?[]:hand.filter(c=>name(c)==='Lord of D.').slice(0,1);
  return [{id:'flute',start,payoff:dragons,kept:body,normal:start.kind==='summon',lost:[]}];
 }
 // Climb as far as the Level Up! copies in hand reach, using the names in each monster's own text.
 function levelUpLine(){
  const copies=hand.filter(c=>name(c)==='Level Up!').length;if(!spellsOk||!copies)return [];
  const lines=[],pool=[...hand,...deck()];
  const next=c=>{const text=e.cards.get(c.code)?.desc||'';return bestOf(pool.filter(t=>monster(t)&&/ LV\d+$/.test(name(t))&&lvl(t)>lvl(c)&&text.includes(`"${name(t)}"`)))[0]};
  for(const c of [...own.filter(y=>/ LV\d+$/.test(name(y))),...hand.filter(y=>/ LV\d+$/.test(name(y)))]){
   let top=c,steps=0;for(;steps<copies;steps++){const t=next(top);if(!t)break;top=t}
   if(!steps||power(top)<=power(c)+300)continue;
   const onField=c.location===L.MZONE,start=onField?(face(c)?useStep('Level Up!'):flipStep(c)):summonStep(name(c));
   if(start)lines.push({id:'level-up',start,payoff:[top],normal:start.kind==='summon',lost:onField?[c]:cheapest().slice(0,tributes(c))});
  }
  return lines;
 }
 function egotistLine(){
  if(!spellsOk||!has(hand,'Elegant Egotist')||free<1)return [];
  const target=bestOf(hand.concat(deck()).filter(c=>name(c)==='Harpie Lady Sisters'||name(c)==='Harpie Lady'))[0];if(!target)return [];
  const harpie=own.some(c=>face(c)&&HARPIES.has(name(c)));
  if(harpie){const start=useStep('Elegant Egotist');return start?[{id:'egotist',start,payoff:[target],normal:false,lost:[]}]:[]}
  for(const n of HARPIES){const start=reveal(n);if(start)return [{id:'egotist',start,payoff:[target],kept:hand.filter(c=>name(c)===n).slice(0,1),normal:start.kind==='summon',lost:[]}]}
  return [];
 }
 const KNIGHTS=["Queen's Knight","King's Knight","Jack's Knight"];
 function arcanaLine(){
  const queen=up(KNIGHTS[0]),king=hand.find(c=>name(c)===KNIGHTS[1]),jack=deck().find(c=>name(c)===KNIGHTS[2]);
  const joker=extra().find(c=>name(c)==='Arcana Knight Joker'),poly=has(hand,'Polymerization')&&spellsOk;
  if(!king||!jack||free<2&&!queen)return [];
  const inHand=hand.find(c=>name(c)===KNIGHTS[0]);
  // Both in hand: Queen goes first. A Set Queen is flipped next turn, just before King's Normal Summon.
  if(inHand&&!set(KNIGHTS[0])){const start=enemy.some(t=>face(t)&&(t.position&1)&&atk(t)>atk(inHand))?setStep(KNIGHTS[0]):summonStep(KNIGHTS[0]);return start?[{id:'arcana-setup',start,payoff:[],normal:true,lost:[]}]:[]}
  const finish=joker&&poly?[joker]:[jack];
  if(queen){const start=summonStep(KNIGHTS[1]);return start?[{id:'arcana',start,payoff:finish,kept:joker&&poly?[]:[king,queen],normal:true,lost:joker&&poly?[queen]:[]}]:[]}
  const down=set(KNIGHTS[0]);
  if(down&&normalLeft()){const start=flipStep(down);return start?[{id:'arcana',start,payoff:finish,kept:joker&&poly?[]:[king,down],normal:false,lost:[]}]:[]}
  return [];
 }
 // Contact fusions: one missing piece may come from the hand with this turn's Normal Summon.
 function contactLine(){
  const lines=[];
  for(const f of extra()){
   const names=contactMaterials(f);if(!names.length)continue;
   const onField=names.map(n=>own.find(c=>face(c)&&name(c)===n)),missing=names.filter((n,i)=>!onField[i]);
   if(missing.length>1||!contactUseful(f,missing))continue;
   const start=missing.length?summonStep(missing[0]):specialStep(name(f));
   if(start)lines.push({id:'contact',start,payoff:[f],normal:start.kind==='summon',lost:onField.filter(Boolean)});
  }
  return lines;
 }
 // Free bodies pay for a Tribute Summon: Gilasaurus from hand, and a face-up Rescue Cat's two Beasts.
 function fodderLine(){
  const lines=[];if(!normalLeft())return lines;
  const gilasaurus=specialStep('Gilasaurus'),cat=up('Rescue Cat'),catStep=cat&&useStep('Rescue Cat');
  const catBodies=catStep&&deck().filter(c=>monster(c)&&race(c)==='Beast'&&lvl(c)<=3).length>=2?1:0;
  const gilaBody=gilasaurus?Math.min(free,hand.filter(c=>name(c)==='Gilasaurus').length):0;
  // Gilasaurus lets them revive anything: only spend it into a Graveyard with nothing worth reviving.
  const revive=Math.max(0,...q(1-p,L.GRAVE).filter(monster).map(atk));
  for(const c of hand){
   const need=tributes(c);if(!need||!normalSummonable(c))continue;
   if(need<=own.length){
    // The bodies are out: Tribute them now, unless better ones would be paid.
    const paid=cheapest().slice(0,need),start=summonStep(name(c));
    if(start&&paid.every(y=>name(y)==='Gilasaurus'||race(y)==='Beast'&&lvl(y)<=3))lines.push({id:'fodder',start,payoff:[c],normal:true,tribute:true,lost:paid});
    continue;
   }
   if(need>own.length+gilaBody+catBodies||gilaBody&&!catBodies&&revive>=power(c)-500)continue;
   const paid=cheapest().filter(y=>!same(y,cat)).slice(0,Math.max(0,need-gilaBody-catBodies*2));
   lines.push({id:'fodder',start:catBodies?catStep:gilasaurus,payoff:[c],normal:true,tribute:true,lost:paid});
  }
  return lines;
 }
 // Monsters that already fought for their ATK are spent when a Fusion is the only way past their wall.
 function fusionLine(){
  const start=spellsOk&&useStep('Polymerization');if(!start)return [];
  const wall=Math.max(0,...enemy.filter(t=>face(t)&&(t.position&1)).map(atk)),strongest=Math.max(0,...own.filter(c=>face(c)&&(c.position&1)).map(atk));
  if(!wall||strongest>wall)return [];
  const lines=[];
  for(const f of extra()){const plan=fusionPlan(f);if(plan&&plan.score<0&&power(f)>wall)lines.push({id:'fusion',start,payoff:[f],normal:false,lost:plan.used.filter(c=>c.location===L.MZONE)})}
  return lines;
 }
 // Magical Dimension needs a Spellcaster out first; the small one is paid for the big one in hand.
 function dimensionLine(){
  if(!spellsOk||![...hand,...back].some(c=>name(c)==='Magical Dimension'))return [];
  if(own.some(c=>face(c)&&race(c)==='Spellcaster'))return [];
  const casters=bestOf(hand.filter(c=>monster(c)&&race(c)==='Spellcaster'&&specialOk(c)));if(casters.length<2)return [];
  const small=[...casters].reverse().find(c=>tributes(c)===0&&power(casters[0])>=power(c)+500);if(!small)return [];
  const start=summonStep(name(small));
  return start?[{id:'dimension',start,payoff:[casters[0]],normal:true,lost:[],bonus:Math.max(0,...enemy.map(targetValue))}]:[];
 }
 // Burst Stream stops Blue-Eyes attacking, so it is for boards the attacks could not clear anyway.
 function burstLine(){
  const start=spellsOk&&up('Blue-Eyes White Dragon')&&useStep('Burst Stream of Destruction');if(!start)return [];
  const attackers=own.filter(c=>face(c)&&(c.position&1)&&!(c.attack_count>0)).length;
  return enemy.length>Math.max(1,attackers)?[{id:'burst',start,payoff:[],normal:false,lost:[],bonus:enemy.reduce((sum,c)=>sum+targetValue(c),0)}]:[];
 }
 // Legion the Fiend Jester allows an extra Tribute Summon of a Spellcaster and searches a Spellcaster Normal
 // Monster when it leaves the field: summon it face-up, then Tribute it. It was Set or skipped (deck trace, 2026-11-06).
 function legionLine(){
  const start=summonStep('Legion the Fiend Jester');if(!start)return [];
  const search=[...deck(),...q(p,L.GRAVE)].some(c=>monster(c)&&(data(c).type&0x10)&&race(c)==='Spellcaster')?800:0;
  return hand.filter(c=>normalSummonable(c)&&race(c)==='Spellcaster'&&tributes(c)>=1&&tributes(c)<=own.length+1).map(c=>({id:'legion',start,payoff:[c],normal:true,tribute:true,lost:cheapest().slice(0,tributes(c)-1),bonus:search}));
 }
 // A Spirit keeps its place on the field with Mirror of Yata.
 function mirrorLine(){
  if(!spellsOk||!has(hand,'Mirror of Yata'))return [];
  const spirit=bestOf(hand.filter(c=>monster(c)&&(data(c).type&0x200)&&tributes(c)===0&&power(c)>=1400))[0],start=spirit&&summonStep(name(spirit));
  return start?[{id:'mirror',start,payoff:[spirit],normal:true,sameAsSummon:true,lost:[]}]:[];
 }
 // Each Gadget searches the next one, a free card that a Set throws away.
 function gadgetLine(){
  const nextOf={'Green Gadget':'Red Gadget','Red Gadget':'Yellow Gadget','Yellow Gadget':'Green Gadget'};
  for(const c of hand){
   const wanted=nextOf[name(c)],start=wanted&&summonStep(name(c));
   if(start&&deck().some(y=>name(y)===wanted)&&!list('summons').some(y=>tributes(y)===0&&power(y)>power(c)+300))return [{id:'gadget',start,payoff:[],kept:[c],normal:true,lost:[]}];
  }
  return [];
 }
 // Valkyrion splits back into its three Magnets when that is the attack that wins.
 function valkyrionLine(){
  const body=up('Valkyrion the Magna Warrior'),start=body&&useStep('Valkyrion the Magna Warrior');if(!start||free<2)return [];
  const parts=['Alpha The Magnet Warrior','Beta The Magnet Warrior','Gamma the Magnet Warrior'].map(n=>q(p,L.GRAVE).find(c=>name(c)===n));
  return parts.every(Boolean)?[{id:'valkyrion',start,payoff:parts,normal:false,lost:[body],onlyLethal:true}]:[];
 }
 function saturnLine(){
  const start=[...back].some(c=>face(c)&&name(c)==='The Sanctuary in the Sky')&&useStep('The Agent of Judgment - Saturn');
  return start?[{id:'saturn',start,payoff:[],normal:false,lost:[],burn:Math.max(0,e.lp[p]-e.lp[1-p]),onlyLethal:true}]:[];
 }
 // Every monster can be fed to Cannon Soldier or Catapult Turtle. Null unless that finishes the duel.
 function burnPlan(){
  const cannon=up('Cannon Soldier'),turtle=up('Catapult Turtle'),body=turtle||cannon;
  // A Cannon Soldier still in hand is summoned to feed the field to it (replay f522ef880cec, 2026-11-10: four bodies
  // for 2000 against 1850 LP; the CPU summoned The Wicked Dreadroot instead).
  if(!body){const step=free>0&&summonStep('Cannon Soldier');return step&&(own.length+1)*500>=e.lp[1-p]?{body:hand.find(c=>name(c)==='Cannon Soldier'),total:(own.length+1)*500,step}:null}
  const total=turtle?own.reduce((sum,c)=>sum+Math.floor(Math.max(0,atk(c))/2),0):own.length*500;
  return total>=e.lp[1-p]?{body,total}:null;
 }
 function burnLine(){
  const plan=burnPlan(),start=plan&&(plan.step||useStep(name(plan.body)));
  return start?[{id:'burn',start,payoff:[],normal:false,lost:[],burn:plan.total,onlyLethal:true}]:[];
 }
 // With an empty field Call of the Mummy puts a Zombie out for free, leaving the Normal Summon for a second body.
 function mummyLine(){
  const start=spellsOk&&!own.length&&useStep('Call of the Mummy');if(!start)return [];
  const zombies=bestOf(hand.filter(c=>monster(c)&&race(c)==='Zombie'&&specialOk(c))),rest=bestOf(hand.filter(c=>monster(c)&&c.code!==zombies[0]?.code&&tributes(c)<=1));
  return zombies.length&&rest.length?[{id:'mummy',start,payoff:[zombies[0]],kept:rest.slice(0,1),normal:false,lost:[]}]:[];
 }
 // A Legendary Ocean drops WATER monsters one Level, which can cancel a Tribute.
 function oceanLine(){
  const start=spellsOk&&!back.some(c=>c.sequence===5)&&useStep('A Legendary Ocean');if(!start)return [];
  const lower=c=>{const level=lvl(c)-1;return level>6?2:level>4?1:0};
  const target=bestOf(hand.filter(c=>normalSummonable(c)&&(data(c).attribute&WATER)&&lower(c)<tributes(c)&&lower(c)<=own.length))[0];
  return target&&normalLeft()?[{id:'ocean',start,payoff:[target],normal:true,lost:[]}]:[];
 }
 // Soul Exchange pays a Tribute with their monster. It costs the Battle Phase, so nothing that can win a fight may be waiting.
 function soulExchangeLine(){
  const paid=list('summons').map((c,index)=>({c,index})).filter(({c})=>tributes(c)>own.length&&tributes(c)<=own.length+1);
  if(paid.length){const {c,index}=bestOf(paid.map(x=>x.c)).map(y=>paid.find(x=>x.c===y))[0];return [{id:'soul-exchange',start:{kind:'summon',index,code:name(c)},payoff:[c],normal:true,tribute:true,lost:[]}]}
  const start=spellsOk&&useStep('Soul Exchange');if(!start||!enemy.length||!normalLeft())return [];
  if(own.some(c=>face(c)&&(c.position&1)&&(!enemy.length||enemy.some(t=>!face(t)||atk(c)>(t.position&1?atk(t):t.defense??data(t).defense??0)))))return [];
  const target=bestOf(hand.filter(c=>normalSummonable(c)&&tributes(c)>own.length&&tributes(c)<=own.length+1))[0];
  return target?[{id:'soul-exchange',start,payoff:[target],normal:true,tribute:true,lost:[],bonus:Math.max(...enemy.map(targetValue))}]:[];
 }
 // Kaiser Sea Horse pays both Tributes of a LIGHT monster alone.
 function kaiserLine(){
  const kaiser=up('Kaiser Sea Horse');if(!kaiser)return [];
  return list('summons').map((c,index)=>({c,index})).filter(({c})=>tributes(c)===2&&(data(c).attribute&LIGHT)).map(({c,index})=>({id:'kaiser',start:{kind:'summon',index,code:name(c)},payoff:[c],normal:true,lost:[kaiser]}));
 }
 // Sonic Bird, Senju and Manju fetch the missing half of a Ritual: summon the searcher, then the Ritual Spell
 // brings out the monster beside it. Players win with this (Senju into Black Illusion Ritual, Relinquished taking
 // their monster) where the CPU Normal Summoned a bigger plain body (replay review 2026-11-10).
 const SEARCHERS={'Sonic Bird':'spell','Senju of the Thousand Hands':'monster','Manju of the Ten Thousand Hands':'both'};
 function ritualSearchLine(){
  if(!spellsOk||!matchesRitual||back.filter(c=>c.sequence<5).length>=(e.aiModifiers?.spellTrapZones??5))return [];
  const ritual=c=>!!(data(c).type&0x80),spell=c=>ritual(c)&&!!(data(c).type&2),beast=c=>ritual(c)&&monster(c);
  const direct=Math.max(0,...list('summons').filter(c=>tributes(c)===0&&!SEARCHERS[name(c)]).map(power));
  const lines=[];
  for(const [n,finds] of Object.entries(SEARCHERS)){
   const searcher=hand.find(c=>name(c)===n),start=searcher&&summonStep(n);if(!start)continue;
   const pairs=[];
   if(finds!=='monster')for(const s of deck().filter(spell))for(const m of hand.filter(beast))if(matchesRitual(s,m))pairs.push([s,m]);
   if(finds!=='spell')for(const m of deck().filter(beast))for(const s of hand.filter(spell))if(matchesRitual(s,m))pairs.push([s,m]);
   for(const [s,m] of pairs){
    // The searched half must be missing from the hand, or the Ritual is already playable without the searcher.
    if(hand.some(c=>c.code===(s.location===L.DECK?s:m).code)||!specialOk(m)||!ritualMaterialReady(s,m))continue;
    // Pay the Levels with the cheapest cards; the searcher stays beside the Ritual Monster only when the others
    // are enough. Three or more Tributes for one monster is not worth it (deck-sim A/B, 2026-11-10).
    const cost=c=>c.location===L.MZONE?Math.max(400,atk(c)):600,mats=[];
    if(name(s)!=='Advanced Ritual Art'){
     const pool=[...hand,...own].filter(c=>monster(c)&&!same(c,m)&&!same(c,searcher)&&!(c.location===L.MZONE&&name(c)==='Relinquished')).sort((a,b)=>cost(a)-cost(b));
     let sum=0;for(const c of pool){if(sum>=lvl(m))break;mats.push(c);sum+=lvl(c)}
     if(sum<lvl(m))mats.push(searcher);
    }
    const kept=mats.includes(searcher)?[]:[searcher],paid=mats.filter(c=>c!==searcher);
    if(paid.length>2)continue;
    const spent=mats.reduce((v,c)=>v+(c===searcher?0:cost(c)),0),lost=paid.filter(c=>c.location===L.MZONE);
    if(name(m)==='Relinquished'){
     // Relinquished takes their best monster (a Set one too) and attacks with its ATK.
     const prey=enemy.filter(t=>!t.is_immune).sort((a,b)=>targetValue(b)-targetValue(a))[0];
     if(!prey||!effectsEnabled(p)||targetValue(prey)+kept.reduce((v,c)=>v+power(c),0)-spent<=direct)continue;
     lines.push({id:'ritual-search',start,payoff:[m],kept,normal:true,lost,strikers:[face(prey)?Math.max(0,atk(prey)):0,...kept.map(power)].filter(v=>v>0),removed:[prey],bonus:targetValue(prey)});
    }else if(power(m)>=1800&&power(m)+kept.reduce((v,c)=>v+power(c),0)-spent>direct)lines.push({id:'ritual-search',start,payoff:[m],kept,normal:true,lost});
   }
  }
  return lines;
 }
 function captainLine(){
  const start=summonStep('Marauding Captain');if(!start||free<2)return [];
  const captain=hand.find(c=>name(c)==='Marauding Captain');
  const partner=bestOf(hand.filter(c=>c.code!==captain.code&&monster(c)&&lvl(c)<=4&&!exodiaPieces.has(c.code)&&!(data(c).type&0x200000)&&specialOk(c)))[0];
  return partner&&power(partner)>0?[{id:'captain',start,payoff:[partner],kept:[captain],normal:true,lost:[]}]:[];
 }
 // Metamorphosis: a level-matched body becomes the best Fusion it can pay for; a Sheep Token buys Thousand-Eyes Restrict.
 function metamorphosisLine(){
  const start=spellsOk&&useStep('Metamorphosis');if(!start)return [];
  const line=metamorphosisPick();
  return line?[{id:'metamorphosis',start,payoff:[line.fusion],normal:false,lost:[line.body],bonus:line.bonus}]:[];
 }
 function metamorphosisPick(){
  const enemyBest=Math.max(0,...enemy.filter(face).map(atk));let best=null;
  const worth=f=>name(f)==='Thousand-Eyes Restrict'?enemyBest:power(f);
  for(const body of own)for(const f of extra())if(lvl(f)===lvl(body)&&specialOk(f)){
   const gain=worth(f)-Math.max(0,atk(body));
   if(!best||gain>best.gain)best={body,fusion:f,gain,bonus:name(f)==='Thousand-Eyes Restrict'?enemyBest:0};
  }
  return best&&best.gain>=1000?best:null;
 }
 function firePrincessLine(){
  const heals=[...hand.filter(c=>data(c).type&2),...back.filter(c=>!face(c))].filter(c=>HEALS.has(name(c))).length;
  if(!heals||!spellsOk||up('Fire Princess'))return [];
  const princess=[...hand,...own].find(c=>name(c)==='Fire Princess');if(!princess)return [];
  const start=reveal('Fire Princess');if(!start)return [];
  const burn=heals*500,safe=!enemy.some(t=>face(t)&&(t.position&1)&&atk(t)>atk(princess));
  // Face-up in front of a bigger attacker is only right when the burn pays for it now.
  return safe||burn>=e.lp[1-p]||heals>=2?[{id:'fire-princess',start,payoff:[],kept:[],normal:start.kind==='summon',lost:[],burn}]:[];
 }
 // A Spirit handed over with Creature Swap goes home at the End Phase, so the swap costs nothing.
 function spiritSwapLine(){
  if(!spellsOk||!has(hand,'Creature Swap')||enemy.length!==1)return [];
  const prize=enemy[0],wanted=face(prize)?Math.max(0,atk(prize)):0;if(!wanted)return [];
  const spirits=hand.filter(c=>monster(c)&&(data(c).type&0x200)&&lvl(c)<=4&&wanted>=power(c)+500&&own.every(y=>atk(y)>=power(c))).sort((a,b)=>power(a)-power(b));
  const start=spirits.length?summonStep(name(spirits[0])):null;
  return start?[{id:'spirit-swap',start,payoff:[prize],normal:true,lost:[]}]:[];
 }
 // Lava Golem takes two of their monsters and burns its new owner, with a lock to stop it swinging back.
 function lavaGolemLine(){
  const start=specialStep('Lava Golem');if(!start||enemy.length<2)return [];
  const locked=[...back,...theirBack].some(c=>face(c)&&LOCKS.has(name(c)));
  if(!locked&&e.lp[1-p]>1000)return [];
  const taken=[...enemy].sort((a,b)=>targetValue(b)-targetValue(a)).slice(0,2).reduce((sum,c)=>sum+targetValue(c),0);
  return taken>=1500?[{id:'lava-golem',start,payoff:[],normal:false,lost:[],bonus:taken}]:[];
 }
 // Attacks that are worth making because of what they do, not the damage. A monster that could win a fight fights normally.
 const TRADES=new Set(['Hyper Hammerhead','D.D. Warrior']);
 function battleLine(ready){
  if(e.battleProtected?.[1-p]||!effectsEnabled(p))return null;
  const shown=t=>face(t)&&(t.position&1),guard=t=>t.position&1?atk(t):(t.defense??data(t).defense??0);
  const rocket=ready.find(c=>name(c)==='Rocket Warrior');
  if(rocket){
   const best=Math.max(0,...ready.filter(c=>!same(c,rocket)).map(atk));
   const weakened=enemy.filter(t=>shown(t)&&atk(t)>=best&&atk(t)-500<best).sort((a,b)=>targetValue(b)-targetValue(a))[0];
   if(weakened)return {card:rocket,target:weakened};
  }
  for(const c of ready.filter(y=>TRADES.has(name(y))&&!enemy.some(t=>face(t)&&atk(y)>guard(t)))){
   const bounce=name(c)==='Hyper Hammerhead';
   const target=enemy.filter(t=>{
    if(!face(t)||x.resilient(t)||x.attackBackfires(c,t))return false;
    if(!(t.position&1))return bounce;
    const loss=atk(t)-atk(c);
    return loss>=0&&loss<e.lp[p]/3&&atk(t)>=2000&&(!bounce||lvl(t)>=5||!!(data(t).type&0xc0));
   }).sort((a,b)=>targetValue(b)-targetValue(a))[0];
   if(target)return {card:c,target};
  }
  return null;
 }
 let cached=null;
 function lines(){
  if(cached)return cached;cached=[];
  if(!prompt||!Array.isArray(prompt.summons)||e.player!==p||!(e.phase===4||e.phase===256))return cached;
  const main=e.phase===4,spells=[metamorphosisLine,fluteLine,levelUpLine,egotistLine,arcanaLine,fusionLine,dimensionLine,burstLine,mirrorLine,mummyLine,oceanLine,soulExchangeLine];
  const monsters=effectsEnabled(p)?[kaibamanLine,contactLine,fodderLine,captainLine,kaiserLine,firePrincessLine,lavaGolemLine,gadgetLine,valkyrionLine,saturnLine,burnLine,legionLine,ritualSearchLine]:[contactLine];
  for(const build of [...spells,...monsters,...(main?[spiritSwapLine]:[])])cached.push(...build());
  for(const line of cached){line.kept??=[];line.lost??=[];line.strikers??=[...line.payoff.map(power),...line.kept.map(power)].filter(v=>v>0);line.gain=line.strikers.reduce((a,b)=>a+b,0)-line.lost.reduce((a,c)=>a+Math.max(0,atk(c)),0)+(line.bonus||0)+(line.burn||0)}
  return cached;
 }
 // Lethal first, then the line ending on the biggest board. These lines are justified by what they do,
 // not by the size of the monster they leave behind.
 const selfJustified=new Set(['fire-princess','lava-golem','metamorphosis','spirit-swap','contact','fusion','arcana-setup','burst','gadget','ritual-search']);
 function choose(useful){
  const direct=Math.max(0,...list('summons').filter(c=>tributes(c)===0).map(power));
  const candidates=lines().map(line=>({...line,lethal:(line.burn||0)>=e.lp[1-p]||line.strikers.length>0&&planDamage(line.strikers,line.removed||[],line.lost)>=e.lp[1-p]})).filter(line=>{
   if(line.lethal)return true;
   if(line.onlyLethal)return false;
   if(selfJustified.has(line.id))return true;
   if(line.gain<=0||!line.payoff.concat(line.kept).some(c=>useful(asSummoned(c))))return false;
   // A plain summon that hits as hard keeps every other card in hand.
   return !line.normal||line.sameAsSummon||line.strikers.reduce((a,b)=>a+b,0)>direct;
  });
  return candidates.sort((a,b)=>(b.lethal-a.lethal)||(b.gain-a.gain))[0]||null;
 }
 // The attackers a Normal Summon of `c` really adds, follow-ups included; null when it starts nothing.
 const strikersFor=c=>lines().find(l=>l.start.kind==='summon'&&l.start.code===name(c))?.strikers||null;
 return {lines,choose,strikersFor,metamorphosisPick,burnPlan,battleLine};
}
