import {acceptedReplayRules} from './replay-rules.js';
import {deckPolicy} from './deck_policy.js';
// Shared vintage policy. Adapted decision principles from the supplied Classic2004SmartExecutor
// and WindBot DefaultExecutor; see data/ai-source for attribution and the original source.
// Pool cards whose stat-changing activation is legal in the Damage Step.
// Keep explicit: mentioning ATK in text does not make attack-declaration traps eligible.
export const damageStepModifiers=new Set([
 'Aqua Chorus','Bark of Dark Ruler','Blast with Chain','Castle Walls','Curse of Aging',
 'Deal of Phantom','Energy Drain','Graceful Dice','Kunai with Chain','Limiter Removal',
 'Mask of Weakness','Micro Ray','Mirror Wall','Pyramid Energy','Reinforcements',
 'Rush Recklessly','Shadow Spell','Shrink','Skull Dice','Snake Fang',
 'The Reliable Guardian','Unity','Metalmorph',
]);
export const exodiaPieces=new Set([33396948,70903634,7902349,44519536,8124921]);
export function smartContext(e,p,L,prompt=null){
 const replayRule=key=>e.cpuTrialRules?e.cpuTrialRules.includes(key):acceptedReplayRules.has(key);
 const queryCache=new Map(),safetyCache=new Map();
 const rawQuery=(side,loc)=>{const key=side+':'+loc;if(!queryCache.has(key))queryCache.set(key,e.query(side,loc));return queryCache.get(key)};
 const q=(side,loc)=>rawQuery(side,loc).map((c,sequence)=>c?(c.controller!==undefined&&c.location!==undefined&&c.sequence!==undefined?c:{controller:side,location:loc,sequence,...c}):null).filter(Boolean),name=c=>e.name(c.code),data=c=>e.data[c.code]||{},atk=c=>(c.location===L.MZONE?rawQuery(c.controller??p,L.MZONE)[c.sequence]?.attack:undefined)??c.attack??data(c).attack??0;
 const openingTurn=e.turn<=1||(e.aiModifiers?.firstPlayer===1&&e.turn===2);
 const relics=side=>e.aiModifiers?.activeRelics?.[side]||[],relic=(side,key)=>relics(side).includes(key);
 // Damage plans include visible prevention/conversion and the defender's known relics.
 const burnDamage=raw=>{if(q(1-p,L.MZONE).some(c=>enabled(c)&&name(c)==='Des Wombat')||[...q(0,L.MZONE),...q(1,L.MZONE)].some(c=>enabled(c)&&name(c)==='Prime Material Dragon'))return 0;const reduction=(e.aiModifiers?.statRelics?.[1-p]||[]).filter(r=>r.effect==='reduce').reduce((v,r)=>v+(r.amount||0),0);return Math.max(0,raw-reduction)};
 const healingAllowed=side=>!relic(side,'cursed_zombies_bargain');
 const effectsEnabled=side=>!relic(side,'cursed_iron_silence');
 const battleDamage=(raw,attacker=p)=>{const defender=1-attacker;let factor=1;for(const side of [0,1])for(const key of relics(side)){if(key==='cursed_duelists_wager')factor*=1.5;if(key==='cursed_hollow_chalice'&&side===attacker)factor*=.5;if(key==='cursed_reckless_spear'&&side===defender)factor*=1.5;}return Math.floor(Math.max(0,raw)*factor)};
 const own=q(p,L.MZONE),enemy=q(1-p,L.MZONE),hand=q(p,L.HAND),grave=q(p,L.GRAVE),back=q(p,L.SZONE),theirBack=q(1-p,L.SZONE);
 const heldPieces=new Set(hand.filter(c=>exodiaPieces.has(c.code)).map(c=>c.code));
 e.exodiaPlan??=[false,false];if(heldPieces.size)e.exodiaPlan[p]=true;
 const exodiaPlan=e.exodiaPlan[p],missingPiece=c=>exodiaPieces.has(c.code)&&!heldPieces.has(c.code);
 const handSearch=new Set(['Sangan','Witch of the Black Forest','Emissary of the Afterlife','Different Dimension Capsule']);
 const handRecovery=new Set(['Backup Soldier','Dark Factory of Mass Production','Monster Reincarnation','Dark Eruption','Return of the Doomed']);
 const revival=new Set(['Monster Reborn','Premature Burial','Call of the Haunted','The Shallow Grave','Soul Charge']);
 const face=c=>!!(c.position&5),known=c=>face(c)||!!e.knownFieldCard?.(p,c),power=c=>face(c)?Math.max(0,c.position&1?atk(c):c.defense??data(c).defense??0):(known(c)?e.data[e.knownFieldCard(p,c)]?.defense??900:e.unknownDefense?.(c)??900);
 const threat=Math.max(0,...enemy.map(power)),ownPower=own.reduce((n,c)=>n+atk(c),0),enemyPower=enemy.reduce((n,c)=>n+power(c),0);
 const has=(arr,n)=>arr.some(c=>name(c)===n),types=(arr,t)=>arr.filter(c=>(data(c).type&t)!==0);
 const danger=battleDamage(enemyPower,1-p)>=e.lp[p]||enemyPower>ownPower+1000;
 const LOCK=['Gravity Bind','Messenger of Peace','Swords of Revealing Light',"Nightmare's Steelcage",'Level Limit - Area B'];
 const lockUp=theirBack.some(x=>face(x)&&!x.is_disabled&&LOCK.includes(name(x)));
 const expendable=c=>effectsEnabled(p)&&name(c)==='Relinquished'?1000000:/Sinister Serpent|Sangan|Witch of the Black Forest/.test(name(c))?500:Math.max(0,atk(c));
 const allOwn=[...hand,...own];
 const attr=c=>{if(c.location===L.MZONE&&(c.position&5)){const change=relics(c.controller??p).filter(k=>k.startsWith('attribute_')).at(-1);if(change)return change.slice(10).toUpperCase();}if(c.location===L.MZONE&&c.attribute){const bits={1:'EARTH',2:'WATER',4:'FIRE',8:'WIND',16:'LIGHT',32:'DARK'};return bits[c.attribute]||e.cards.get(c.code)?.attribute;}return e.cards.get(c.code)?.attribute;};
 const fusionReady=()=>q(p,L.EXTRA).some(c=>{const text=e.cards.get(c.code)?.desc||'',materials=[...text.split('\n')[0].matchAll(/"([^"]+)"/g)].map(m=>m[1]);const names=allOwn.map(name);return materials.length>1&&materials.every(n=>{const i=names.indexOf(n);if(i<0)return false;names.splice(i,1);return true})&&atk(c)>threat});
 const ritualReady=c=>{const text=e.cards.get(c.code)?.desc||'',target=types(hand,0x80).find(m=>text.includes(name(m)));if(!target)return false;return allOwn.filter(x=>x!==target&&!(x.location===L.MZONE&&name(x)==='Relinquished')).reduce((n,x)=>n+(e.cards.get(x.code)?.level||0),0)>=(e.cards.get(target.code)?.level||0)};
 const lvl=c=>c.level??e.cards.get(c.code)?.level??0,race=c=>e.cards.get(c.code)?.race||'';
 const firePrincess=effectsEnabled(p)&&own.some(c=>name(c)==='Fire Princess'&&!c.is_disabled);
 const fireBonus=firePrincess?35:0;
 const umiActive=has(back,'Umi')||has(back,'A Legendary Ocean');
 const toonWorld=has(back,'Toon World');
 const gyLight=grave.filter(c=>(e.cards.get(c.code)?.attribute)==='LIGHT'),gyDark=grave.filter(c=>(e.cards.get(c.code)?.attribute)==='DARK');
 const chaosPair=gyLight.length>0&&gyDark.length>0;
 const atkAfter=(c,bonus)=>atk(c)+bonus;
 const lethalAfter=dmg=>dmg>=e.lp[1-p];
 const machineFace=own.filter(c=>face(c)&&race(c)==='Machine'),dragonFace=own.filter(c=>face(c)&&race(c)==='Dragon');
 const warriorFace=own.filter(c=>face(c)&&race(c)==='Warrior'),spellcasterFace=own.filter(c=>face(c)&&race(c)==='Spellcaster');
 const zombieFace=own.filter(c=>face(c)&&race(c)==='Zombie'),lightFace=own.filter(c=>face(c)&&(e.cards.get(c.code)?.attribute)==='LIGHT');
 const darkFace=own.filter(c=>face(c)&&(e.cards.get(c.code)?.attribute)==='DARK');
 const relevantForest=c=>['Insect','Beast','Plant','Beast-Warrior'].includes(race(c));
 const forestNet=own.filter(c=>face(c)&&relevantForest(c)).length-enemy.filter(c=>face(c)&&relevantForest(c)).length;
 const oppSets=theirBack.length;
 function ritualGate(c,targetName,extra){const t=hand.find(c=>name(c)===targetName);if(!t)return -1;if(!ritualReady(c))return -1;return extra??95;}
 function equipScore(c,bonus){return own.some(f=>face(f)&&lethalAfter(atk(f)+bonus-e.lp[1-p]))||own.some(f=>face(f)&&atk(f)<=threat&&atkAfter(f,bonus)>threat)?75:(own.some(face)?45:-1);}
 const removalNames=new Set(['Ring of Destruction','Raigeki Break','Tribute to the Doomed','Sakuretsu Armor','Fissure','Smashing Ground','Nobleman of Crossout','Offerings to the Doomed','Man-Eater Bug','Hane-Hane','Penguin Soldier','Newdoria','Dark Core','Compulsory Evacuation Device','Bottomless Trap Hole','Trap Hole','Two-Pronged Attack','Thousand Knives','Exiled Force','Widespread Ruin']);
 const isRemoval=n=>removalNames.has(n);
 function reservedForRemoval(c){return (e.activeChain||[]).some(link=>{
  if(link.player!==p||link.inactive)return false;
  const n=e.name(link.code);
  if(n==='Heavy Storm')return c.location===L.SZONE;
  if(n==="Harpie's Feather Duster")return c.controller!==p&&c.location===L.SZONE;
  if(n==='Raigeki'||n==='Burst Stream of Destruction')return c.controller!==p&&c.location===L.MZONE;
  if(n==='Dark Hole'||n==='Torrential Tribute')return c.location===L.MZONE;
  if(n==='Mirror Force')return c.controller!==p&&c.location===L.MZONE&&!!(c.position&1);
  // Bottomless does not target. Reserve the summoned monsters it will destroy.
  if(e.cpuReviewRules?.duplicateRemoval!==false&&n==='Bottomless Trap Hole')return c.controller!==p&&c.location===L.MZONE&&face(c)&&atk(c)>=1500&&(e.lastSummoned||[]).some(t=>same(t,c));
  return (isRemoval(n)||['Mystical Space Typhoon','Dust Tornado','Breaker the Magical Warrior','De-Spell','Remove Trap'].includes(n))&&(link.targets||[]).some(t=>t.controller===c.controller&&t.location===c.location&&t.sequence===c.sequence);
 })}
 const attackStops=new Set(['Sakuretsu Armor','Magic Cylinder','Negate Attack','Mirror Force','Widespread Ruin','Draining Shield','Waboku','Threatening Roar']);
 function castleWallsDefender(){
  const a=e.attackCard,t=e.attackTarget;
  if(!a||!t||a.controller===p||a.location!==L.MZONE||t.controller!==p||t.location!==L.MZONE)return null;
  if(!enemy.some(x=>x.sequence===a.sequence)||reservedForRemoval(a)||e.battleProtected?.[p])return null;
  if((e.activeChain||[]).some(x=>!x.inactive&&x.player===p&&attackStops.has(e.name(x.code))))return null;
  const defender=own.find(x=>x.sequence===t.sequence);
  // The first Damage Step window can precede the defender's reveal. Castle
  // Walls targets only face-up monsters; wait for the post-flip window.
  return defender&&(defender.position&4)?defender:null;
 }
 // Resource decisions use public information and previously revealed identities only.
 const resourceRemoval=new Set([...removalNames].filter(n=>!['Man-Eater Bug','Hane-Hane','Penguin Soldier','Newdoria'].includes(n)));
 const wipes=new Set(['Raigeki','Dark Hole','Torrential Tribute','Mirror Force','Burst Stream of Destruction']);
 const engineThreats=new Set(['Fire Princess','Stealth Bird','Solar Flare Dragon','Bowganian','Cannon Soldier','Catapult Turtle','Magical Scientist','Royal Magical Library','Card of Safe Return','Wave-Motion Cannon','Airknight Parshath','Jinzo','Thousand-Eyes Restrict','Guardian Sphinx','The Agent of Judgment - Saturn']);
 const battleHazards=new Set(['Spirit Reaper','Marshmallon','Wall of Illusion','Newdoria','Yomi Ship','Reflect Bounder','D.D. Warrior Lady','D.D. Assailant']);
 const survivalDeck=[...hand,...own,...grave].some(c=>/Forbidden One|Exodia/.test(name(c)))||back.some(c=>face(c)&&LOCK.includes(name(c)));
 const same=(a,b)=>a&&b&&a.controller===b.controller&&a.location===b.location&&a.sequence===b.sequence;
 const enabled=c=>face(c)&&!c.is_disabled&&(!(data(c).type&1)||effectsEnabled(c.controller??p));
 const trapNegated=[0,1].some(s=>relic(s,'traps_no_more'))||[...own,...enemy].some(c=>enabled(c)&&name(c)==='Jinzo')||[...back,...theirBack].some(c=>enabled(c)&&name(c)==='Royal Decree');
 const imperialUp=[...back,...theirBack].some(c=>enabled(c)&&name(c)==='Imperial Order');
 const spellNegated=[0,1].some(s=>relic(s,'spells_no_more'))||[...own,...enemy].some(c=>enabled(c)&&name(c)==='Spell Canceller')||imperialUp;
 const activeLocks=[...back,...theirBack].filter(c=>enabled(c)&&!(data(c).type&4&&trapNegated)&&!(data(c).type&2&&spellNegated));
 const umi=activeLocks.some(c=>['Umi','A Legendary Ocean'].includes(name(c)));
 function effectiveLevel(c,future=false){return Math.max(1,lvl(c)-(future&&c.level===undefined&&c.location!==L.MZONE&&attr(c)==='WATER'&&activeLocks.some(x=>name(x)==='A Legendary Ocean')?1:0));}
 function blockedBy(c,side,lock,future=false){
  const n=name(lock),level=effectiveLevel(c,future),attack=c.location===L.MZONE?atk(c):projectedAttack(c);
  if(data(lock).type&2&&umi&&name(c)==='The Legendary Fisherman'&&!c.is_disabled)return false;
  if(n==='Level Limit - Area B'||n==='Gravity Bind')return level>=4;
  if(n==='Messenger of Peace')return attack>=1500;
  if(n==='Swords of Revealing Light')return lock.controller!==side;
  if(n==="Nightmare's Steelcage")return true;
  if(n==='Stumbling')return future;
  if(n==='Dragon Capture Jar')return race(c)==='Dragon';
  return false;
 }
 function attackBlocked(c,side=p,future=false,ignore=null){
  const targetLock=e.attackLocks?.get?.(`${side}:${c.sequence}`);if(c.location===L.MZONE&&targetLock&&activeLocks.some(x=>same(x,targetLock)&&!same(x,ignore)))return true;
  return activeLocks.some(x=>!same(x,ignore)&&!(future&&name(c)==='Jinzo'&&(data(x).type&4))&&!(future&&name(c)==='Spell Canceller'&&(data(x).type&2))&&blockedBy(c,side,x,future))||[...own,...enemy].some(x=>enabled(x)&&name(x)==='Thousand-Eyes Restrict'&&!same(x,c));
 }
 const battleLocked=!!e.battleProtected?.[1-p];
 const activeAttackers=side=>q(side,L.MZONE).filter(c=>face(c)&&(c.position&1)&&atk(c)>0&&!attackBlocked(c,side));
 function lockValue(c){
  if(!activeLocks.some(x=>same(x,c)))return 0;
  const stopped=own.filter(x=>blockedBy(x,p,c)).reduce((v,x)=>v+Math.max(0,atk(x)),0);
  const stoppedEnemy=enemy.filter(x=>face(x)&&blockedBy(x,1-p,c)).reduce((v,x)=>v+Math.max(0,atk(x)),0);
  // Keep a lock that protects an Exodia/burn plan; remove our own only when it opens a real attack.
  if(c.controller===p){
   const canUse=own.filter(x=>face(x)&&blockedBy(x,p,c)&&!attackBlocked(x,p,false,c)&&((x.position&1)||(prompt?.pos_changes||[]).some(t=>t.sequence===x.sequence)));
   const gain=canUse.reduce((v,x)=>v+atk(x),0);
   return e.player===p&&e.phase===4&&canUse.length&&(!enemy.length&&gain>=e.lp[1-p]||gain>stoppedEnemy+1000)&&!hand.some(x=>/Forbidden One|Exodia/.test(name(x)))?4000:0;
  }
  return stopped?3000+Math.min(1500,stopped*.2):LOCK.includes(name(c))?1500:0;
 }
 function tributeWorth(c,setting=false){
  const required=['The Winged Dragon of Ra','The Wicked Eraser'].includes(name(c))?3:effectiveLevel(c,true)>6?2:effectiveLevel(c,true)>4?1:0;
  if(required){
   const eligible=own.filter(x=>!(effectsEnabled(p)&&name(x)==='Relinquished')).sort((a,b)=>Math.max(atk(a),a.defense??0)-Math.max(atk(b),b.defense??0));
   if(eligible.length<required)return false;
   const paid=eligible.slice(0,required),newAtk=projectedAttack(c),newDef=c.defense??data(c).defense??0;
   const freed=x=>attackBlocked(x,p)&&!attackBlocked(c,p,true)&&newAtk>0;
   if(paid.some(x=>!freed(x)&&(newAtk<atk(x)||setting&&newDef<Math.max(atk(x),x.defense??0))))return false;
   const released=paid.some(freed)&&paid.every(x=>freed(x)||newAtk>=atk(x));
   const enemyAtk=Math.max(0,...enemy.filter(face).map(atk));
   const wall=paid.some(x=>(x.defense??0)>=enemyAtk&&(x.defense??0)>newDef);
   if(paid.some(x=>!face(x)&&flipUseful(name(x),x)&&prompt?.pos_changes?.some(y=>same(x,y))))return false;
   if(setting&&paid.some(x=>face(x)&&(x.position&1)&&attackAllowed(x,false))&&enemyAtk<newDef&&newDef<paid.reduce((sum,x)=>sum+atk(x),0))return false;
   if(setting)return newDef>=enemyAtk&&!wall&&newDef>Math.max(0,...paid.map(x=>Math.max(atk(x),x.defense??0)))+200;
   if(wall&&newAtk<=threat&&!released)return false;
   if(e.phase===4&&prompt?.to_bp&&paid.some(x=>face(x)&&(x.position&1)&&attackAllowed(x,!enemy.length)&&(!enemy.length||enemy.some(t=>atk(x)>power(t))))&&newAtk<=paid.reduce((n,x)=>n+atk(x),0))return false;
   const oldAtk=Math.max(0,...paid.map(atk)),oldDef=Math.max(0,...paid.map(x=>x.defense??0));
   const crossesThreat=enemy.length&&newAtk>threat&&oldAtk<=threat&&!attackBlocked(c,p,true);
   const lethal=e.phase===4&&prompt?.to_bp&&!enemy.length&&newAtk>=e.lp[1-p]&&paid.reduce((v,x)=>v+atk(x),0)<e.lp[1-p];
   const useful=summonUtility(c)&&!paid.some(x=>name(x)===name(c));
   const clearUpgrade=newAtk>=Math.max(oldAtk,oldDef)+400+(required-1)*200&&newAtk>paid.reduce((v,x)=>v+atk(x),0);
   if(!crossesThreat&&!lethal&&!useful&&!clearUpgrade&&!released)return false;
  }
  if(required&&effectsEnabled(p)&&own.some(x=>name(x)==='Relinquished')&&own.filter(x=>name(x)!=='Relinquished').length<required)return false;
  if(['The Winged Dragon of Ra','The Wicked Eraser'].includes(name(c)))return summonScore(c)>=0;
  const count=effectiveLevel(c,true)>6?2:effectiveLevel(c,true)>4?1:0;if(!count||!attackBlocked(c,p,true))return null;
  if(name(c)==='Jinzo'&&activeLocks.some(x=>name(x)==='Gravity Bind'))return true;
  if(effectThreat({...c,position:1})>=2000)return null;
  // A large printed ATK is not an upgrade while it cannot battle. Keep useful low-level bodies.
  const fodder=own.filter(x=>attackBlocked(x,p)||atk(x)<=0).sort((a,b)=>(a.defense??0)-(b.defense??0));
  return fodder.length>=count&&(c.defense??data(c).defense??0)>Math.max(0,...fodder.slice(0,count).map(x=>x.defense??0))+500;
 }
 function lockActivation(c){
  const n=name(c);if(!['Level Limit - Area B','Gravity Bind','Messenger of Peace',"Nightmare's Steelcage",'Stumbling'].includes(n))return null;
  if(activeLocks.some(x=>name(x)===n&&!same(x,c)))return -1;
  const stop=side=>q(side,L.MZONE).filter(x=>face(x)&&blockedBy(x,side,c,n==='Stumbling'));
  const mine=stop(p).reduce((v,x)=>v+atk(x),0),theirs=stop(1-p).reduce((v,x)=>v+atk(x),0);
  if(!theirs)return -1;
  const attacker=e.attackCard;if(e.player!==p&&attacker&&blockedBy(attacker,1-p,c)&&atk(attacker)>=e.lp[p])return 140;
  const alternate=hand.some(x=>/Forbidden One|Exodia/.test(name(x)))||own.some(x=>enabled(x)&&['Stealth Bird','Fire Princess','Bowganian'].includes(name(x)));
  if(e.player===p&&!enemy.length)return -1;
  return theirs>mine+300||alternate&&theirs>=mine?85:-1;
 }
 function effectThreat(c){
  if(!known(c)||c.is_disabled||((data(c).type&1)&&!effectsEnabled(c.controller??p)))return 0;
  if(engineThreats.has(name(c)))return 2300;
  const text=e.cards.get(c.code)?.desc||'';
  return (data(c).type&0x20)&&/draw |Special Summon|destroy|inflict|negate/i.test(text)?700:0;
 }
 function resilient(c){return known(c)&&enabled(c)&&(['Marshmallon','Spirit Reaper','Relinquished','Thousand-Eyes Restrict'].includes(name(c))||/cannot be destroyed by battle/i.test(e.cards.get(c.code)?.desc||''));}
 function targetValue(c){c=[...own,...enemy,...back,...theirBack].find(x=>same(x,c))||c;return !known(c)?1000:Math.max(power(c),(face(c)?atk(c):power(c))*(c.location===L.MZONE&&attackBlocked(c,c.controller)? .3:.8),600)+effectThreat(c)+(resilient(c)?2500:0)+((c.equip_cards?.length||0)*450);}
 function safeBattle(c){
  if(e.player!==p||e.phase!==4||prompt?.to_bp===false||battleLocked||!face(c)||(battleHazards.has(name(c))||resilient(c))||effectThreat(c)>=2000)return false;
  // Unknown back row makes a battle plan uncertain; do not assume it is safe.
  if(theirBack.some(x=>!face(x)))return false;
  return activeAttackers(p).some(a=>attackAllowed(a,false)&&!a.attack_disabled&&!(a.attack_count>0)&&atk(a)>power(c));
 }
 function candidates(n){
  let list=enemy.filter(c=>!reservedForRemoval(c));
  if(['Fissure','Smashing Ground','Ring of Destruction','Dark Core','Trap Hole','Bottomless Trap Hole'].includes(n))list=list.filter(face);
  if(n==='Nobleman of Crossout'||n==='Acid Trap Hole')list=list.filter(c=>!face(c));
  if(n==='Ring of Destruction')list=list.filter(c=>atk(c)<e.lp[p]&&atk(c)<=e.lp[1-p]);
  if(n==='Sakuretsu Armor')list=list.filter(c=>same(c,e.attackCard));
  if(n==='Mirror Force')list=list.filter(c=>c.position&1);
  if(n==='Widespread Ruin')list=list.filter(c=>c.position&1);
  if(n==='Trap Hole'||n==='Bottomless Trap Hole'){
   const summoned=e.lastSummoned||[];
   if(summoned.length)list=list.filter(c=>summoned.some(x=>same(x,c)));
   list=list.filter(c=>atk(c)>=(n==='Trap Hole'?1000:1500));
  }
  if(['Fissure','Smashing Ground','Widespread Ruin'].includes(n)&&list.length){
   const stat=c=>n==='Smashing Ground'?(c.defense??data(c).defense??0):atk(c);
   const v=(n==='Fissure'?Math.min:Math.max)(...list.map(stat));list=list.filter(c=>stat(c)===v);
  }
  return list;
 }
 function emergency(n,targets){
  if(n==='Ring of Destruction'&&targets.some(c=>atk(c)>=e.lp[1-p]))return true;
  const a=enemy.find(x=>same(x,e.attackCard)),t=own.find(x=>same(x,e.attackTarget));
  if(a?.controller===1-p&&targets.some(c=>same(c,a))&&!e.battleProtected?.[p]){
   const damage=battleDamage(t?((t.position&1)?Math.max(0,atk(a)-atk(t)):0):atk(a),1-p);
   if(damage>=e.lp[p])return true;
  }
  // Only claim an opening for lethal when every blocker is removed and attacks are available.
  if(e.player===p&&e.phase===4&&prompt?.to_bp!==false&&!battleLocked&&!theirBack.length&&enemy.every(c=>targets.includes(c))&&!['Dark Hole','Torrential Tribute','Burst Stream of Destruction'].includes(n)){
   if(activeAttackers(p).filter(c=>attackAllowed(c,true)&&!c.attack_disabled&&!(c.attack_count>0)).reduce((v,c)=>v+atk(c),0)>=e.lp[1-p])return true;
  }
  return !a&&!own.length&&activeAttackers(1-p).reduce((v,c)=>v+atk(c),0)>=e.lp[p]&&targets.some(c=>face(c)&&(c.position&1));
 }
 function resourceCost(c){
  const n=name(c);let cost=0;
  if(['Raigeki Break','Tribute to the Doomed','Dark Core'].includes(n)){
   const discards=hand.filter(x=>!same(x,c)&&!(/Forbidden One|Exodia/.test(name(x))));
   if(!discards.length)return Infinity;
   cost+=700+Math.min(...discards.map(x=>expendable(x)))*.25;
  }
  if(n==='Offerings to the Doomed')cost+=1200;
  if(n==='Exiled Force')cost+=700;
  if(n==='Two-Pronged Attack'){
   if(own.length<2)return Infinity;
   cost+=own.map(targetValue).sort((a,b)=>a-b).slice(0,2).reduce((a,b)=>a+b,0);
  }
  if(n==='Ring of Destruction')cost+=400;
  const payment=/pay ([\d,]+) (?:LP|Life Points)/i.exec(e.cards.get(c.code)?.desc||'');
  if(payment){const lp=Number(payment[1].replaceAll(',',''));if(lp>=e.lp[p])return Infinity;cost+=lp*(e.lp[p]<3000?1:.4);}
  return cost;
 }
 const backRemoval=new Set(['Heavy Storm',"Harpie's Feather Duster",'Mystical Space Typhoon','Dust Tornado','Breaker the Magical Warrior','De-Spell','Remove Trap']);
 function backValue(c){c=[...back,...theirBack].find(x=>same(x,c))||c;return known(c)?(lockValue(c)|| (LOCK.includes(name(c))?1500:0) ? Math.max(lockValue(c),1500):engineThreats.has(name(c))?3200:(data(c).type&(0x20000|0x80000|0x40000))?1500:400):900;}
 function preserveBreakerCounter(c,targets){
  if(e.player!==p||e.phase!==4||prompt?.to_bp===false||battleLocked)return false;
  const breaker=own.find(x=>same(x,c));
  if(!breaker||!face(breaker)||!(breaker.position&1)||breaker.attack_disabled||breaker.attack_count>0)return false;
  // Clear an actual battle lock first; the larger ATK is useless behind it.
  if(attackBlocked(breaker,p)||targets.some(x=>lockValue(x)>=3000||face(x)&&engineThreats.has(name(x))))return false;
  const before=atk(breaker),after=before-300;
  const walls=enemy.filter(t=>face(t)&&!reservedForRemoval(t)&&!battleHazards.has(name(t))&&power(t)<before&&power(t)>=after);
  if(!walls.length)return false;
  // Assign other available attackers once each; one ally cannot clear two walls.
  const allies=activeAttackers(p).filter(a=>!same(a,breaker)&&!a.attack_disabled&&!(a.attack_count>0)&&attackAllowed(a,false)).sort((a,b)=>atk(a)-atk(b));
  for(const wall of walls.sort((a,b)=>power(b)-power(a))){
   const i=allies.findIndex(a=>atk(a)>power(wall)&&!(name(a)==='Panther Warrior'&&own.length<3));
   if(i<0)return true;allies.splice(i,1);
  }
  return false;
 }
 function backScore(c){
  const n=name(c);let targets=[...theirBack,...back.filter(x=>lockValue(x)>=4000)].filter(x=>!reservedForRemoval(x));
  if(n==='De-Spell')targets=targets.filter(x=>face(x)&&(data(x).type&2));
  if(n==='Remove Trap')targets=targets.filter(x=>face(x)&&(data(x).type&4));
  if(!targets.length)return -1;
  // Resolve other monster removal first, then reconsider Breaker's counter.
  if(n==='Breaker the Magical Warrior'&&preserveBreakerCounter(c,targets))return -1;
  const cost=resourceCost(c);if(!Number.isFinite(cost))return -1;
  const best=Math.max(...targets.map(backValue));
  if(n==='Heavy Storm'||n==="Harpie's Feather Duster"){
   targets=targets.filter(x=>x.controller!==p||n==='Heavy Storm');const loss=n==='Heavy Storm'?back.filter(x=>!same(x,c)&&lockValue(x)<4000).reduce((v,x)=>v+backValue(x),0):0;
   const gain=targets.reduce((v,x)=>v+backValue(x),0)-loss;
   return gain>=2300&&(targets.length>=2||lockUp||targets.some(x=>lockValue(x)>=4000))?110:-1;
  }
  // MST is a cheap one-for-one answer: an unknown set card is worth clearing.
  // Keep the stricter threshold for discard removal and other expensive answers.
  const threshold=n==='Mystical Space Typhoon'||n==='Dust Tornado'&&e.cpuReviewRules?.dustTornado!==false?850:1400;
  if(best<threshold+cost)return -1;
  const offered=[...(prompt?.activates||[]),...(prompt?.chains||[]),...(prompt?.selects||[])];
  if(n==='Raigeki Break'&&offered.some(x=>['Mystical Space Typhoon','Dust Tornado','De-Spell','Remove Trap'].includes(name(x))&&backScore(x)>0))return -1;
  return 98+Math.min(15,best/400);
 }
 function removalScore(c){
  const n=name(c),targets=candidates(n);if(!targets.length)return -1;
  if(n==='Thousand Knives'&&!own.some(x=>face(x)&&name(x)==='Dark Magician'))return -1;
  if(n==='Burst Stream of Destruction'&&!own.some(x=>face(x)&&name(x)==='Blue-Eyes White Dragon'))return -1;
  const cost=resourceCost(c);if(!Number.isFinite(cost))return -1;
  const urgent=wipes.has(n)?emergency(n,targets):targets.some(x=>emergency(n,[x]));
  if(urgent)return 145;
  const answers=[...hand,...back].filter(x=>resourceRemoval.has(name(x))||wipes.has(name(x)));
  const lastAnswer=answers.length<=1?450:0;
  const valued=targets.map(x=>({c:x,value:targetValue(x)-(safeBattle(x)?2300:0)})).sort((a,b)=>b.value-a.value);
  if(wipes.has(n)){
   const ownLoss=['Dark Hole','Torrential Tribute'].includes(n)?own.reduce((v,x)=>v+targetValue(x),0):0;
   const useful=valued.filter(x=>x.value>=1400).length;
   const net=valued.reduce((v,x)=>v+Math.max(0,x.value),0)-ownLoss;
   if((useful<2&&!(danger&&net>=2600))||net<2300+lastAnswer+cost)return -1;
   return 105+Math.min(15,net/1000);
  }
  const target=valued[0];
  const defender=own.find(x=>same(x,e.attackTarget));
  if(same(target.c,e.attackCard)&&defender&&atk(target.c)>power(defender)&&targetValue(defender)>=2000)target.value+=1200;
  // Hold reactive removal until an attack or a visible engine demands an answer.
  if(e.player!==p&&!e.attackCard&&!danger&&effectThreat(target.c)<2000&&!['Trap Hole','Bottomless Trap Hole'].includes(n))return -1;
  let threshold=n==='Nobleman of Crossout'?850+lastAnswer*.25+cost:1400+lastAnswer+cost+(survivalDeck?250:0);
  if(n==='Compulsory Evacuation Device')threshold+=700; // Temporary relief must buy something substantial.
  if(target.value<threshold)return -1;
  // Spend a legal narrow answer before a flexible or costly one. Never assume a set trap is usable.
  const offered=[...(prompt?.activates||[]),...(prompt?.chains||[]),...(prompt?.selects||[])];
  const cheaper=offered.some(x=>['Fissure','Smashing Ground','Nobleman of Crossout','Sakuretsu Armor'].includes(name(x))&&name(x)!==n&&resourceCost(x)<cost+(['Raigeki Break','Dark Core','Compulsory Evacuation Device'].includes(n)?500:0)&&candidates(name(x)).some(t=>same(t,target.c)));
  if(cheaper)return -1;
  return 95+Math.min(20,(target.value-threshold)/200);
 }
 const deck=deckPolicy({e,p,L,q,name,data,atk,face,own,enemy,hand,grave,back,theirBack,lvl,race,attr,same,threat,ownPower,enemyPower,danger,targetValue,backValue,attackBlocked,exodiaPieces});
 // Spend Waboku for a threatened monster, meaningful damage, or survival.
 // Count the declared attack plus other attackers that have not attacked yet.
 function wabokuWorthUsing(){
  if(e.player===p||!e.attackCard||e.attackCard.controller!==1-p)return false;
  const current=enemy.find(x=>same(x,e.attackCard));
  if(!current)return false;
  const attackers=[current,...enemy.filter(x=>!same(x,current)&&face(x)&&(x.position&1)&&!x.attack_disabled&&!(x.attack_count>0)&&!attackBlocked(x,1-p))];
  let damage=0;
  for(const attacker of attackers){
   if((e.activeChain||[]).some(link=>!link.inactive&&link.player===p&&e.name(link.code)==='Book of Moon'&&(link.targets||[]).some(t=>same(t,attacker))))continue;
   const declared=same(attacker,current),target=declared&&e.attackTarget?own.find(x=>same(x,e.attackTarget)):null;
   const defenders=declared?(target?[target]:[]):own;
   if(!defenders.length){damage+=Math.max(0,atk(attacker));continue}
   let chip=0;
   for(const defender of defenders){
    const attackPosition=!!(defender.position&1),strength=attackPosition?atk(defender):(defender.defense??data(defender).defense??0);
    const difference=atk(attacker)-strength;
    const immune=effectsEnabled(p)&&!defender.is_disabled&&/cannot be destroyed by battle/i.test(e.cards.get(defender.code)?.desc||'');
    if(!immune&&(attackPosition?difference>=0&&atk(attacker)>0:difference>0))return true;
    chip=Math.max(chip,attackPosition||pierce(attacker,1-p)?Math.max(0,difference):0);
   }
   damage+=chip;
  }
  damage=battleDamage(damage,1-p);
  return damage>=1000||damage>0&&damage>=e.lp[p];
 }
 // Revival equips and hostile equips have different target ownership rules.
 const hostileEquips=new Set(['Snatch Steal','Falling Down','Mask of the Accursed','Ekibyo Drakmord','Germ Infection','Paralyzing Potion']);
 const nonBuffEquips=new Set(['Premature Burial','Autonomous Action Unit','Demotion','Scroll of Bewitchment','Smoke Grenade of the Thief']);
 const friendlyEquip=c=>!!(data(c).type&2)&&!!(data(c).type&0x40000)&&!hostileEquips.has(name(c))&&!nonBuffEquips.has(name(c));
 function templeSummonValue(c){
  const projected={...c,controller:p,location:L.MZONE,position:1};
  const useful=effectsEnabled(p)?effectThreat(projected):0;
  return projectedAttack(c)+Math.min(1400,useful*.35)+(summonUtility(c)?700:0);
 }
 function templeUpgradeAvailable(){
  const serket=own.find(x=>face(x)&&name(x)==='Mystical Beast of Serket');if(!serket)return false;
  const cost=templeSummonValue(serket)+500;
  return [...hand,...q(p,L.DECK),...q(p,L.EXTRA)].some(x=>{
   const t=e.cards.get(x.code)?.desc||'';
   if(!(data(x).type&1)||data(x).type&128||exodiaPieces.has(x.code)||name(x)==='Mystical Beast of Serket'||/must (?:first )?be (?:special|fusion|ritual) summoned|cannot be special summoned/i.test(t)||!specialOk(x))return false;
   return templeSummonValue(x)>cost||projectedAttack(x)>threat&&atk(serket)<=threat&&projectedAttack(x)>=atk(serket)+300;
  });
 }
 function resetValue(c){
  if(!c||!face(c)||c.controller!==p||!effectsEnabled(p)||c.is_disabled)return -1;
  const n=name(c);let value=0;
  if(n==='Magician of Faith'&&grave.some(x=>data(x).type&2))value=80;
  if(n==='Mask of Darkness'&&grave.some(x=>data(x).type&4))value=65;
  if(n==='Man-Eater Bug'&&enemy.length)value=75;
  if(n==='Penguin Soldier'&&enemy.length)value=70;
  if(n==='Big Eye'&&q(p,L.DECK).length>=5)value=30;
  if(n==='Relinquished'&&atk(c)<threat&&enemy.some(face))value=90;
  if(!value)return -1;
  if(e.player===p&&remainingAttackers().includes(c)&&(!enemy.length||enemy.some(t=>atk(c)>power(t))))return -1;
  return value;
 }
 function remainingAttackers(){
  if(e.player!==p||openingTurn||e.phase>=256||prompt?.to_bp===false||battleLocked)return [];
  return own.filter(a=>face(a)&&(a.position&1)&&!a.attack_disabled&&!attackBlocked(a,p)&&(!(a.attack_count>0)||same(a,e.attackCard)));
 }
 function moonRescue(){
  // Fissure only destroys face-up monsters. Do not pretend to save one by
  // merely redirecting it into another valuable face-up friendly monster.
  if(!(e.activeChain||[]).some(x=>!x.inactive&&x.player!==p&&e.name(x.code)==='Fissure'))return null;
  const targets=own.filter(face);if(targets.length!==1)return null;
  const c=targets[0];return !(data(c).type&0x4000)&&!c.is_immune?c:null;
 }
 const attackOnly=new Set(['Diffusion Wave-Motion','Stop Defense','Shooting Star Bow - Ceal','Fairy Meteor Crush','Big Bang Shot','Meteorain','Opti-Camouflage Armor','Riryoku']);
 function doomed(c){return e.limiterDoom?.has(`${c.controller}:${c.sequence}`);}
 function activation(c,chain=false){const n=name(c),d=data(c),spell=!!(d.type&2),t=e.cards.get(c.code)?.desc||'';
  if(replayRule('persistent_defense')&&n==='Ordeal of a Traveler')return hand.length&&!back.some(x=>face(x)&&name(x)===n)?82:-1;
    if(replayRule('swap_value')&&n==='Creature Swap'){
   const cheap=own.filter(x=>!resilient(x)).sort((a,b)=>Math.max(atk(a),a.defense??0)-Math.max(atk(b),b.defense??0))[0];
   if(e.cpuReviewRules?.swapForecast!==false){
    const obtained=Math.min(...enemy.map(x=>known(x)?controlledAttack(x):900));
    const given=cheap?controlledAttack(cheap,1-p):Infinity;
    return cheap&&enemy.length&&obtained>given+500?88:-1;
   }
   const floor=Math.min(...enemy.map(x=>known(x)?Math.max(controlledAttack(x),x.defense??0):900));
   return cheap&&enemy.length&&floor>Math.max(atk(cheap),cheap.defense??0)+500?88:-1;
  }
  if(replayRule('summon_resources')){
   if(n==='Reasoning')return own.length<5&&q(p,L.DECK).some(x=>(data(x).type&1)&&!(data(x).type&0xc0)&&summonScore(x)>=0)?85:-1;
   if(n==='Reinforcement of the Army')return q(p,L.DECK).some(x=>race(x)==='Warrior'&&effectiveLevel(x,true)<=4)?90:-1;
   if(n==='Skilled Dark Magician')return q(p,L.DECK).concat(hand,grave).some(x=>name(x)==='Dark Magician'&&projectedAttack(x)>atk(own.find(a=>same(a,c))||c))?85:-1;
  }
  if(replayRule('efficient_sacrifice')&&n==='Share the Pain'){
   const cheap=own.filter(x=>!resilient(x)).sort((a,b)=>expendable(a)-expendable(b))[0];
   return cheap&&enemy.length&&enemy.every(x=>known(x)&&targetValue(x)>expendable(cheap)+600)?88:-1;
  }
  if(replayRule('hold_combat_traps')&&['Kunai with Chain','Energy Drain','Metalmorph'].includes(n)&&c.location===L.SZONE&&!e.attackCard)return -1;
  if(n==='Avatar of The Pot')return has(hand,'Pot of Greed')&&q(p,L.DECK).length>3?96:-1;
  if(replayRule('repeat_flip')&&n==='Royal Keeper')return e.phase>=256&&!enemy.some(x=>face(x)&&pierce(x,1-p))?70:-1;

  // Do not commit a beneficial equip when only enemy/set monsters can receive it.
  // Face-up/Graveyard effects (including costs and recovery) use their own rules.
  if(friendlyEquip(c)&&prompt?.summons?.some(x=>lvl(x)>=5&&tributeWorth(x)!==false&&projectedAttack(x)>Math.max(0,...own.map(atk))))return -1;
  if(n==='Black Luster Soldier - Envoy of the Beginning'&&!enemy.length&&Number(BigInt(c.description||0)&0xfffffn)!==1)return -1;
  if(friendlyEquip(c)&&(c.location===L.HAND||c.location===L.SZONE&&!face(c))&&!own.some(face))return -1;

  if(spell&&(d.type&0x80)&&relic(p,'cursed_ritual_scar')&&e.lp[p]<=1000*relics(p).filter(k=>k==='cursed_ritual_scar').length)return -1;
  if(n==='Polymerization'&&relic(p,'cursed_fusion_fever')&&hand.some(x=>exodiaPieces.has(x.code))&&!hand.some(x=>!same(x,c)&&!(data(x).type&1)&&!exodiaPieces.has(x.code)))return -1;
  // Save Waboku for the Battle Phase, including its start/end steps.
  if(n==='Waboku'&&![8,16,32,64,128].includes(e.phase))return -1;
  // Protect the five actual win-condition pieces, including send-to-GY costs.
  if(hand.some(x=>exodiaPieces.has(x.code))){
   const available=hand.filter(x=>!same(x,c)&&!exodiaPieces.has(x.code)).length;
   if(['Card Destruction','Morphing Jar','Fiber Jar'].includes(n))return -1;
   const fixed={'Graceful Charity':2,'Hand Destruction':2,'Dark World Dealings':1,'Magical Stone Excavation':2,'Spell Reproduction':2};
   const match=t.match(/discard (\d+|a|an|one|two|three)\b/i);
   const count=fixed[n]??(match?({a:1,an:1,one:1,two:2,three:3}[match[1].toLowerCase()]??Number(match[1])):0);
   if(count>available)return -1;
   if(/discard (?:your|their|the|all(?: the cards in your)?) hand/i.test(t))return -1;
  }

  if(c.is_disabled||((d.type&1)&&!effectsEnabled(p)))return -1;
  if((d.type&2)&&[0,1].some(s=>relic(s,'spells_no_more'))||(d.type&4)&&[0,1].some(s=>relic(s,'traps_no_more')))return -1;
  // Reserve one ordinary S/T slot for cards that leave after resolving.
  const lasting=!!(d.type&(0x20000|0x40000))||['Swords of Revealing Light',"Nightmare's Steelcage"].includes(n);
  if(c.location===L.HAND&&(d.type&6)&&!(d.type&0x80000)&&lasting&&back.filter(x=>x.sequence<5).length>=(e.aiModifiers?.spellTrapZones??5)-1)return -1;
  if((d.type&6)&&attackOnly.has(n)&&!remainingAttackers().length)return -1;
  if(friendlyEquip(c)&&own.filter(face).length&&own.filter(face).every(doomed))return -1;
  if(n==='Limiter Removal'){const machines=remainingAttackers().filter(x=>race(x)==='Machine');const lethal=!enemy.length&&machines.reduce((v,x)=>v+atk(x)*2,0)>=e.lp[1-p];const breakthrough=enemy.some(t=>known(t)&&!resilient(t)&&machines.some(a=>atk(a)<=power(t)&&atk(a)*2>power(t)));if(!lethal&&!breakthrough)return -1;}
  const canBattle=e.player===p&&e.turn>1&&e.phase<256&&prompt?.to_bp!==false&&!battleLocked;
  if(n==='Stop Defense'&&!canBattle)return -1;
  if(n==='Giant Trunade')return canBattle&&(activeAttackers(p).length>0||(prompt?.special_summons?.length>0&&prompt?.summons?.length>0))&&theirBack.length?90:-1;
  if(n==='Book of Moon'){
   if(moonRescue())return 115;
   if(e.player!==p&&(e.battleProtected?.[p]||(e.activeChain||[]).some(link=>!link.inactive&&link.player===p&&attackStops.has(e.name(link.code)))))return -1;
   const attacker=enemy.find(x=>same(x,e.attackCard));
   if(e.player!==p)return attacker&&attackAllowed(attacker,!own.length)&&!reservedForRemoval(attacker)?95:-1;
   return canBattle&&enemy.some(x=>face(x)&&(x.position&1)&&own.some(a=>attackAllowed(a,false)&&atk(a)>(x.defense??0)&&atk(a)<=atk(x)))?85:own.some(x=>resetValue(x)>=65)?70:-1;
  }
  if(['Reinforcements','Rush Recklessly'].includes(n)){
   if(!chain||!e.attackCard||e.player!==p&&!(e.inDamageStep||e.phase===32||e.phase===64))return -1;
   const our=own.find(x=>same(x,e.attackCard)||same(x,e.attackTarget)),other=enemy.find(x=>same(x,e.attackCard)||same(x,e.attackTarget));
   if(!our||!(our.position&1)||e.battleProtected?.[e.player===p?1-p:p])return -1;
   const bonus=n==='Reinforcements'?500:700;
   return other&&atk(our)<=power(other)&&atk(our)+bonus>power(other)||!other&&e.player===p&&atk(our)<e.lp[1-p]&&atk(our)+bonus>=e.lp[1-p]?95:-1;
  }
  const stall=lockActivation(c);if(stall!==null)return stall;
  if(e.player===p&&!e.attackCard&&['Limiter Removal','Rush Recklessly','Reinforcements','Axe of Despair','Malevolent Nuzzler','United We Stand','Mage Power'].includes(n)&&own.length&&own.every(x=>attackBlocked(x,p)))return -1;
  // During the other player's turn, preserve combat tricks until the Damage Step.
  // Do not suppress a spent card's separate graveyard/banished triggered effect.
  const spent=c.location===L.GRAVE||c.location===L.REMOVED;
  // A face-up Imperial Order negates every spell on the field, including our
  // own. Hold spells while it stands, except a direct answer to its activation.
  if(imperialUp&&!spent&&(d.type&2)&&!(chain&&e.effect&&name(e.effect.code)==='Imperial Order'))return -1;
  // Temporary combat boosts expire before the opponent can attack: hold them
  // when there is no remaining attack this turn, or resolved protection nullifies it.
  const temporaryBoost=['Limiter Removal','Riryoku','Deal of Phantom'].includes(n)||(!!(d.type&6)&&t.split(/[.!?]/).some(t=>/\b(?:ATK|DEF)\b/i.test(t)&&/(?:until (?:the )?(?:end (?:phase|of (?:this|the) turn))|during the turn this card is activated)/i.test(t)&&/(?:gain|increase|double|add|become|switch)/i.test(t)));
  if(!spent&&e.player===p&&temporaryBoost){
   const inBattle=e.attackCard?.controller===p;
   const candidates=Array.isArray(prompt?.attacks)?prompt.attacks.map(a=>own.find(x=>x.sequence===a.sequence)||a):own;
   const canAttack=e.turn!==1&&e.phase<256&&!(e.phase===4&&prompt?.to_bp===false)&&!e.battleProtected?.[1-p]&&candidates.some(a=>face(a)&&(a.position&1)&&!a.attack_disabled&&!attackBlocked(a,p)&&(!(a.attack_count>0)||inBattle&&same(a,e.attackCard))&&(n!=='Limiter Removal'||race(a)==='Machine'));
   if(!canAttack)return -1;
  }

  const damageStep=e.inDamageStep||e.phase===32||e.phase===64;
  if(e.player!==p&&!damageStep&&!spent&&damageStepModifiers.has(n))return -1;
  if(chain&&attackStops.has(n)&&(e.activeChain||[]).some(x=>!x.inactive&&x.player===p&&attackStops.has(e.name(x.code))))return -1;
  if(chain&&attackStops.has(n)&&e.attackCard&&reservedForRemoval(e.attackCard))return -1;
  // Resolved protection survives CHAIN_END; do not spend another pure battle stopper.
  if(chain&&['Waboku','Threatening Roar','Negate Attack'].includes(n)&&e.battleProtected?.[p])return -1;
  if(['Waboku','Negate Attack','Threatening Roar'].includes(n))return chain&&wabokuWorthUsing()?90:-1;
  if(isRemoval(n)&&enemy.length){
   const legal=enemy.filter(x=>n==='Nobleman of Crossout'?!face(x):n==='Ring of Destruction'?face(x)&&atk(x)<e.lp[p]&&atk(x)<=e.lp[1-p]:true);
   if(legal.length&&legal.every(reservedForRemoval)&&!(n==='Raigeki Break'&&backScore(c)>=0))return -1;
  }
  if(d.type&6){
   // Inspect the live back row before committing any spell/trap activation.
   // Ignore the source itself: an already-set card must remain activatable.
   const duplicates=back.filter(x=>x.code===c.code&&face(x)&&!(c.location===L.SZONE&&c.controller===p&&x.sequence===c.sequence));
   if((e.activeChain||[]).some(x=>!x.inactive&&x.player===p&&x.code===c.code))return -1;
   // A second face-up continuous/field copy ordinarily adds no useful action.
   if(duplicates.length&&(d.type&(0x20000|0x80000))&&!['Wave-Motion Cannon',"Gravekeeper's Servant"].includes(n))return -1;
  }
  if(n==='Relinquished')return enemy.length&&back.length<5?140:-1;
  if(n==='The Shallow Grave'){
   const value=c=>Math.max(atk(c),c.defense??data(c).defense??0);
   const mine=grave.filter(c=>(data(c).type&1)&&!exodiaPieces.has(c.code)),theirs=q(1-p,L.GRAVE).filter(c=>data(c).type&1);
   if(!mine.length||Math.max(...mine.map(value))<=Math.max(0,...theirs.map(value)))return -1;
  }
  if(revival.has(n)){
   if(openingTurn&&!grave.concat(q(1-p,L.GRAVE)).some(x=>(data(x).type&1)&&!exodiaPieces.has(x.code)&&(Math.max(atk(x),x.defense??data(x).defense??0)>=1800||summonUtility(x))))return -1;
   const pool=n==='Monster Reborn'?[...grave,...q(1-p,L.GRAVE)]:grave;
   if(!pool.some(x=>(data(x).type&1)&&!exodiaPieces.has(x.code)))return -1;
   // Bank revival resources after battle when the existing board already covers
   // the visible threat. Do not apply this to reactive chains or a recovery turn.
   if(!chain&&e.player===p&&e.phase===256&&own.length>=(e.cpuReviewRules?.holdRevival!==false?1:2)&&own.length>=enemy.length){
    const available=pool.filter(x=>(data(x).type&1)&&!exodiaPieces.has(x.code));
    const strongest=Math.max(0,...own.map(power));
    const protectionNeeded=enemy.some(x=>face(x)&&atk(x)>=strongest)||enemyPower>own.reduce((v,x)=>v+power(x),0);
    const combo=available.some(x=>summonUtility(x)||effectsEnabled(p)&&(
     name(x)==='Breaker the Magical Warrior'&&theirBack.length>0||
     name(x)==='Jinzo'&&theirBack.some(y=>face(y)&&(data(y).type&4))||
     name(x)==='Cure Mermaid'&&firePrincess));
    const tributeNeeded=(e.cpuReviewRules?.holdRevival===false||!!prompt?.summons?.length)&&hand.some(x=>{const need=['The Winged Dragon of Ra','The Wicked Eraser'].includes(name(x))?3:effectiveLevel(x,true)>6?2:effectiveLevel(x,true)>4?1:0;return need>own.length&&(projectedAttack(x)>strongest||summonUtility(x));});
    // A ritual or fusion with identified materials is an immediate use, unlike
    // a speculative extra body. Keep this conservative when a combo is possible.
    const materialUse=hand.some(x=>(data(x).type&2)&&(data(x).type&0x80))&&hand.some(x=>data(x).type&0x80&&data(x).type&1)||hand.some(x=>name(x)==='Polymerization')&&q(p,L.EXTRA).some(x=>available.some(y=>(e.cards.get(x.code)?.desc||'').split('\n')[0].includes('"'+name(y)+'"')));
    if(!protectionNeeded&&!combo&&!tributeNeeded&&!materialUse)return -1;
   }
  }
  if(exodiaPlan){
   if(['Reload','Magical Mallet','Fiber Jar','Morphing Jar #2','Cyber Jar','Dragged Down into the Grave','Exchange'].includes(n))return -1;
   const draws={'Pot of Greed':2,'Graceful Charity':3,'Upstart Goblin':1,'Jar of Greed':1,'Reckless Greed':2};
   if(draws[n])return q(p,L.DECK).length>=draws[n]?125:-1;
   if(handSearch.has(n)&&q(p,L.DECK).some(missingPiece))return 135;
   if(handRecovery.has(n)&&grave.some(x=>missingPiece(x)&&(n!=='Backup Soldier'&&n!=='Dark Factory of Mass Production'||!(data(x).type&0x20))))return 135;
  }
  if(n==='Wave-Motion Cannon'){
   const live=back.find(x=>same(x,c));
   // Card activation starts charging; its face-up ignition effect spends the charge.
   if(c.location!==L.SZONE||!live||!face(live))return spellNegated?-1:85;
   const charge=x=>1000*(e.cardTurnCounts?.get(`${x.controller}:${x.location}:${x.sequence}`)||0);
   const damage=charge(live);
   if(!damage||spellNegated||live.is_disabled||enemy.some(x=>enabled(x)&&['Des Wombat','Prime Material Dragon'].includes(name(x))))return -1;
   return burnDamage(damage)>=e.lp[1-p]?180:-1;
  }
  const recent=deck.activation(c,chain);if(recent!==null)return recent;
  if(!spent&&backRemoval.has(n))return backScore(c);
  if(!spent&&(resourceRemoval.has(n)||wipes.has(n)))return n==='Raigeki Break'?Math.max(removalScore(c),backScore(c)):removalScore(c);
  if(['Pot of Greed','Graceful Charity','Upstart Goblin','Jar of Greed'].includes(n))return q(p,L.DECK).length>3?95:-1;
  // Character-specific packages: only commit when their real prerequisite is present.
  if(['Thousand Knives','Dark Magic Attack','Dark Magic Curtain','Diffusion Wave-Motion'].includes(n)){
   if(n==='Dark Magic Curtain')return !own.length&&has(q(p,L.DECK),'Dark Magician')&&e.lp[p]>2000?98:-1;
   if(n==='Diffusion Wave-Motion')return e.lp[p]>1500&&remainingAttackers().some(x=>race(x)==='Spellcaster'&&lvl(x)>=7&&enemy.filter(t=>!known(t)||atk(x)>power(t)).length>=2)?85:-1;
   return has(own,'Dark Magician')&&(n==='Thousand Knives'?enemy.length:theirBack.length)?110:-1;
  }
  if(n==='Burst Stream of Destruction')return has(own,'Blue-Eyes White Dragon')&&enemy.length?115:-1;
  if(n==='The Flute of Summoning Dragon')return has(own,'Lord of D.')&&hand.some(x=>race(x)==='Dragon')&&own.length<5?96:-1;
  if(n==='Stamping Destruction')return dragonFace.length&&theirBack.length?105:-1;
  if(n==='Toon Table of Contents')return q(p,L.DECK).some(x=>name(x).includes('Toon'))?93:-1;
  if(n==='Amplifier')return has(own,'Jinzo')?60:-1;
  if(n==='Insect Barrier')return enemy.some(x=>face(x)&&race(x)==='Insect')?70:-1;
  if(n==='Eradicating Aerosol')return enemy.filter(x=>face(x)&&race(x)==='Insect').length>own.filter(x=>face(x)&&race(x)==='Insect').length?110:-1;
  if(n==='DNA Surgery')return has(back,'Insect Barrier')?85:-1;
  if(n==='Multiplication of Ants')return own.length<=2&&own.some(x=>race(x)==='Insect'&&atk(x)<1000)?65:-1;
  if(n==='Jam Breeding Machine')return !own.length&&!hand.some(x=>(data(x).type&1)&&lvl(x)<=4)?40:-1;
  if(n==='Exchange of the Spirit')return e.lp[p]>2000&&q(1-p,L.GRAVE).length<grave.length?80:-1;
  // Recovering an equip is not worth sacrificing a stronger established monster.
  if(n==='Axe of Despair'&&c.location===L.GRAVE)return own.some(x=>atk(x)<=1000&&!exodiaPieces.has(x.code)&&!['Relinquished','Thousand-Eyes Restrict'].includes(name(x)))?35:-1;
  if(n==='Enemy Controller'&&BigInt(c.description||0)%1048576n===0n&&![8,16,32,64,128].includes(e.phase))return -1;
  if(n==='Levia-Dragon - Daedalus')return umiActive&&enemyPower+theirBack.length*800>ownPower-atk(c)+back.length*800?115:-1;
  if(n==='Guardian Sphinx')return enemy.length?110:-1;
  if(n==='Swarm of Scarabs')return enemy.length?100:-1;
  if(n==='Swarm of Locusts')return theirBack.length?100:-1;
  if(n==='Spellbinding Circle'&&!chain)return enemy.some(x=>face(x)&&(x.position&1)&&atk(x)>=1700)?85:-1;
  if(['Nightmare Wheel','Mask of the Accursed','Spellbinding Circle'].includes(n))return enemy.some(face)?85:-1;  if(n==='Mask of Dispel')return theirBack.some(x=>face(x)&&(data(x).type&2))?55:-1;
  if(n==='Shield & Sword')return shieldSwordScore();
  if(['Graceful Dice','Skull Dice','Metalmorph','Enemy Controller'].includes(n))return chain&&enemy.length&&own.some(face)?80:-1;
  if(n==='Acid Trap Hole')return enemy.some(x=>!face(x)&&!reservedForRemoval(x)&&(!e.knownFieldCard?.(p,x)||((e.data[e.knownFieldCard(p,x)]?.defense??0)<=2000)))?95:-1;
  if(n==='Temple of the Kings'&&c.location===L.SZONE&&face(c))return templeUpgradeAvailable()?100:-1;
  if(['Widespread Ruin','Lightforce Sword','Blast Held by a Tribute','Judgment of Anubis','White Hole','Dark Spirit of the Silent'].includes(n))return chain&&e.player!==p?95:-1;
  if(['Embodiment of Apophis','Metal Reflect Slime'].includes(n))return own.length<5?65:-1;
  if(['Coffin Seller','Card of Safe Return','Temple of the Kings'].includes(n))return 45;
  if(["Nightmare's Steelcage",'The Dark Door','Dragon Capture Jar'].includes(n))return danger?70:-1;
  if(n==='Spiritualism')return theirBack.length?90:-1;
  const equipRace={'Salamandra':'Zombie','Insect Armor with Laser Cannon':'Insect','Raise Body Heat':'Dinosaur','Silver Bow and Arrow':'Fairy',"Sword of Dragon's Soul":'Warrior'};
  if(equipRace[n])return own.some(x=>face(x)&&race(x)===equipRace[n])?65:-1;
  if(n==='Cyber Shield')return own.some(x=>face(x)&&name(x)==='Harpie Lady')?65:-1;
  if(n==='Follow Wind')return own.some(x=>face(x)&&race(x)==='Winged Beast')?60:-1;
  if(n==='Time Machine'){
   const losses=e.battleLosses||[],lost=losses[0];
   return chain&&losses.length===1&&lost.controller===p&&!exodiaPieces.has(lost.code)&&own.length<5&&q(lost.graveController,L.GRAVE).some(x=>x.code===lost.code)?90:-1;
  }
  if(n==='Fake Trap')return chain&&back.filter(x=>data(x).type&4).length>1&&e.effect?.player!==p?95:-1;
  if(n==='Magical Hats')return chain&&own.length<4&&e.player!==p&&q(p,L.DECK).filter(x=>data(x).type&6).length>=2?85:-1;
  if(n==='Interdimensional Matter Transporter')return chain&&e.effect?.player!==p&&own.some(x=>face(x)&&atk(x)>=1800)?80:-1;
  if(n==='The Mask of Remnants')return has(own,'Masked Beast Des Gardius')?-1:hand.length<3?20:-1;
  if(n==='Revival Jam')return e.lp[p]>2500&&own.length<3?65:-1;
  if(n==='Kuriboh')return chain?95:-1;
  if(n==='Gilasaurus')return own.length<4&&!q(1-p,L.GRAVE).some(x=>(data(x).type&1)&&atk(x)>1400)?80:-1;
  if(n==='Viser Des')return enemy.length?80:-1;
  if(n==='Little-Winguard')return e.player===p&&enemy.some(x=>face(x)&&atk(x)>atk(c))?60:-1;
  if(n==='Cyber Raider')return theirBack.some(x=>face(x)&&(data(x).type&0x40000))?80:-1;
  if(n==='Mystic Plasma Zone')return own.filter(x=>face(x)&&attr(x)==='DARK').length>enemy.filter(x=>face(x)&&attr(x)==='DARK').length?60:-1;
  if(n==='Yami'||n==='Mountain'){
   const bonus=x=>n==='Yami'?(['Fiend','Spellcaster'].includes(race(x))?200:race(x)==='Fairy'?-200:0):(['Dragon','Winged Beast','Thunder'].includes(race(x))?200:0);
   const net=own.filter(face).reduce((v,x)=>v+bonus(x),0)-enemy.filter(face).reduce((v,x)=>v+bonus(x),0);
   return net>0?60:-1;
  }
  if(n==='Wasteland')return own.filter(x=>face(x)&&['Dinosaur','Zombie','Rock'].includes(race(x))).length>enemy.filter(x=>face(x)&&['Dinosaur','Zombie','Rock'].includes(race(x))).length?60:-1;
  if(n==='Card Destruction'||n==='Morphing Jar')return hand.length<3?60:-1;
  if(n==='Delinquent Duo')return e.lp[p]>2000&&q(1-p,L.HAND).length>=2?92:-1;
  if(n==='Confiscation'||n==='The Forceful Sentry')return e.lp[p]>(n==='Confiscation'?2000:0)&&q(1-p,L.HAND).length?92:-1;
  if(n==='Raigeki')return enemy.length?120:-1;
  if(n==='Dark Hole'||n==='Torrential Tribute')return enemy.length&&enemyPower>ownPower+800?120:-1;
  if(n==='Heavy Storm')return theirBack.length>=2&&theirBack.length>back.filter(x=>x.code!==c.code).length?115:-1;
  if(n==="Harpie's Feather Duster")return theirBack.length?115:-1;
  if(['Mystical Space Typhoon','Dust Tornado','Breaker the Magical Warrior'].includes(n))return lockUp?118:(theirBack.some(x=>face(x))?110:(danger?105:-1));
  if((n==='Heavy Storm'||n==="Harpie's Feather Duster")&&lockUp)return 122;
  if(n==='De-Spell'&&theirBack.some(x=>face(x)&&(name(x)==='Messenger of Peace'||name(x)==='Swords of Revealing Light')))return 112;
  if(n==='De-Spell')return theirBack.some(x=>face(x)&&(data(x).type&2))?105:-1;
  if(n==='Remove Trap')return theirBack.some(x=>face(x)&&(data(x).type&4))?105:-1;
  if(['Fissure','Smashing Ground','Tribute to the Doomed','Raigeki Break'].includes(n))return enemy.length&&(!/Tribute|Break/.test(n)||hand.length>=2)?105:-1;
  if(n==='Two-Pronged Attack')return own.length>=2&&own.map(expendable).sort((a,b)=>a-b).slice(0,2).reduce((a,b)=>a+b,0)<threat?100:-1;
  if(['Change of Heart','Snatch Steal'].includes(n))return enemy.some(x=>face(x)&&(n==='Snatch Steal'||canBattle&&(enemy.length===1||enemy.some(t=>!same(t,x)&&controlledAttack(x)>power(t)))))?110:-1;
  if(n==='Mind Control')return enemy.some(x=>face(x))&&(canBattle||hand.some(t=>effectiveLevel(t,true)>4&&effectiveLevel(t,true)<=6))?105:-1;
  if(n==='Nobleman of Crossout')return enemy.some(c=>!face(c))?105:-1;
  if(n==='Stop Defense'&&enemy.filter(x=>face(x)&&!(x.position&1)).every(x=>activeLocks.some(l=>name(l)==='Level Limit - Area B'&&blockedBy(x,1-p,l))))return -1;
  if(n==='Block Attack'&&canBattle)return enemy.some(x=>face(x)&&x.position&1&&(x.defense??data(x).defense)<Math.max(0,...own.map(atk)))?85:-1;
    if(n==='Monster Reborn'||n==='Premature Burial'||n==='Call of the Haunted'||n==='The Shallow Grave'){
   const choices=n==='Monster Reborn'?[...grave,...q(1-p,L.GRAVE)]:grave;
   const elig=choices.filter(x=>(data(x).type&1)&&!exodiaPieces.has(x.code));const best=Math.max(0,...elig.map(atk));if(!(own.length<5&&elig.some(x=>atk(x)>threat)&&(n!=='Premature Burial'||e.lp[p]>1800)))return -1;if(best>=1800)return 90;const need=m=>effectiveLevel(m,true)>6?2:effectiveLevel(m,true)>4?1:0;return hand.some(m=>!same(m,c)&&(data(m).type&1)&&need(m)>own.length)?90:-1;
  }
  if(n==='Polymerization')return fusionReady()?95:-1;
  if(n==='Fusion Sage')return !has(hand,'Polymerization')&&has(q(p,L.DECK),'Polymerization')?95:-1;
  if(n==='Black Illusion Ritual'&&(!enemy.length||back.filter(x=>x.sequence<5).length>=(e.aiModifiers?.spellTrapZones??5)||!effectsEnabled(p)))return -1;
  if(n==='Black Illusion Ritual')return ritualGate(c,'Relinquished',threat>=1800||enemy.some(x=>face(x)&&atk(x)>=2000)?97:95);
  if(n==='Black Magic Ritual')return ritualGate(c,'Magician of Black Chaos',95);
  if(n==='Curse of the Masked Beast')return ritualGate(c,'The Masked Beast',ownPower<=enemyPower+2000?95:-1);
  if(n==="Shinato's Ark")return ritualGate(c,'Shinato, King of a Higher Plane',enemy.some(x=>!(x.position&1))?96:95);
  if(d.type&0x80&&spell)return ritualReady(c)?95:-1;
  if(n==='Toon World')return e.lp[p]>2000&&hand.some(x=>data(x).type&0x400000)?90:-1;
  if(n==='Elegant Egotist')return has(own,'Harpie Lady')&&own.length<5?95:-1;
  if(n==='Scapegoat')return chain&&e.player!==p&&own.length<=1&&danger?90:-1;
  if(n==='Limiter Removal')return chain&&e.player===p&&own.some(x=>e.cards.get(x.code)?.race==='Machine')?95:-1;
  if(n==='Swords of Revealing Light')return enemy.length&&danger?70:-1;
  if(['Enchanted Javelin','Mirror Wall','Fairy Box','Mask of Weakness'].includes(n))return chain&&e.player!==p&&danger?90:-1;
  if(['Mirror Force','Magic Cylinder','Trap Hole','Bottomless Trap Hole','Sakuretsu Armor','Anti Raigeki','Gryphon Wing','Call of the Grave','Numinous Healer','Shadow of Eyes'].includes(n))return chain?100:-1;
  if(n==='Ekibyo Drakmord'&&e.cpuReviewRules?.ekibyo!==false)return enemy.some(x=>face(x)&&!attackBlocked(x,1-p)&&!safeBattle(x)&&atk(x)>=1600)?85:-1;
  if(n==='Solemn Judgment')return chain&&(e.chainDepth?e.effect?.player===1-p:e.summoningPlayer===1-p)&&e.lp[p]>1500?100:-1;
  if(['Magic Jammer','Seven Tools of the Bandit'].includes(n))return chain&&e.effect?.player===1-p&&e.lp[p]>1500?100:-1;
  if(n==='Dark Balter the Terrible'||n==='Ryu Senshi')return chain&&e.effect?.player!==p&&e.lp[p]>1000?92:-1;
  if(n==='Ring of Destruction')return enemy.some(x=>face(x)&&atk(x)<e.lp[p]&&atk(x)<=e.lp[1-p])?100:-1;
  if(n==='Reckless Greed')return chain&&hand.length<=1&&q(p,L.DECK).length>2?65:-1;
  // Ceasefire had no activation rule at all: 500 damage per face-up monster.
  if(n==='Ceasefire'){const burn=500*[...own,...enemy].filter(x=>face(x)).length;return burn>=e.lp[1-p]?120:(chain||e.phase===4)&&burn>=1000?80:-1;}
  if(n==='Just Desserts')return enemy.length>=2||enemy.length*500>=e.lp[1-p]?80:-1;
  if(n==='Secret Barrel'){const t=q(1-p,L.HAND).length+enemy.length+theirBack.filter(Boolean).length;return t*200>=e.lp[1-p]?120:t>=6?75:-1;}
  if(n==='Gift of The Mystical Elf'){
   if(!healingAllowed(p)||[...own,...enemy].some(x=>face(x)&&enabled(x)&&name(x)==='Nurse Reficule the Fallen One')||[...back,...theirBack].some(x=>face(x)&&!x.is_disabled&&name(x)==='Bad Reaction to Simochi'))return -1;
   const monsters=[...own,...enemy].filter(face).length;
   const threatened=e.cpuReviewRules?.chainHealing!==false&&chain&&(e.activeChain||[]).some(link=>!link.inactive&&(['Heavy Storm',"Harpie's Feather Duster",'Giant Trunade'].includes(e.name(link.code))||(link.targets||[]).some(t=>same(t,c))&&['Mystical Space Typhoon','Dust Tornado','Raigeki Break','Tornado Bird','Breaker the Magical Warrior','Mobius the Frost Monarch'].includes(e.name(link.code))));
   return monsters>0&&(threatened||monsters>=3&&e.lp[p]<6000)?50:-1;
  }
  if(['Red Medicine',"Goblin's Secret Remedy"].includes(n))return e.lp[p]<8000?40:-1;
  if(n==='Reinforcements'||n==='Rush Recklessly'){if(!chain)return -1;
  if(e.phase===8&&e.attacker&&e.attacker.player===p){
   const ax=e.attacker,orig=ax.attack??0;
   const needless=enemy.length&&enemy.every(x=>face(x)&&!(x.position&1)&&((x.defense??e.data[x.code]?.defense)??Infinity)<=orig);
   if(needless)return -1;
   return own.some(x=>face(x)&&(x.position&1)&&atk(x)>threat)?50:-1;}
  return own.some(x=>face(x)&&(x.position&1))?50:-1;}
  if(n==='Castle Walls'){
   if(!chain)return -1;
   const defender=castleWallsDefender();
   if(!defender)return -1;
   const attacker=enemy.find(x=>x.sequence===e.attackCard.sequence);
   const defense=defender.defense??data(defender).defense??0;
   // Save a losing defender; never spend the trap on an already-safe or doomed wall.
   return atk(attacker)>defense&&atk(attacker)<=defense+500?90:-1;
  }
  if(n==='Destiny Board')return back.length<=1?80:-1;
  if(n.startsWith('Spirit Message'))return -1;
  if(n==='Gravity Bind')return own.every(x=>(e.cards.get(x.code)?.level||0)<4)&&enemy.some(x=>(e.cards.get(x.code)?.level||0)>=4)?75:-1;
  if(n==='Royal Decree')return theirBack.length>back.length?65:-1;
  if(n==='Infinite Cards'||n==='Gamble'||n==='Monster Recovery')return -1;
  if(n==='Tornado Wall')return has(back,'Umi')||has(back,'A Legendary Ocean')?70:-1;
  if(['Solemn Wishes','Life Absorbing Machine','Gravekeeper\'s Servant','Robbin\' Goblin','Magical Thorn','Aqua Chorus'].includes(n))return 40;
  // --- Enemy-deck expansion: equip spells (before generic equip fallback) ---
  if(n==='7 Completed')return machineFace.length?((machineFace.some(f=>atk(f)<=threat&&atk(f)+700>threat)||machineFace.some(f=>lethalAfter(atk(f)+700-e.lp[1-p])))?78:50):-1;
  if(n==='Axe of Despair')return equipScore(c,1000)>=75?78:equipScore(c,1000);
  if(n==='Black Pendant')return e.lp[1-p]<=500?96:equipScore(c,500);
  if(n==='Horn of the Unicorn')return equipScore(c,700);
  if(n==='Machine Conversion Factory')return machineFace.length?62:-1;
  if(n==='Malevolent Nuzzler')return equipScore(c,700);
  if(n==='Mage Power'){const bonus=500*back.length;return own.some(f=>face(f)&&(lethalAfter(atk(f)+bonus-e.lp[1-p])||(atk(f)<=threat&&atk(f)+bonus>threat)))?82:(own.some(face)?50:-1);}
  if(n==='United We Stand'){const bonus=800*own.filter(face).length;return own.length>=2&&(own.some(f=>face(f)&&lethalAfter(atk(f)+bonus-e.lp[1-p]))||own.some(f=>face(f)&&atk(f)<=threat&&atk(f)+bonus>threat))?82:(own.length>=2?55:-1);}
  if(n==='Sword of Deep-Seated')return equipScore(c,500);
  if(n==='Sword of Dark Destruction')return darkFace.length?equipScore(c,400):-1;
  if(n==='Shine Palace')return lightFace.length?equipScore(c,700):-1;
  if(n==='Violet Crystal')return zombieFace.length?60:-1;
  if(n==='Book of Secret Arts')return spellcasterFace.length?62:-1;
  if(n==='Dragon Treasure')return dragonFace.length?62:-1;
  if(n==='Legendary Sword')return warriorFace.length?60:-1;
  if(n==='Big Bang Shot')return own.some(face)&&(enemy.length||e.lp[1-p]<=800)?74:-1;
  if(n==='Mask of Brutality')return own.some(f=>face(f)&&(lethalAfter(atk(f)+1000-e.lp[1-p])||(atk(f)<=threat&&atk(f)+1000>threat)))?77:(own.some(face)?50:-1);
  if(n==='Forest')return forestNet>0?65:-1;
  // --- LP engine (Fire Princess values each gain +500 burn) ---
  const simpleBurn={'Ookazi':800,'Hinotama':500,'Sparks':200,'Tremendous Fire':1000};
  if(n in simpleBurn)return n==='Tremendous Fire'&&e.lp[p]<=500?-1:enemy.some(x=>enabled(x)&&['Des Wombat','Prime Material Dragon'].includes(name(x)))?-1:130;
  const simpleHeal={'Dian Keto the Cure Master':1000,"Goblin's Secret Remedy":600,'Soul of the Pure':800,'Mooyan Curry':200,'Red Medicine':500,'Blue Medicine':400};
  if(n in simpleHeal){
   if(!healingAllowed(p))return -1;
   // Life Points have no 8,000 cap. Summon a legal Fire Princess first for its burn trigger.
   if(!firePrincess&&(prompt?.summons||[]).some(x=>name(x)==='Fire Princess'))return -1;
   if(!firePrincess&&e.lp[p]>4000&&hand.length<=6&&[...hand,...q(p,L.DECK)].some(x=>name(x)==='Fire Princess'))return -1;
   return firePrincess?100:70;
  }
  if(n==='Poison of the Old Man')return e.lp[1-p]<=800?125:85;
  if(n==='Soul of the Pure')return (firePrincess?85:(e.lp[p]<7900?70:-1));
  if(n==='Mooyan Curry')return (firePrincess?85:(e.lp[p]<7800?60:-1));
  if(n==='Cure Mermaid')return healingAllowed(p)?null:-1;
  if(n==='Zolga')return null;
  if(n==='Kiseitai')return null;
  // --- board wipes with 2004-correct valuation ---
  if(n==='Chaos Emperor Dragon - Envoy of the Beginning'||n==='Chaos Emperor Dragon - Envoy of the End'){if(e.lp[p]<=1000)return -1;const total=hand.length+own.length+back.length+enemy.length+theirBack.length+q(1-p,L.HAND).length;if(300*total>=e.lp[1-p])return 120;const oppTotal=enemy.length+theirBack.length+q(1-p,L.HAND).length,ownTotal=own.length+back.length+hand.length;if(oppTotal>=ownTotal+3)return 96;if(ownPower>enemyPower+1500)return -1;return 90;}
  if(n==='Cannon Soldier'||n==='Toon Cannon Soldier'){
   const damage=burnDamage(500);if(!damage||!effectsEnabled(p)||own.find(x=>same(x,c))?.is_disabled)return -1;
   if(damage*own.filter(x=>name(x)!=='Relinquished').length>=e.lp[1-p])return 180;
   return n==='Cannon Soldier'&&own.some(x=>expendable(x)<=800)?55:-1;
  }
  if(n==='Penguin Soldier')return enemy.length?90:-1;
  if(n==='Gray Wing'){
   const live=own.find(x=>same(x,c));const cost=hand.filter(x=>!exodiaPieces.has(x.code)).sort((a,b)=>expendable(a)-expendable(b))[0];
   if(!live||!cost||!canBattle||!attackAllowed(live,!enemy.length)||!(live.position&1)||!enabled(live))return -1;
   const damage=enemy.length?Math.max(0,...enemy.filter(x=>known(x)&&(x.position&1)&&!resilient(x)).map(x=>battleDamage(atk(live)-atk(x)))):battleDamage(atk(live));
   return damage>=e.lp[1-p]||damage>=1000&&expendable(cost)<=damage?95:-1;
  }
  if(n==='Tribe-Infecting Virus'){if(hand.length<2)return -1;const byType={};for(const m of enemy){if(!face(m))continue;const t=race(m)||'Unknown';(byType[t]=byType[t]||[]).push(m);}let best=0;for(const t in byType){const hit=own.filter(x=>face(x)&&(race(x)===t)).length;const val=byType[t].length*2-hit*2;if(val>best)best=val;}return best>=3?100:(best>=2?85:-1);}
  if(n==='Time Wizard')return enemyPower>ownPower+1500?90:(ownPower>enemyPower+1500?-1:(enemy.length?70:-1));
  if(n==='Dark-Piercing Light'){const fd=enemy.filter(x=>!face(x)).length;return fd>=2?95:(fd>=1?80:-1);}
  if(n==='Call of Darkness'){const loss=own.filter(x=>e.wasReborn?.(x)).reduce((v,x)=>v+targetValue(x),0),gain=enemy.filter(x=>e.wasReborn?.(x)).reduce((v,x)=>v+targetValue(x),0);return gain>loss?96:-1;}
  if(n==='Creature Swap'){
   const gift=x=>(data(x).type&0x200)?0:expendable(x);
   const give=Math.min(Infinity,...own.map(gift));
   // The opponent chooses what to give us: evaluate their weakest eligible body.
   const take=Math.min(Infinity,...enemy.map(x=>face(x)?atk(x):0));
   return own.length&&enemy.length&&give+400<take?102:-1;
  }
  if(n==='Stop Defense'){const strikers=own.filter(x=>face(x)&&(x.position&1)).map(atk),best=Math.max(0,...strikers),peak=Math.max(0,...own.map(atk));return enemy.some(x=>{if(x.position&1)return false;const a=x.attack??data(x).attack??9999;if(!face(x))return a<peak;const d=x.defense??data(x).defense??0;return a>d?best>a:a<peak;})?80:-1;}
  if(d.type&0x80000){
   const boosts={Umi:['Aqua','Fish','Sea Serpent','Thunder'],Yami:['Fiend','Spellcaster'],Mountain:['Dragon','Winged Beast','Thunder'],Forest:['Insect','Beast','Plant','Beast-Warrior'],Wasteland:['Dinosaur','Zombie','Rock'],Sogen:['Warrior','Beast-Warrior']};
   const attrs={'A Legendary Ocean':'WATER','Luminous Spark':'LIGHT','Rising Air Current':'WIND','Mystic Plasma Zone':'DARK','Molten Destruction':'FIRE',Umiiruka:'WATER','Gaia Power':'EARTH'};
   const benefit=x=>boosts[n]?boosts[n].includes(race(x)):attrs[n]?attr(x)===attrs[n]:false;
    const curFields=back.filter(c=>face(c)).map(name);
    if(curFields.includes(n))return -1;
    if(curFields.includes('A Legendary Ocean')&&n!=='A Legendary Ocean')return -1;
   return own.filter(x=>face(x)&&benefit(x)).length>enemy.filter(x=>face(x)&&benefit(x)).length?60:-1;
  }
  if(d.type&0x40000)return own.some(face)&&(!/Megamorph/.test(n)||e.lp[p]<e.lp[1-p])?45:-1;
  if(n==='Black Luster Soldier - Envoy of the Beginning'){const option=Number(BigInt(c.description||0)&0xfffffn);if(option===1)return 110;return enemy.length&&(threat>=atk(c)||e.phase>=256||enemy.some(x=>battleHazards.has(name(x))))?100:-1;}
  if(n==='Tsukuyomi')return has(own,'Magician of Faith')||enemy.some(face)?80:-1;
  if(['Magician of Faith','Mask of Darkness','Sangan','Witch of the Black Forest','Sinister Serpent'].includes(n))return 85;
  if(n==='Cyber-Stein')return e.lp[p]>6000&&own.length<5?80:-1;
  if(n==='Magical Scientist')return scientistUseful()?80:-1;
  if(n==='Exiled Force')return threat>atk(c)?105:-1;
  if(n==='Barrel Dragon')return enemy.length?105:-1;
  return null;
 }
 // Evaluate the attacks this spell actually enables; a lower enemy ATK can
 // still mean a much stronger defender after swapping its original stats.
 function shieldSwordScore(){
  if(e.player!==p||openingTurn||e.phase!==4||prompt?.to_bp===false||battleLocked)return -1;
  const stats=(c,swap)=>{const a=atk(c),d=c.defense??data(c).defense??0,base=data(c);return swap&&face(c)?[Math.max(0,a+(base.defense??0)-(base.attack??0)),Math.max(0,d+(base.attack??0)-(base.defense??0))]:[a,d]};
  const value=swap=>{
   const targets=enemy.map(c=>({c,power:face(c)?stats(c,swap)[c.position&1?0:1]:power(c)}));let score=0;
   for(const a of own.filter(c=>face(c)&&(c.position&1)&&attackAllowed(c,!targets.length)).sort((a,b)=>stats(b,swap)[0]-stats(a,swap)[0])){
    const attack=stats(a,swap)[0];if(!targets.length){if(attackAllowed(a,true))score+=battleDamage(attack);continue;}
    const choices=targets.map((t,i)=>({t,i})).filter(({t})=>attack>t.power&&!resilient(t.c)).sort((a,b)=>targetValue(b.t.c)-targetValue(a.t.c));
    if(choices.length){const {t,i}=choices[0];score+=1000+(face(t.c)&&t.c.position&1?battleDamage(attack-t.power):0);targets.splice(i,1);}
   }return score;
  };
  return value(true)>value(false)+300?80:-1;
 }
 // Reserve a distinct stronger attacker for each obstacle before exposing a
 // weaker monster. Never assume a hidden defender/back row is harmless.
 function clearedLane(c){
  if(e.cpuOffenseTrial===false||openingTurn||e.player!==p||e.phase!==4||prompt?.to_bp!==true||battleLocked||attackBlocked(c,p,true)||theirBack.some(x=>!face(x))||enemy.some(x=>!face(x)||resilient(x)||battleHazards.has(name(x))||enabled(x)&&/destroyed by battle.*(?:special summon|destroy|return)/is.test(e.cards.get(x.code)?.desc||'')))return false;
  if(projectedAttack(c)<=0||exodiaPieces.has(c.code)||!attackAllowed(c,true))return false;
  const strikers=activeAttackers(p).filter(x=>!same(x,c)&&attackAllowed(x,false)&&!x.attack_disabled&&!x.attack_count).sort((a,b)=>atk(a)-atk(b));
  for(const t of [...enemy].sort((a,b)=>power(b)-power(a))){const i=strikers.findIndex(a=>atk(a)>power(t));if(i<0)return false;strikers.splice(i,1);}
  return true;
 }
 function projectedAttack(c){
  if(c.location===L.MZONE)return atk(c);
  let result=(name(c)==='Fusilier Dragon, the Dual-Mode Beast'&&own.length<2?1400:atk(c))+(p===1?(e.aiModifiers?.enemyAttack||0):0);
  if(effectsEnabled(p)){
   if(name(c)==='Tyranno Infinity')result=1000*q(p,L.REMOVED).filter(x=>face(x)&&race(x)==='Dinosaur').length+(p===1?(e.aiModifiers?.enemyAttack||0):0);
   if(name(c)==='Element Saurus'&&[...own,...enemy].some(x=>face(x)&&attr(x)==='FIRE'))result+=500;
  }
  // Only face-up field cards affect a future summon; do not copy equipped monsters' bonuses.
  const fields=[...back,...theirBack].filter(x=>face(x)&&!x.is_disabled&&(data(x).type&0x80000));
  const bonuses={'Yami':[['Fiend','Spellcaster'],['Fairy'],200],'Mountain':[['Dragon','Winged Beast','Thunder'],[],200],'Forest':[['Insect','Beast','Plant','Beast-Warrior'],[],200],'Umi':[['Aqua','Fish','Sea Serpent','Thunder'],['Machine','Pyro'],200],'Wasteland':[['Dinosaur','Zombie','Rock'],[],200],'Sogen':[['Warrior','Beast-Warrior'],[],200]};
  const attributes={'Luminous Spark':'LIGHT','Mystic Plasma Zone':'DARK','Rising Air Current':'WIND','Molten Destruction':'FIRE','Umiiruka':'WATER','Gaia Power':'EARTH'};
  let futureAttribute=attr(c);for(const key of relics(p))if(key.startsWith('attribute_'))futureAttribute=key.slice(10).toUpperCase();
  for(const f of fields){const n=name(f),b=bonuses[n];let bonus=b?(b[0].includes(race(c))?b[2]:b[1].includes(race(c))?-b[2]:0):0;
   if(n==='A Legendary Ocean'&&futureAttribute==='WATER')bonus+=200;
   if(attributes[n]===futureAttribute&&attributes[n])bonus+=500;
   if(bonus>0)bonus*=1+relics(f.controller).filter(k=>k==='field_amplifier').length;
   result+=bonus;
  }
  for(const x of [...own,...enemy,...back,...theirBack].filter(enabled)){
   const n=name(x),a=futureAttribute;
   const auras={'Hoshiningen':['LIGHT',500,'DARK',-400],"Witch's Apprentice":['DARK',500,'LIGHT',-400],'Little Chimera':['FIRE',500,'WATER',-400],'Star Boy':['WATER',500,'FIRE',-400],'Bladefly':['WIND',500,'EARTH',-400],'Milus Radiant':['EARTH',500,'WIND',-400]};
   const aura=auras[n];if(aura)result+=a===aura[0]?aura[1]:a===aura[2]?aura[3]:0;
   if(n==='Burden of the Mighty'&&x.controller!==p)result-=100*effectiveLevel(c,true);
   if(n==='Banner of Courage'&&x.controller===p&&e.player===p)result+=200;
  }
  for(const key of relics(p)){
   const type=data(c).type||0,level=effectiveLevel(c,true);
   if(key==='small'&&level<=3)result+=(e.aiModifiers?.statRelics?.[p]||[]).find(r=>r.effect==='small')?.amount??400;
   if(['cursed_blood_crown'].includes(key))result+=500;
   if(['cursed_cracked_sword'].includes(key))result+=300;
   if(key==='cursed_brittle_armor')result-=300;
   if(key==='cursed_zombies_bargain')result+=400;
   if(key==='cursed_warriors_vow')result+=200;
   if(key==='cursed_iron_silence')result+=600;
   if(key==='ritual_vestment'&&(type&0x80))result+=300;
   if(key==='fusion_insignia'&&(type&0x40))result+=300;
   if(key==='cursed_ritual_scar'&&(type&0x80))result+=1000;
   if(key==='cursed_fusion_fever'&&(type&0x40))result+=800;
   if(key==='cursed_commoners_chain')result+=(type&16)?300:(type&32)?-200:0;
   if(key==='cursed_ashen_nursery')result+=level<=3?700:level>=5?-700:0;
   if(key==='cursed_giants_oath')result+=level>=5?800:-400;
   if(key==='cursed_solitary_tyrant')result+=own.length===0?400:-500;
   if(key==='cursed_nocturnal_guard'&&e.player===p)result-=300;
   if(key==='cursed_crowded_crypt')result+=Math.min(750,75*grave.filter(x=>data(x).type&1).length);
   if(key==='cursed_trapbound_idol')result+=(type&0x100)?1000:0;
   if(key==='trap_weaver'&&(type&0x100))result+=400;
   if(key==='cursed_empty_hand_pact'&&c.location===L.HAND&&hand.length===1)result+=1000;
   if(key==='arcane_resonance')result+=100*[...back,...theirBack].filter(face).length;
   if(key==='exile_standard')result+=50*[...q(0,L.REMOVED),...q(1,L.REMOVED)].filter(x=>face(x)&&(data(x).type&1)).length;
  }
  return Math.max(0,result);
 }
 function relicAttack(c,side){
  const field=q(side,L.MZONE).filter(x=>!same(x,c));field.push({...c,controller:side});
  const monsters=loc=>q(side,loc).filter(x=>(data(x).type&1)&&face(x)),is=t=>!!(data(c).type&t),level=lvl(c);
  const changed=relics(side).filter(k=>k.startsWith('attribute_')).at(-1),attribute=changed?changed.slice(10).toUpperCase():(e.cards.get(c.code)?.attribute||attr(c));
  return (e.aiModifiers?.statRelics?.[side]||[]).reduce((sum,r)=>{
   const a=r.amount||0,k=r.effect||'atk',match=!r.filter||r.filter===race(c)||race(c)==='Beast-Warrior'&&['Warrior','Beast'].includes(r.filter)||r.filter===attribute;let v=0;
   switch(k){
    case 'atk':case 'both':v=match?a:0;break;
    case 'small':v=level<=3?a:0;break;
    case 'normal':v=is(0x10)?a:0;break;case 'tribute':v=level>=5?a:0;break;
    case 'empty_hand':v=q(side,L.HAND).length===0?a:0;break;case 'solo':v=field.length===1?a:0;break;
    case 'diversity':v=Math.min(r.parameters?.cap??500,new Set(field.filter(face).map(race)).size*a);break;
    case 'normal_grave':v=Math.min(r.parameters?.cap??600,monsters(L.GRAVE).filter(x=>data(x).type&0x10).length*a);break;
    case 'eclipse':v=['LIGHT','DARK'].every(at=>monsters(L.GRAVE).some(x=>attr(x)===at))?a:0;break;
    case 'dial':v=e.player===side?a:0;break;case 'underdog':v=e.lp[side]<e.lp[1-side]&&field.length<q(1-side,L.MZONE).filter(x=>!same(x,c)).length?a:0;break;
    case 'backrow_atk':v=[0,1].flatMap(s=>q(s,L.SZONE)).filter(face).length*a;break;
    case 'banished_atk':v=[0,1].flatMap(s=>q(s,L.REMOVED)).filter(x=>face(x)&&(data(x).type&1)).length*a;break;
    case 'approved_blood_crown':v=500;break;case 'approved_brittle_armor':v=-300;break;case 'approved_cracked_sword':v=100;break;
    case 'approved_zombies_bargain':v=800;break;case 'approved_warriors_vow':v=200;break;case 'approved_iron_silence':v=600;break;
    case 'approved_ritual_vestment':v=is(0x80)?300:0;break;case 'approved_fusion_insignia':v=is(0x40)?300:0;break;
    case 'approved_trap_weaver':v=is(0x100)?400:0;break;case 'approved_trapbound_idol':v=is(0x100)?1000:0;break;
    case 'approved_twin_banner':v=field.length===2&&field.some(x=>face(x)&&race(x)!==race(c))?200:0;break;
    case 'approved_ashen_nursery':v=level<=3?700:level>=5?-700:0;break;case 'approved_giants_oath':v=level>=5?800:level<=4?-400:0;break;
    case 'approved_commoners_chain':v=is(0x10)?300:is(0x20)?-200:0;break;
    case 'approved_ritual_scar':v=is(0x80)?1000:0;break;case 'approved_fusion_fever':v=is(0x40)?800:0;break;
    case 'approved_empty_hand_pact':v=q(side,L.HAND).length===0?1000:0;break;
    case 'approved_solitary_tyrant':v=field.length===1?400:-500;break;
    case 'approved_crowded_crypt':v=Math.min(1500,150*monsters(L.GRAVE).length);break;
    case 'approved_nocturnal_guard':v=e.player===side?-300:0;break;
   }return sum+v;
  },0);
 }
 function controlledAttack(c,side=p){return Math.max(0,atk(c)-relicAttack(c,c.controller??1-p)+relicAttack(c,side)-(c.controller===1?(e.aiModifiers?.enemyAttack||0):0)+(side===1?(e.aiModifiers?.enemyAttack||0):0));}
 function reaperDirectReady(c){
  const live=own.find(x=>same(x,c))||c;
  return e.player===p&&(e.phase===4||e.phase===8)&&(prompt?.to_bp===true||e.turn>1)&&prompt?.to_bp!==false&&!enemy.length&&!battleLocked&&!live?.attack_disabled&&!(live?.attack_count>0)&&!attackBlocked(live,p,true)&&!theirBack.some(x=>!face(x));
 }
function preferSet(c){const n=name(c);if(n==='Viser Des'&&effectsEnabled(p))return false;if(clearedLane(c)&&!(data(c).type&0x200000)&&!['Spirit Reaper','Dancing Fairy'].includes(n))return false;const safe=saferPosition(c);if(safe!==null)return !safe;


  if((data(c).type&0x200)&&e.turn<=2)return true;
  if(n==='Dark Jeroid'&&effectsEnabled(p)){if(!enemy.some(face))return true;if(summonUtility(c))return false;}
  if((openingTurn||prompt?.to_bp===false)&&(c.defense??data(c).defense??0)>projectedAttack(c))return true;
  if((c.defense??data(c).defense??0)>projectedAttack(c)&&enemy.some(x=>face(x)&&atk(x)>projectedAttack(c)))return true;
  if(e.phase>=256&&(c.defense??data(c).defense??0)>projectedAttack(c))return true;
  if(!effectsEnabled(p))return false;
  if(n==='Spirit Reaper')return !reaperDirectReady(c);
  if(n==='Dancing Fairy')return openingTurn||prompt?.to_bp===false||attackBlocked(c,p,true)||projectedAttack(c)<=threat;
  if(data(c).type&0x200&&!(back.some(x=>enabled(x)&&name(x)==='Spiritual Energy Settle Machine'))&&(e.turn===1||prompt?.to_bp===false||battleLocked))return true;
  return !!(data(c).type&0x200000)||['Guardian Sphinx','Swarm of Scarabs','Swarm of Locusts','Blast Sphere','Kiseitai','Nimble Momonga','Newdoria','Greenkappa','Hane-Hane','Needle Worm','Cyber Jar','4-Starred Ladybug of Doom','Slate Warrior'].includes(n);}
 function scientistUseful(){return e.lp[p]>2500&&own.length<5&&enemy.length>0&&q(p,L.EXTRA).some(c=>lvl(c)<=6&&(data(c).type&0x40)&&(name(c)==='Thousand-Eyes Restrict'&&enemy.some(face)||!openingTurn&&e.phase<256&&!battleLocked&&atk(c)>Math.min(...enemy.map(power))))}
 function summonUtility(c){if(replayRule('efficient_sacrifice')&&name(c)==='Dark Dust Spirit')return summonScore(c)>0;if(exodiaPieces.has(c.code)||!effectsEnabled(p))return false;const n=name(c);if(exodiaPlan&&handSearch.has(n)&&q(p,L.DECK).some(missingPiece))return true;return (n==='Magical Scientist'&&scientistUseful())||(n==='Viser Des'&&enemy.length&&e.lp[p]>Math.max(0,...enemy.filter(x=>face(x)&&(x.position&1)).map(x=>atk(x)-projectedAttack(c))))||(n==='Relinquished'&&enemy.some(face))||(n==='Cyber-Stein'&&e.lp[p]>6000&&q(p,L.EXTRA).some(t=>atk(t)>=3000))||(n==='The Winged Dragon of Ra'&&summonScore(c)>=0)||n==='Breaker the Magical Warrior'&&theirBack.length>0||n==='Dark Jeroid'&&enemy.some(x=>face(x)&&atk(x)>0&&((!openingTurn&&prompt?.to_bp!==false&&!battleLocked&&(x.position&1)&&atk(x)-800<Math.max(projectedAttack(c),...own.filter(a=>face(a)&&(a.position&1)&&!attackBlocked(a,p)).map(atk)))||own.some(a=>face(a)&&atk(x)>power(a)&&atk(x)-800<=power(a))))||n==='Exiled Force'&&enemy.some(x=>targetValue(x)>=2400)||['Fire Princess','Bowganian'].includes(n)||(n==='Cure Mermaid'&&firePrincess)||(n==='Inaba White Rabbit'&&e.turn>1&&prompt?.to_bp===true&&!battleLocked&&!attackBlocked(c,p,true));}
  function summonScore(c){if(exodiaPieces.has(c.code))return -1;

  if(replayRule('restricted_attackers')){
   if(name(c)==='Cave Dragon'&&!own.some(x=>face(x)&&race(x)==='Dragon'))return -1;
   if(name(c)==='The Unfriendly Amazon'&&own.filter(x=>!same(x,c)&&atk(x)<1000).length===0)return -1;
  }
  if(replayRule('efficient_sacrifice')&&name(c)==='Dark Dust Spirit')return enemy.filter(face).reduce((v,x)=>v+targetValue(x),0)>own.filter(face).reduce((v,x)=>v+targetValue(x),0)+700?110:-1;
  if((data(c).type&0x200)&&e.turn<=2)return -1; // early spirits set instead of summoning
if(!effectsEnabled(p))return 0;const n=name(c);
  if(exodiaPlan&&handSearch.has(n)&&q(p,L.DECK).some(missingPiece))return 120;
  if(n==='The Winged Dragon of Ra')return own.length>=3&&!enemy.length&&e.lp[p]>2000&&e.lp[p]-100>=e.lp[1-p]?100:-1;
  if(n==='The Wicked Eraser')return own.length>=3&&enemy.length+theirBack.length>=4?60:-1;
  if(attackBlocked(c,p,true)&&!['Jinzo','Breaker the Magical Warrior','Exiled Force','Fire Princess','Bowganian'].includes(n))return -1;
  if(['Darklord Marie','Nuvia the Wicked'].includes(n))return -1;
  if(n==='Mystical Beast of Serket'&&!has(back,'Temple of the Kings'))return -1;
  if(n==='The Masked Beast'&&ownPower>enemyPower+2000)return -1;
  if((n==='Blue-Eyes Toon Dragon'||n==='Toon Mermaid'||n==='Toon Summoned Skull')&&!toonWorld)return -1;
  if(n==='Thousand-Eyes Restrict'&&own.length>=2&&ownPower>enemyPower+1500)return -1;
  if(n==='Jinzo'&&theirBack.length>=1)return 60;
  if(n==='Fire Princess'&&(has(hand,'Mooyan Curry')||has(hand,'Soul of the Pure')||has(hand,'Zolga')||grave.some(x=>name(x)==='Darklord Marie')))return 60;
  if(n==='Kycoo the Ghost Destroyer'&&q(1-p,L.GRAVE).length>=3)return 40;
  if(n==='The Legendary Fisherman'&&umiActive)return 40;
  if(n==='Pumpking the King of Ghosts'&&has(back,'Castle of Dark Illusions'))return 30;
  return 0;}
 function specialOk(c){if(exodiaPieces.has(c.code))return false;const n=name(c);if(!deck.specialOk(c))return false;
  if(n==='Lava Golem'){if(enemy.length<2)return false;const answer=own.some(x=>face(x)&&atk(x)>=3000)||hand.some(x=>['Fissure','Smashing Ground','Tribute to the Doomed','Raigeki Break','Raigeki','Dark Hole','Change of Heart','Snatch Steal'].includes(name(x)));if(e.lp[1-p]<=3000||answer)return true;return false;}
  if(n==='Thousand-Eyes Restrict'&&own.length>=2&&ownPower>enemyPower+1500)return false;
  if((n==='Toon Mermaid'||n==='Blue-Eyes Toon Dragon')&&!toonWorld)return false;
  return true;}
 function flipUseful(n,field){if(replayRule('clown_removal')&&n==='Crass Clown'&&effectsEnabled(p)&&field?.position===4)return enemy.length>0;
  if(!effectsEnabled(p))return false;
  if(n==='Dancing Fairy')return e.phase===4&&prompt?.to_bp!==false&&atk(field)>threat&&!attackBlocked(field,p);
  if(field&&(data(field).type&0x200)&&(e.turn===1||prompt?.to_bp===false||battleLocked)&&!['Tsukuyomi','Otohime','Dark Dust Spirit'].includes(n))return false;
  if(n==='Spirit Reaper')return reaperDirectReady(field);
  if(exodiaPieces.has(field?.code))return false;
  if(exodiaPlan&&['Cyber Jar','Morphing Jar #2','Fiber Jar'].includes(n))return false;
  if(n==='Man-Eater Bug'||n==='Old Vindictive Magician')return enemy.length>0;
  if(n==='Guardian Sphinx'||n==='Swarm of Scarabs')return enemy.length>0;
  if(n==='Swarm of Locusts')return theirBack.length>0;
  if(n==='Greenkappa')return theirBack.filter(Boolean).length>=2;
  if(n==='Hane-Hane')return enemy.some(x=>face(x)&&((e.cards.get(x.code)?.level||0)>=5));
  if(n==="Hiro's Shadow Scout")return q(1-p,L.HAND).length>=3&&q(1-p,L.DECK).length>3;
  if(n==='Needle Worm')return q(1-p,L.DECK).length<=10;
  if(n==='Cyber Jar')return (ownPower<enemyPower-500||(own.length===0&&enemy.length>0))&&q(p,L.DECK).length>5;
  if(n==='Night Assailant'||n==='Electromagnetic Bagworm'||n==='Parasite Paracide')return enemy.length>0;
  if(n==='Morphing Jar'&&hand.some(c=>exodiaPieces.has(c.code)))return false;
  if(n==='Rafflesia Seduction')return e.player===p&&enemy.some(face);
  if(n==='Blast Sphere'||n==='Kiseitai')return false;
  if(n==='Slate Warrior')return enemy.some(x=>power(x)<1900);
  if(n==='Shining Angel')return true;
  return null;}
 function pierce(card,side=card?.controller??p,future=false){
  const active=x=>enabled(x)&&!(x.status&1);
  const c=typeof card==='string'?q(side,L.MZONE).find(x=>name(x)===card):card,n=typeof card==='string'?card:name(card);
  if(relic(side,'cursed_reckless_spear')||(e.aiModifiers?.statRelics?.[side]||[]).some(r=>r.effect==='pierce'))return true;
  if((!future||e.player===side)&&e.piercingTurn?.[side]===e.turn)return true;
  if((!future||e.player===side)&&c&&e.piercingCards?.get?.(`${side}:${c.sequence}`)===c.code)return true;
  if(c&&active(c)&&['Dark Driceratops','Mad Sword Beast','Spear Dragon','Airknight Parshath',"Gravekeeper's Spear Soldier",'Mefist the Infernal General'].includes(n))return true;
  if(c&&q(side,L.MZONE).some(x=>active(x)&&name(x)==='Enraged Battle Ox')&&['Beast','Beast-Warrior','Winged Beast'].includes(race(c)))return true;
  return !!c&&q(side,L.SZONE).some(x=>face(x)&&!x.is_disabled&&!(x.status&1)&&(
   name(x)==="Dragon's Rage"&&!trapNegated&&race(c)==='Dragon'||
   !spellNegated&&['Fairy Meteor Crush','Big Bang Shot'].includes(name(x))&&same(x.equipCard||x.equip_card,c)));
 }
 // Compare whole-board damage, including follow-up direct attacks after a defender falls.
 // Only publicly visible opposing monsters enter the forecast; never inspect hidden cards.
 function incomingDamage(c,attackPosition){
  const defenders=own.filter(x=>!same(x,c)).concat({...c,controller:p,position:attackPosition?1:4,
   attack:c.location===L.MZONE?atk(c):projectedAttack(c),defense:c.defense??data(c).defense??0});
  const attackers=enemy.filter(x=>face(x)&&atk(x)>0&&!attackBlocked(x,1-p,true)).map(x=>({...x,forecastPierce:pierce(x,1-p,true),forecastExarion:enabled(x)&&name(x)==='Exarion Universe',forecastAttack:atk(x)}));
  const memo=new Map();
  function visit(am,dm){const key=am+':'+dm;if(memo.has(key))return memo.get(key);let best=0;
   for(let i=0;i<attackers.length;i++)if(am&(1<<i)){
    const a=attackers[i],next=am&~(1<<i),ap=a.forecastAttack;best=Math.max(best,visit(next,dm));
    if(!dm){if(!['Zombyra the Dark','Giant Rex'].includes(name(a)))best=Math.max(best,battleDamage(ap,1-p)+visit(next,dm));continue;}
    for(let j=0;j<defenders.length;j++)if(dm&(1<<j)){
     const d=defenders[j],dp=d.position&1?d.attack??atk(d):d.defense??data(d).defense??0;
     const immortal=effectsEnabled(p)&&!d.is_disabled&&/cannot be destroyed (?:by|as a result of) battle/i.test(e.cards.get(d.code)?.desc||'');
     const dies=!immortal&&(ap>dp||!!(d.position&1)&&ap===dp),left=dies?dm&~(1<<j):dm;
     let raw=d.position&1?Math.max(0,ap-dp):a.forecastPierce?Math.max(0,ap-dp):0;
     // Exarion can buy piercing for 400 ATK during its next Battle Step.
     if(!(d.position&1)&&a.forecastExarion)raw=Math.max(raw,ap-400-dp,0);
     best=Math.max(best,battleDamage(raw,1-p)+visit(next,left));
    }
   }memo.set(key,best);return best;
  }
  return visit((1<<attackers.length)-1,(1<<defenders.length)-1);
 }
 function saferPosition(c){
  if(data(c).type&0x200000)return null; // Preserve Flip effects when choosing Set versus Normal Summon.
  const key=[c.controller,c.location,c.sequence,c.code].join(':');if(safetyCache.has(key))return safetyCache.get(key);
  if(!enemy.some(x=>face(x)&&(pierce(x,1-p,true)||enabled(x)&&name(x)==='Exarion Universe')))return null;
  const attack=incomingDamage(c,true),defense=incomingDamage(c,false);
  const result=attack===defense?null:attack<defense;safetyCache.set(key,result);return result;
 }

 function combatPower(a,target=null){
  const base=atk(a);
  if(name(a)==='The Hunter with 7 Weapons'&&!(a.status&1)&&enabled(a)&&effectsEnabled(a.controller??p)&&!e.inDamageStep){const declared=e.declaredRaces?.get(`${a.controller}:${a.location}:${a.sequence}`);if(declared&&(target?[target]:enemy).some(t=>face(t)&&(BigInt(t.race??data(t).race??0)&declared)!==0n))return base+1000;}
  if(name(a)!=='Spirit Ryu'||!enabled(a)||!effectsEnabled(p))return base;
  const affordable=hand.some(c=>race(c)==='Dragon'&&!exodiaPieces.has(c.code)&&atk(c)<=1700);
  if(!affordable)return base;
  const targets=target?[target]:enemy;
  return targets.some(t=>face(t)&&power(t)>=base&&power(t)<base+1000)?base+1000:base;
 }
 function attackAllowed(a,direct){const n=name(a);
  if(n==='Panther Warrior'&&!own.some(c=>!same(c,a)&&name(c)!=='Relinquished'))return false;
  if(attackBlocked(a,a.controller??p))return false;
  if(['Zombyra the Dark','Giant Rex'].includes(n)&&direct)return false;
  if(["Queen's Double",'Inaba White Rabbit'].includes(n)&&!direct)return false;
  return true;}
 function attackScore(a,t,ctx){const n=name(a),dmg=(ctx&&ctx.dmg)||0,deckOut=!!(ctx&&ctx.deckOut);let s=0;
  if(t&&face(t)&&((name(t)==='The Hunter with 7 Weapons'&&(t.position&1))||n==='The Hunter with 7 Weapons')&&combatPower(a,t)<((t.position&1)?combatPower(t,a):(t.defense??data(t).defense??0)))return -100000;
  const remembered=t&&e.knownFieldCard?.(p,t),known=t&&(face(t)?t:remembered?{...t,code:remembered}:null);
  const protectedByEffect=known&&!t.is_disabled&&effectsEnabled(t.controller??1-p)&&/cannot be destroyed (?:by|as a result of) battle/i.test(e.cards.get(known.code)?.desc||'');
  if(protectedByEffect&&dmg<=0&&!(pierce(a)&&t&&!(t.position&1)&&atk(a)>(t.defense??data(known).defense??0)))return -100000;

  if(known&&enabled(t)&&['D.D. Assailant','D.D. Warrior Lady'].includes(name(known))&&!(dmg>0&&dmg>=e.lp[1-p])&&atk(a)>atk(known))return -100000;
  if(n==='Panther Warrior'&&(prompt?.attacks||[]).some(c=>!same(c,a)&&name(c)!=='Panther Warrior'&&attackAllowed(c,false)&&enemy.some(t=>face(t)&&atk(c)>power(t))))s-=10000;
  if(n==='Airknight Parshath'&&dmg>0)s+=800;
  if(n==='Masked Sorcerer'&&dmg>0)s+=600;
  if(n==='White Magical Hat'&&dmg>0)s+=q(1-p,L.HAND).length>0?600:0;
  if(n==='Kycoo the Ghost Destroyer'&&dmg>0)s+=400;
  if(n==='Dark Balter the Terrible'&&t&&(data(t).type&0x20))s+=500;
  if(n==='Fiend Skull Dragon'&&t&&!face(t))s+=500;
  if(n==='Goblin Attack Force'&&dmg<=0)s-=1500;
  if(n==='Panther Warrior'&&dmg<=0)s-=2500;
  if(n==='The Bistro Butcher'&&dmg>0&&enabled(a)&&dmg<e.lp[1-p]){
   const discard=back.some(x=>enabled(x)&&name(x)==="Robbin' Goblin"),punish=back.some(x=>enabled(x)&&name(x)==='Magical Thorn');
   s+=deckOut?100000:-(discard?punish?300:800:1500);
  }
  if(n==='Slate Warrior'&&dmg<=0&&threat>=2500)s+=10;
  if(pierce(a)&&t&&!(t.position&1))s+=Math.max(0,atk(a)-((t.defense??e.data[t.code]?.defense)??0));
  if(n==='Newdoria'&&dmg<=0&&t&&power(t)>atk(a))s+=50;
  return s;}
 function suicideScore(a){const n=name(a);if(!['Witch of the Black Forest','Sangan'].includes(n))return 0;
  if(e.lp[p]<=2000||q(p,L.DECK).length<=3)return 0;
  return enemy.some(x=>face(x)&&power(x)>atk(a)&&power(x)<=atk(a)+1500)?800:0;}
 function tributeAdj(c){const n=name(c);if(replayRule('wipe_tribute')&&e.name(e.materialSubject)==='Dark Dust Spirit'&&face(c))return 100000;
  const subject=e.materialSubject&&{code:e.materialSubject,controller:p,location:L.HAND};
  if(subject&&projectedAttack(subject)<atk(c)&&!(attackBlocked(c,p)&&!attackBlocked(subject,p,true)))return -100000000;
if(n==='Relinquished'&&effectsEnabled(p))return -1000000;let s=-Math.max(0,(c.defense??data(c).defense??0)-atk(c));
  if(n==='Zolga')s-=firePrincess?1000:500;
  if(n==='Darklord Marie'||n==='Magician of Black Chaos')s+=5000;
  if(chaosPair&&grave.length<=6&&(attr(c)==='LIGHT'||attr(c)==='DARK')){const light=attr(c)==='LIGHT';if((light&&gyLight.length<2)||(!light&&gyDark.length<2))s+=3000;}
  return s;}
 function targetScore(fxN,cand,info){const nm=name(cand);
  if(fxN==='Ekibyo Drakmord'&&e.cpuReviewRules?.ekibyo!==false)return cand.controller!==p&&cand.location===L.MZONE&&!attackBlocked(cand,1-p)?20000+atk(cand):-1000000000;
  if(['Spirit Ryu','Gray Wing'].includes(fxN)&&cand.controller===p&&cand.location===L.HAND)return -expendable(cand);
  if(fxN==='Toon Table of Contents'&&cand.controller===p&&cand.location===L.DECK){
   if(nm==='Toon World')return !toonWorld&&e.lp[p]>1000&&hand.some(x=>(data(x).type&1)&&name(x).includes('Toon')&&!['Toon Cannon Soldier','Toon Gemini Elf','Toon Masked Sorcerer','Toon Goblin Attack Force'].includes(name(x)))?50000:-1000;
   const monster=!!(data(cand).type&1),requiresWorld=!['Toon Cannon Soldier','Toon Gemini Elf','Toon Masked Sorcerer','Toon Goblin Attack Force'].includes(nm);
   if(!monster)return 1000;
   const tributes=effectiveLevel(cand,true)>6?2:effectiveLevel(cand,true)>4?1:0;
   const playable=(!requiresWorld||toonWorld)&&own.filter(x=>name(x)!=='Relinquished').length>=tributes&&own.length<5+tributes;
   return (playable?20000:0)+projectedAttack(cand)-tributes*800-(hand.some(x=>name(x)===nm)?1500:0);
  }
  if(['Cannon Soldier','Toon Cannon Soldier'].includes(fxN)&&cand.controller===p&&cand.location===L.MZONE)return (nm===fxN?-50000:0)-expendable(cand);
  const fxText=e.cards.get(e.effect?.code)?.desc||'';
  const selfRemoval=fxN===nm&&cand.controller===p&&[L.MZONE,L.SZONE].includes(cand.location)&&/destroy|banish|return.*hand/i.test(fxText);
  const usefulCost=e.selectionHint===500||/tribute this card|banish this card from your|destroy this card,? and if you do|return this card to (?:the|your) hand.*(?:Special Summon|draw)/i.test(fxText);
  if(selfRemoval&&!usefulCost)return -1000000000;
  if(fxN==='Black Luster Soldier - Envoy of the Beginning'&&cand.location===L.MZONE)return cand.controller!==p?30000+targetValue(cand):-1000000000;

  if(fxN==='Acid Trap Hole')return cand.controller!==p&&cand.location===L.MZONE?20000+targetValue(cand):-1000000000;
  if(fxN==='Temple of the Kings'&&[L.HAND,L.DECK,L.EXTRA].includes(cand.location))return cand.controller===p?templeSummonValue(cand):-1000000000;

  if(fxN==='Castle Walls'){const defender=castleWallsDefender();return cand.controller!==p?-1000000000:defender&&same(cand,defender)?100000:1000+(own.find(x=>same(x,cand))?.defense??0);}
  if(['Reinforcements','Rush Recklessly'].includes(fxN))return cand.controller!==p?-1000000000:(same(cand,e.attackCard)||same(cand,e.attackTarget)?100000:1000+atk(cand));
  if(['Change of Heart','Snatch Steal'].includes(fxN))return cand.controller!==p?10000+(name(cand)==='Spirit Reaper'&&face(cand)&&!cand.is_disabled&&effectsEnabled(cand.controller)?10000:controlledAttack(cand)):-1000000000;
  if(fxN==='Book of Moon'&&moonRescue())return same(cand,moonRescue())?1000000:-1000000000;
  if(['Book of Moon','Tsukuyomi'].includes(fxN)&&e.player===p&&cand.location===L.MZONE&&cand.controller===p){const value=resetValue(own.find(x=>same(x,cand)));return value>=0?20000+value*100:-1000000000;}
  if(fxN==='Book of Moon'&&e.player!==p)return same(cand,e.attackCard)?100000:-1000000000;

  if(fxN==='Cestus of Dagla')return deck.targetScore(fxN,cand,info);
  const equipSource=e.effect&&{code:e.effect.code};
  if(equipSource&&friendlyEquip(equipSource)&&cand.location===L.MZONE&&e.selectionHint!==500&&!/tribute/i.test(info.text||'')){if(doomed(cand))return -1000000000;
   return cand.controller===p?20000+atk(cand)+(nm==='Maha Vailo'?10000:0):-1000000000;
  }

  if(!fxN&&relic(p,'returning_tide')&&e.selectionHint===505&&cand.location===L.SZONE)return cand.controller===p?-backValue(cand):10000+backValue(cand);
  if(nm==='Relinquished'&&cand.controller===p&&cand.location===L.MZONE&&(/tribute/i.test(e.cards.get(e.effect?.code)?.desc||'')||e.selectionHint===500))return -Infinity;
  const piece=exodiaPieces.has(cand.code),toHand=handSearch.has(fxN)||handRecovery.has(fxN)||e.selectionHint===506;
  if(piece&&(revival.has(fxN)||e.selectionHint===509))return -Infinity;
  if(cand.controller===p&&piece&&toHand&&cand.location!==L.HAND)return missingPiece(cand)?1000000:900000;
  if(exodiaPlan&&cand.controller===p){
   if(piece&&[L.DECK,L.GRAVE,L.REMOVED].includes(cand.location))return -1000000;
   if(toHand&&['Pot of Greed','Graceful Charity','Upstart Goblin','Jar of Greed','Backup Soldier','Dark Factory of Mass Production'].includes(nm))return 50000;
  }
  if(fxN==='Dark Jeroid'&&cand.location===L.MZONE){
   if(cand.controller===p)return -1000000000;
   const t=enemy.find(x=>same(x,cand))||cand,old=atk(t),reduced=Math.max(0,old-800);
   const opens=own.some(a=>face(a)&&(a.position&1)&&!attackBlocked(a,p)&&atk(a)>reduced&&atk(a)<=old);
   return 20000+(opens?20000:0)+Math.min(800,old)*10+targetValue(t);
  }
  const recent=deck.targetScore(fxN,cand,info);if(recent!==null)return recent;
  if(fxN==='Castle Walls'){
   const defender=castleWallsDefender();
   return defender&&cand.controller===p&&cand.location===L.MZONE&&cand.sequence===defender.sequence?100000:-1000000000;
  }
  if((backRemoval.has(fxN)||fxN==='Raigeki Break')&&cand.location===L.SZONE&&cand.controller===p&&lockValue(cand)>=4000)return 20000+lockValue(cand);
  if((backRemoval.has(fxN)||fxN==='Raigeki Break')&&cand.controller!==p&&cand.location===L.SZONE)return reservedForRemoval(cand)?-1000000000:20000+backValue(cand);
  if(isRemoval(fxN)&&fxN!=='Ring of Destruction'&&cand.controller!==p&&cand.location===L.MZONE){const live=enemy.find(x=>same(x,cand))||cand;return reservedForRemoval(live)?-1000000000:20000+targetValue(live)+(emergency(fxN,[live])?100000:0);}
  if(['Mystical Space Typhoon','Dust Tornado','Breaker the Magical Warrior','De-Spell','Remove Trap'].includes(fxN)&&cand.controller!==p&&cand.location===L.SZONE&&LOCK.includes(nm))return 25000;
  if(['Mask of Dispel','Enemy Controller','Book of Moon','Nightmare Wheel','Mask of the Accursed','Spellbinding Circle','Stamping Destruction','Thousand Knives','Guardian Sphinx','Swarm of Scarabs','Swarm of Locusts'].includes(fxN)&&[L.MZONE,L.SZONE].includes(cand.location))return (cand.controller!==p?20000:-20000)+atk(cand);
  if(isRemoval(fxN)&&reservedForRemoval(cand))return -1000000000;
  // Activation and targeting must agree: generic removal prefers the largest ATK,
  // which can kill us even when a smaller, safe Ring target exists.
  if(fxN==='Ring of Destruction'){
   const live=q(cand.controller,L.MZONE).find(c=>c.sequence===cand.sequence);
   const damage=Math.max(0,atk(live||cand));
   if(!live||!face(live)||damage>=e.lp[p])return -1000000000;
   return (cand.controller!==p?20000:0)+targetValue(live||cand)+(damage>=e.lp[1-p]?100000:0);
  }
  if(/Relinquished/.test(fxN||''))return (cand.controller!==p?20000:0)+atk(cand)+((e.cards.get(cand.code)?.level||0)*100);
  if(/Dark Necrofear/.test(fxN||'')){if(info.allGrave)return -expendable(cand)-(nm==='Darklord Marie'?10000:0)-((chaosPair&&(attr(cand)==='LIGHT'||attr(cand)==='DARK'))?5000:0);return (cand.controller!==p?20000:0)+atk(cand);}
  if(/Chaos Emperor Dragon/.test(fxN||'')&&info.allGrave){const C=info.cands.filter(c=>c.location===L.GRAVE);const cheap=a=>C.filter(c=>(e.cards.get(c.code)?.attribute)===a).sort((x,y)=>expendable(x)-expendable(y))[0];const pick=[cheap('LIGHT'),cheap('DARK')];return pick.includes(cand)?5000-expendable(cand):-expendable(cand);}
  if(/Soul of Purity and Light/.test(fxN||'')&&info.allGrave){if(attr(cand)!=='LIGHT')return -100000;const Ls=info.cands.filter(c=>(e.cards.get(c.code)?.attribute)==='LIGHT').sort((x,y)=>expendable(x)-expendable(y)).slice(0,2);return Ls.includes(cand)?5000-expendable(cand):-expendable(cand);}
  if(/Newdoria/.test(fxN||''))return (cand.controller!==p?15000:-100000)+atk(cand);
  if(/Hane-Hane/.test(fxN||'')){if(cand.controller!==p)return 15000+((e.cards.get(cand.code)?.level||0)*500)+atk(cand);return -100000;}
  if(/Shining Angel/.test(fxN||'')){if((e.cards.get(cand.code)?.attribute)!=='LIGHT'||atk(cand)>1500)return -100000;const wall=e.lp[p]<3000||enemyPower>ownPower;return 10000+(wall?((cand.defense??e.data[cand.code]?.defense)??0):atk(cand));}
  if(/Nimble Momonga/.test(fxN||''))return nm==='Nimble Momonga'?100000:-100000;
  if(/Creature Swap/.test(fxN||'')){if(cand.controller===p)return nm==='The Bistro Butcher'?100000:(data(cand).type&0x200)?50000:-expendable(cand);return 10000+atk(cand);}
  if(info.maha&&cand.controller===p&&cand.location===L.MZONE)return nm==='Maha Vailo'?30000:10000+atk(cand);
  return null;}
 function position(n,c){if(n==='Relinquished'&&effectsEnabled(p)&&!openingTurn&&e.phase===4&&back.length<5&&!attackBlocked(c,p,true)){const target=enemy.filter(face).sort((a,b)=>atk(b)-atk(a))[0];if(target&&atk(target)>0&&atk(target)>Math.max(0,...enemy.filter(x=>!same(x,target)).map(power)))return true;}const safe=c&&saferPosition(c);if(safe!==null&&safe!==undefined)return safe;if(c&&(data(c).type&0x200000)&&atk(c)<1000)return false;if(n==='Spirit Reaper')return reaperDirectReady(c);if(c&&attackBlocked(c,p,true))return false;if(n==='Shining Angel')return true;if(n==="Queen's Double")return true;if(n==='Reflect Bounder')return true;return null;}
 return {combatPower,clearedLane,replayRule,incomingDamage,saferPosition,battleDamage,healingAllowed,effectsEnabled,reaperDirectReady,setAllowed:deck.setAllowed,summonUtility,attackBlocked,tributeWorth,projectedAttack,activation,expendable,ritualReady,fusionReady,threat,LOCK,preferSet,summonScore,specialOk,flipUseful,pierce,attackAllowed,attackScore,tributeAdj,targetScore,position,suicideScore};
}
