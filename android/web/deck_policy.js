// Shared card-specific CPU policy; opposing hidden cards remain opaque.
export function deckPolicy(x){
  const {e,p,L,q,name,data,atk,face,own,enemy,hand,grave,back,theirBack,lvl,race,attr,hasAttribute,same,threat,ownPower,enemyPower,danger,targetValue,backValue,attackBlocked,effectsEnabled,removalAffects,exodiaPieces,projectedAttack,battleDamage,prompt,planLethal=()=>false,freeSummon=()=>[]}=x;
 const has=(a,n)=>a.some(c=>name(c)===n),live=a=>a.filter(face),monster=c=>!!(data(c).type&1),spirit=c=>!!(data(c).type&0x200),water=c=>hasAttribute(c,'WATER'),sea=c=>['Fish','Sea Serpent','Aqua'].includes(race(c));
 const enemyCards=[...enemy,...theirBack],value=c=>c.location===L.SZONE?backValue(c):targetValue(c),best=a=>Math.max(0,...a.map(value)),free=5-own.length;
 const resilient=c=>!c.is_disabled&&effectsEnabled(c.controller??1-p)&&(['Marshmallon','Spirit Reaper','Relinquished','Thousand-Eyes Restrict'].includes(name(c))||/cannot be destroyed by battle/i.test(e.cards.get(c.code)?.desc||''));
 const handCost=(source,n,filter=()=>true)=>hand.filter(c=>!same(c,source)&&!exodiaPieces.has(c.code)&&filter(c)).length>=n;
 const spellValue=c=>({'Raigeki':4000,'Monster Reborn':3500,'Pot of Greed':3200,'Graceful Charity':3000,'Heavy Storm':theirBack.length*1500,'Polymerization':1200}[name(c)]??1000);
 const battleReady=c=>face(c)&&(c.position&1)&&!attackBlocked(c,p)&&!c.attack_disabled;
 const raBurnCards=new Set(['Bowganian','Coffin Seller','Dark Room of Nightmares','Fire Princess','Poison Mummy','Skull Invitation','Solar Flare Dragon','Stealth Bird','Wave-Motion Cannon']);
 const raBurnRisk=()=>[...own,...enemy,...back,...theirBack].some(c=>{
  if(!face(c)||c.is_disabled||((data(c).type&1)&&!effectsEnabled(c.controller??p)))return false;
  const text=e.cards.get(c.code)?.desc||'';
  return raBurnCards.has(name(c))||/\b(?:inflict|deal)\b[\s\S]{0,80}\bdamage\b|\b(?:you|your opponent|opponent)\s+(?:will\s+)?take\s+(?:\d[\d,]*\s+)?damage\b/i.test(text);
 });
 const faceMonsters=a=>a.filter(c=>monster(c)&&face(c));
 const diceRollers=new Set(['Blind Destruction','Needle Wall','Dangerous Machine Type-6','Dice Re-Roll','Gamble','Graceful Dice','Skull Dice','Roulette Barrel','Blowback Dragon','Time Wizard','Dice Jar']);
 const hasDiceRollThisTurn=source=>[...hand,...own,...back,...enemy,...theirBack].some(c=>!same(c,source)&&diceRollers.has(name(c))&&(c.location!==L.SZONE||face(c)))||[...(e.pending?.activates||[]),...(e.pending?.chains||[]),...(e.pending?.selects||[])].some(c=>!same(c,source)&&diceRollers.has(name(c)));
 const dangerousMachineValue=source=>{
  const remainingOwn=hand.filter(c=>!same(c,source)&&!exodiaPieces.has(c.code));
  const discardRisk=remainingOwn.length?remainingOwn.reduce((sum,c)=>sum+Math.min(1000,Math.max(200,monster(c)?atk(c)*.28:spellValue(c)*.2)),0)/remainingOwn.length:0;
  const opponentHand=q(1-p,L.HAND).length;
  const ownDeck=q(p,L.DECK).length,opponentDeck=q(1-p,L.DECK).length;
  const ownDraw=ownDeck>8?450:ownDeck>0?200:-900;
  const opponentDraw=opponentDeck>8?-450:opponentDeck>0?-200:700;
  const opponentDiscard=opponentHand?400:0;
  const destruction=best(live(enemy));
  return (-(remainingOwn.length?discardRisk:0)+opponentDiscard+ownDraw+opponentDraw+destruction-250)/6;
 };
 const blindDestructionValue=()=>{
  const mine=faceMonsters(own),theirs=faceMonsters(enemy);
  if(!theirs.length)return -1;
  const immune=c=>c.is_immune||/unaffected by (?:the effects of )?(?:all )?trap effects/i.test(e.cards.get(c.code)?.desc||'');
  const rollValue=roll=>{
   const affected=c=>!immune(c)&&(roll===6?lvl(c)>=6:lvl(c)===roll);
   return theirs.filter(affected).reduce((sum,c)=>sum+value(c),0)-mine.filter(affected).reduce((sum,c)=>sum+value(c),0);
  };
  const outcomes=[1,2,3,4,5,6].map(rollValue),expected=outcomes.reduce((sum,n)=>sum+n,0)/6;
  return expected>=300&&Math.max(...outcomes)>=900?Math.round(75+Math.min(20,expected/180)):-1;
 };
 const needleWallValue=()=>{
  // A 6 rerolls, so each of the five opponent zones has a 1/5 chance to be hit.
  // Value only actual, destroyable occupants; an empty or immune zone is a miss.
  const expected=enemy.filter(c=>c.sequence>=0&&c.sequence<5&&face(c)&&!c.is_immune&&!/unaffected by (?:the effects of )?(?:all )?trap effects/i.test(e.cards.get(c.code)?.desc||''))
   .reduce((sum,c)=>sum+value(c)/5,0);
  return expected>=350?Math.round(75+Math.min(20,expected/160)):-1;
 };
 const canyonValue=()=>{
  if(e.player!==p||e.phase!==4)return -1;
  const enemyRocks=enemy.filter(c=>race(c)==='Rock'&&face(c)&&!(c.position&1));
  const ownRocks=own.filter(c=>race(c)==='Rock'&&!(c.position&1));
  const bonus=enemyRocks.reduce((sum,rock)=>{
   const defense=rock.defense??data(rock).defense??0;
   const bestMargin=Math.max(0,...own.filter(c=>face(c)&&(c.position&1)).map(c=>atk(c)-defense));
   return sum+(bestMargin>0?battleDamage(bestMargin):0);
  },0);
  const risk=ownRocks.reduce((sum,rock)=>{
   const defense=rock.defense??data(rock).defense??0;
   const bestMargin=Math.max(0,...enemy.filter(c=>face(c)&&(c.position&1)).map(c=>atk(c)-defense));
   return sum+(bestMargin>0?battleDamage(bestMargin):0);
  },0);
  return bonus>risk*1.25&&bonus-risk>=300?90+Math.min(20,(bonus-risk)/250):-1;
 };
 function setScore(c){
  const n=name(c);
  if(n==='Blind Destruction')return blindDestructionValue();
  if(n==='Needle Wall')return needleWallValue();
  if(n==='Des Counterblow'){
   const attackers=live(enemy).filter(t=>(t.position&1)&&atk(t)>0);
   if(!attackers.length)return -1;
   return own.length===0?100+Math.min(15,Math.max(...attackers.map(atk))/250):-1;
  }
  if(n==='Dangerous Machine Type-6')return Math.max(0,Math.min(18,dangerousMachineValue(c)/90));
  if(n==='Dice Re-Roll')return hasDiceRollThisTurn(c)?90:0;
  return 0;
 }
 const incoming=e.attackCard?.controller===1-p;
 const incomingTarget=own.find(c=>same(c,e.attackTarget));
 const threatened=c=>incoming&&same(c,incomingTarget)||(e.activeChain||[]).some(a=>a.player!==p&&(a.targets||[]).some(t=>same(t,c)));
 const attacks=live(own).filter(battleReady);
 const lethal=attacks.reduce((s,c)=>s+Math.max(0,atk(c)),0)>=e.lp[1-p]&&!enemy.length;
 const board=back.some(c=>face(c)&&name(c)==='Destiny Board');
 const boardPlan=board||has(hand,'Destiny Board')||has(back,'Destiny Board');
 const substitutes=new Set(['Beastking of the Swamps','King of the Swamp','Goddess with the Third Eye','Mystical Sheep #1','Versago the Destroyer','The Dark - Hex-Sealed Fusion']);
 const lowNormal=c=>!!(data(c).type&1)&&!!(data(c).type&16)&&lvl(c)<=3;
 const rescueCatTargets=()=>q(p,L.DECK).filter(x=>monster(x)&&race(x)==='Beast'&&lvl(x)<=3);
 const ojamaMissing=()=>['Ojama Green','Ojama Yellow','Ojama Black'].filter(part=>!own.some(x=>face(x)&&name(x)===part));
 const raEffectName=c=>e.description?.(c.description)||'';
 // Ra has 0 ATK unless its Normal Summon trigger pays LP down to 100. The CPU always summons a
 // legal God, so take that payment whenever it makes a 3000+ ATK monster that is safe to keep.
 const raBoostSafe=()=>e.player===p&&e.lp[p]>=3100&&!raBurnRisk()&&!enemy.some(t=>face(t)&&monster(t)&&atk(t)>=e.lp[p]-100);
 function raBoostScore(c){
  if(!face(c)||c.controller!==p||c.is_disabled)return -1;
  const current=atk(c),boosted=current+1000;
  if(e.attackCard?.controller===1-p&&e.attackTarget&&same(c,e.attackTarget)&&(c.position&1)&&boosted>atk(e.attackCard)&&current<=atk(e.attackCard))return 2200+targetValue(e.attackCard);
  if(e.player===p&&e.phase===8&&!c.attack_disabled&&!c.attack_count&&!attackBlocked(c,p)){
   if(enemy.some(t=>face(t)&&(t.position&1)&&current<=atk(t)&&boosted>atk(t)))return 1800+Math.max(...enemy.filter(t=>face(t)&&(t.position&1)&&current<=atk(t)&&boosted>atk(t)).map(targetValue));
   if(!enemy.length){const others=attacks.filter(a=>!same(a,c)&&!a.attack_count).reduce((sum,a)=>sum+Math.max(0,atk(a)),0),before=battleDamage(current+others),after=battleDamage(boosted+others);if(before<e.lp[1-p]&&after>=e.lp[1-p])return 2600;}
  }
  return -1;
 }
 const ninjas=own.filter(c=>face(c)&&(/ninja/i.test(name(c))||/"Ninja"|Ninja monster/i.test(e.cards.get(c.code)?.desc||'')));
 const lvSources=own.filter(c=>face(c)&&/\bLV\d/i.test(name(c)));
 const lvTargetSources=[...lvSources,...grave.filter(c=>/\bLV\d/i.test(name(c)))];
 const levelUpTarget=c=>lvTargetSources.some(source=>(e.cards.get(source.code)?.desc||'').includes(name(c)));
 const transformations=()=>ninjas.some(source=>[...hand,...q(p,L.DECK)].some(c=>monster(c)&&['Beast','Winged Beast','Insect'].includes(race(c))&&lvl(c)<=lvl(source)+3));
 const archfiendDeck=()=>q(p,L.DECK).some(c=>monster(c)&&name(c).includes('Archfiend'));
 const archfiendBody=[...hand,...own].some(c=>monster(c)&&name(c).includes('Archfiend'));
 function fusionPlan(f,includeGrave=false,borrowed=[]){
  const line=(e.cards.get(f.code)?.desc||'').split('\n')[0],materials=[];
  for(const m of line.matchAll(/(?:(\d+)\s+)?"([^"]+)"/g))for(let i=0;i<Number(m[1]||1);i++)materials.push(m[2]);
  if(materials.length<2)return null;
  const available=[...hand,...own,...borrowed,...(includeGrave?grave:[])].filter(c=>monster(c)&&!exodiaPieces.has(c.code));const used=[];let substitute=false;
  for(const n of materials){let i=available.findIndex(c=>name(c)===n);if(i<0&&!substitute){i=available.findIndex(c=>substitutes.has(name(c)));if(i>=0)substitute=true;}if(i<0)return null;used.push(available.splice(i,1)[0]);}
  const fieldCost=used.filter(c=>c.location===L.MZONE).reduce((s,c)=>s+Math.max(0,atk(c)),0);
  if(own.length>=5&&!used.some(c=>c.location===L.MZONE))return null;
  return {used,score:atk(f)-fieldCost+(name(f)==='Gatling Dragon'&&enemy.length>=2?1800:0)};
 }
 const fusionChoices=(graveOK=false)=>q(p,L.EXTRA).map(c=>({c,plan:fusionPlan(c,graveOK&&race(c)==='Machine')})).filter(a=>a.plan&&a.plan.score>=0&&(atk(a.c)>threat||name(a.c)==='Gatling Dragon'&&enemy.length>=2));
 function activation(c,chain){const n=name(c),d=data(c),spent=c.location===L.GRAVE||c.location===L.REMOVED;
  if(n==='Blind Destruction')return blindDestructionValue();
  if(n==='Needle Wall')return needleWallValue();
  if(n==='Des Counterblow'){
   const attacker=e.attackCard;
   if(!chain||!attacker||attacker.controller!==1-p||e.attackTarget)return -1;
   const attackValue=Math.max(0,atk(attacker));
   return attackValue>0?130+Math.min(20,attackValue/150):-1;
  }
  if(n==='King of the Swamp'){
   const canSearch=c.location===L.HAND&&!has(hand,'Polymerization')&&q(p,L.DECK).some(x=>name(x)==='Polymerization');
   return canSearch&&fusionChoices(false).length?104:-1;
  }
  if(n==="The Dragon's Bead"){
   // Continuous Trap: flip it face-up first (any time we have a face-up Dragon); the negation below is
   // a separate effect, offered only once it is face-up and a Trap targets our Dragon.
   const protectedDragon=t=>t.controller===p&&t.location===L.MZONE&&face(t)&&race(t)==='Dragon';
   const incomingTrap=chain&&(e.activeChain||[]).some(link=>!link.inactive&&link.player!==p&&!!(data({code:link.code}).type&4)&&(link.targets||[]).some(protectedDragon));
   if(!(c.location===L.SZONE&&face(c)))return incomingTrap&&handCost(c,1)?125:live(own).some(t=>race(t)==='Dragon')?60:-1;
   if(!chain||!handCost(c,1))return -1;
   return incomingTrap?125:-1;
  }
  if(n==='Dangerous Machine Type-6'){
   const expected=dangerousMachineValue(c);
   return expected>=100?82+Math.min(18,expected/120):-1;
  }
  if(n==='Dice Re-Roll')return hasDiceRollThisTurn(c)?86:-1;
  if(n==='Sand Moth')return chain&&c.location===L.GRAVE?120:null;
  if(n==='Canyon')return canyonValue();
  // Leave room for all four messages. Temporary spells can still resolve normally.
  if(board&&(d.type&(0x20000|0x40000))&&!n.startsWith('Spirit Message')&&n!=='Destiny Board'&&c.location!==L.SZONE)return -1;
  if(n==='The Agent of Creation - Venus')return free>0&&e.lp[p]>500&&[...hand,...q(p,L.DECK)].some(x=>name(x)==='Mystical Shine Ball')?100:-1;
  if(n==='Mokey Mokey Smackdown')return own.some(x=>face(x)&&name(x)==='Mokey Mokey')||hand.some(x=>name(x)==='Mokey Mokey')&&free>0?95:-1;
  if(n==='Ojama Delta Hurricane!!')return ['Ojama Green','Ojama Yellow','Ojama Black'].every(part=>own.some(x=>face(x)&&name(x)===part))&&enemyCards.some(Boolean)?150:-1;
  if(n==='Rescue Cat'){
   const targets=rescueCatTargets();if(!(own.some(x=>face(x)&&!x.is_disabled&&name(x)==='Rescue Cat')&&free>=2&&targets.length>=2))return -1;
   // The two Beasts are destroyed in the End Phase, so only call them for something this turn.
   const main=e.player===p&&(e.phase===4||e.phase===256),best=[...targets].sort((a,b)=>atk(b)-atk(a)).slice(0,2),missing=ojamaMissing();
   const tribute=main&&e.normalSummonTurn?.[p]!==e.turn&&hand.some(x=>monster(x)&&lvl(x)>=5);
   const hurricane=main&&has(hand,'Ojama Delta Hurricane!!')&&missing.length<=2&&missing.every(part=>has(targets,part));
   const attack=e.player===p&&e.phase===4&&e.turn>1&&!enemy.length&&best.reduce((sum,x)=>sum+atk(x),0)>=1000;
   return tribute||hurricane||attack?110:-1;
  }
  if(n==='Juragedo'){
   if(e.inDamageStep||e.phase!==8)return -1;
   if(c.location===L.HAND)return chain&&free>0?105:-1;
   if(c.location===L.MZONE)return own.filter(t=>!same(t,c)).map(raBoostScore).reduce((best,value)=>Math.max(best,value),-1)>=0?100:-1;
  }
  if(n==='Human-Wave Tactics')return chain&&e.phase===512&&free>0&&q(p,L.DECK).some(lowNormal)?95:-1;
  if(n==='Enchanting Fitting Room'){const deck=q(p,L.DECK),top=e.deckReversed?deck.slice(-4):deck.slice(0,4);return e.lp[p]>800&&free>0&&top.some(lowNormal)?100:-1;}
  if(n==='Terraforming')return (archfiendBody||archfiendDeck())&&q(p,L.DECK).some(x=>name(x)==='Pandemonium')?95:-1;
  if(n==='Pandemonium')return archfiendBody||archfiendDeck()?90:-1;
  if(n==='Frontline Base'){
   const unionInHand=hand.some(x=>x.code!==c.code&&(data(x).type&1024)&&lvl(x)<=4);
   return free>0&&unionInHand?c.location===L.HAND?100:c.location===L.SZONE&&face(c)?110:-1:-1;
  }
  if(n==='Ninjitsu Art of Transformation')return transformations()&&free>=0?100:-1;
  if(n==='Level Up!')return lvSources.some(source=>[...hand,...q(p,L.DECK)].some(x=>monster(x)&&levelUpTarget(x)))?100:-1;
  if(n==='Kaibaman')return name(c)==='Kaibaman'&&hand.some(x=>name(x)==='Blue-Eyes White Dragon')?100:-1;
  if(n==='A Hero Emerges')return chain&&!!e.attackCard&&own.length<5&&hand.some(x=>monster(x)&&!(/cannot be Special Summoned/i.test(e.cards.get(x.code)?.desc||'')))?90:-1;
  if(n==='Riryoku'){
   const friends=own.filter(x=>face(x)&&atk(x)>0),foes=enemy.filter(x=>face(x)&&atk(x)>0);
   const battleSoon=e.player===p&&e.phase===4&&prompt?.to_bp!==false&&!e.battleProtected?.[1-p];
   if(!battleSoon)return -1;
   const attackers=friends.filter(x=>battleReady(x)&&!(x.attack_count>0)).sort((a,b)=>atk(b)-atk(a));
   const attackTargets=foes.filter(x=>x.position&1).sort((a,b)=>atk(b)-atk(a));
   if(attackers.length&&attackTargets.length)return 95;
   return -1;
  }
  if(n==='Michizure'){
   if(!chain)return -1;
   const bestTarget=Math.max(0,...enemy.filter(t=>removalAffects(c,t,n)).map(targetValue));
   return bestTarget>=1200?95+Math.min(18,bestTarget/300):-1;
  }
  if(n==='Polymerization')return fusionChoices(!!e.fusionSupport?.[p]&&e.fusionSupport[p]===e.turn).length?95:-1;
  if(n==='Cybernetic Fusion Support')return e.lp[p]>3000&&has(hand,'Polymerization')&&fusionChoices(true).some(a=>race(a.c)==='Machine'&&!fusionPlan(a.c))?110:-1;
  if(n==='Fusion Weapon')return live(own).some(c=>data(c).type&64&&lvl(c)<=6)?70:-1;
  if(n==='Gatling Dragon'){
   // All heads must destroy a monster, including our own when targets run out.
   // Compare all four coin outcomes instead of treating any enemy as sufficient.
   if(!enemy.length)return -1;
   const foes=enemy.map(t=>value(t)).sort((a,b)=>b-a),friends=own.map(t=>value(t)).sort((a,b)=>a-b);
   let expected=0;
   for(let heads=1;heads<=3;heads++){
    const hits=Math.min(heads,foes.length),loss=Math.min(heads-hits,friends.length);
    expected+=([1,3,3,1][heads]/8)*(foes.slice(0,hits).reduce((a,b)=>a+b,0)-friends.slice(0,loss).reduce((a,b)=>a+b,0));
   }
   const easyBattle=e.player===p&&e.phase===4&&e.turn>1&&!e.battleProtected?.[1-p]&&!theirBack.length&&enemy.every(t=>face(t)&&!['Spirit Reaper','Marshmallon','Newdoria','Yomi Ship','Reflect Bounder'].includes(name(t))&&attacks.some(a=>!a.attack_count&&atk(a)>(t.position&1?atk(t):t.defense??0)));
   return expected>(easyBattle?2200:700)?100:-1;
  }
  if(n==='Blowback Dragon')return enemyCards.length&&best(enemyCards)>=900?95:-1;
  if(n==='Roulette Barrel')return live(enemy).some(c=>lvl(c)>=1&&lvl(c)<=6)?85:-1;
  if(n==='Cybernetic Zone')return live(own).some(c=>data(c).type&64&&race(c)==='Machine'&&threatened(c))?100:-1;
  if(n==='Heavy Mech Support Platform')return c.location===L.SZONE?free>0&&(!live(own).some(c=>race(c)==='Machine'&&name(c)!==n))?50:-1:live(own).some(t=>!same(c,t)&&race(t)==='Machine'&&atk(t)>=1400)?75:-1;
  if(n==='Fiendish Engine Ω')return e.phase===512?85:attacks.some(t=>same(t,c))&&(atk(c)+1000>=e.lp[1-p]&&!enemy.length||enemy.some(t=>face(t)&&atk(t)>=atk(c)&&atk(t)<atk(c)+1000)&&danger)?85:-1;
  if(n==='The Wicked Eraser')return c.location===L.GRAVE?100:enemyCards.length>own.length+back.length?95:-1;
  if(n==='Proton Blast')return spent?chain&&['Barrel Dragon','Blowback Dragon','Gatling Dragon'].includes(e.name(e.effect?.code))?110:-1:[...own,...hand].some(t=>['Barrel Dragon','Blowback Dragon','Gatling Dragon','Time Wizard'].includes(name(t)))?60:-1;
  if(n==='Thunder Dragon')return q(p,L.DECK).filter(t=>name(t)===n).length>=1?90:-1;
  if(n==='Skilled Dark Magician')return [...hand,...grave,...q(p,L.DECK)].some(t=>name(t)==='Dark Magician')?90:-1;
  if(['Senju of the Thousand Hands','Manju of the Ten Thousand Hands','A Cat of Ill Omen','Big Eye','Patrol Robo','Legendary Fiend','Despair from the Dark','Gernia','Agido','Keldo','Mystic Tomato','Giant Rat','The Forgiving Maiden','Poison Mummy','Sonic Jammer','Winged Sage Falcos','Helpoemer'].includes(n))return 85;
  if(n==='Night Assailant')return spent||enemy.length?90:-1;
  if(n==='Dark Jeroid'||n==='Otohime'||n==='Electromagnetic Bagworm')return live(enemy).length?85:-1;
  if(n==='Puppet Master')return e.lp[p]>3500&&free>=2&&grave.filter(t=>monster(t)&&race(t)==='Fiend').length>=2?90:-1;
  if(n==='Jowgen the Spiritualist')return !hand.some(t=>exodiaPieces.has(t.code))&&handCost(c,1)&&enemy.some(t=>(t.summon_type&0x40000000)!==0)&&!own.some(t=>!same(t,c)&&(t.summon_type&0x40000000)!==0)?100:-1;
  if(n==='Super Roboyarou')return !enemy.length&&has(q(p,L.EXTRA),'Super Robolady')?80:-1;
  if(n==='Super Robolady')return enemy.length>0&&has(q(p,L.EXTRA),'Super Roboyarou')?80:-1;
  if(n==='Spirit Ryu'){const t=e.attackTarget&&enemy.find(x=>same(x,e.attackTarget)),power=t?(t.position&1?atk(t):t.defense??data(t).defense??0):0;return handCost(c,1,x=>race(x)==='Dragon'&&atk(x)<=1700)&&incoming===false&&same(c,e.attackCard)&&t&&face(t)&&power>=atk(c)&&power<atk(c)+1000?80:-1;}
  if(n==='Bazoo the Soul-Eater')return grave.some(monster)&&enemy.some(t=>face(t)&&atk(t)>=atk(c)&&atk(t)<atk(c)+900)?70:-1;
  if(n==='Hysteric Fairy')return has(own,'Fire Princess')&&own.filter(t=>atk(t)<=500).length>=2?60:-1;
  if(n==='Royal Keeper'||n==='Wandering Mummy')return -1; // Avoid repeat set/flip loops that surrender attacks.
  if(n==='Dragged Down into the Grave')return !hand.some(t=>exodiaPieces.has(t.code))&&hand.filter(t=>!same(t,c)).length===1&&has(hand,'Sinister Serpent')&&q(1-p,L.HAND).length&&q(p,L.DECK).length>1?70:-1;
  if(n==='Return of the Doomed')return handCost(c,1,monster)&&grave.some(t=>monster(t)&&atk(t)>=2400)&&danger?50:-1;
  if(n==='Chosen One')return -1; // Losing three cards two thirds of the time is worse than normal summoning.
  if(n==='Dark Designator'||n==='Spirit Elimination'||n==='Earthshaker')return -1; // Do not give away resources or make blind declarations.
  if(n==='Seal of the Ancients')return e.lp[p]>4000&&[...enemy,...theirBack].filter(t=>!face(t)).length>=3?40:-1;
  if(n==='Mesmeric Control')return live(enemy).some(t=>t.position&4)&&!enemy.some(t=>t.position&1)?50:-1;
  if(n==='Nobleman of Extermination'||n==='Bait Doll')return theirBack.some(t=>!face(t))?75:-1;
  if(n==='Double Snare')return live(enemyCards).some(t=>['Jinzo','Royal Decree'].includes(name(t)))?90:-1;
  if(n==='Malevolent Catastrophe')return incoming&&theirBack.length>back.filter(t=>!same(t,c)).length?100:-1;
  // Ceasefire flips every monster first, so our own set Effect Monsters also count toward lethal.
  if(n==='Ceasefire'){const effects=[...own,...enemy].filter(t=>face(t)&&(data(t).type&32)).length,ownSet=own.filter(t=>!face(t)&&(data(t).type&32)).length;return effects>=3||(effects+ownSet)*500>=e.lp[1-p]?90:-1;}
  if(n==='Riryoku Field'||n==='Curse of Royal')return chain&&e.effect?.player===1-p?95:-1;
  if(n==='Imperial Order')return e.lp[p]>1400&&chain&&e.effect?.player===1-p&&!!(data({code:e.effect.code}).type&2)?95:-1;
  if(n==='Cold Wave')return ownPower>enemyPower+1500&&theirBack.length>0&&!hand.some(t=>data(t).type&6&&!same(t,c))?65:-1;
  if(n==='Last Turn')return e.player!==p&&e.lp[p]<=1000&&live(own).some(t=>name(t)==='Jowgen the Spiritualist')?110:-1;
  if(n==='Mask of Restrict')return chain&&e.player!==p&&!hand.some(t=>monster(t)&&lvl(t)>4)&&!has(own,'Insect Queen')?60:-1;
  if(n==='Light of Intervention')return ![...hand,...own].some(t=>data(t).type&0x200000)&&(e.player!==p||e.phase<4)?45:-1;
  if(n==='Prohibition')return -1; // No reliable declaration from hidden opponent deck contents.
  if(n==='Chain Energy')return e.lp[p]>e.lp[1-p]+2000&&ownPower>enemyPower?60:-1;
  if(n==='Vengeful Bog Spirit')return danger&&ownPower<enemyPower?60:-1;
  if(n==="Spirit's Invitation")return e.lp[p]>1500&&[...own,...hand].some(spirit)&&enemy.length?65:-1;
  if(n==='Spiritual Energy Settle Machine')return handCost(c,1)&&live(own).some(t=>spirit(t)&&atk(t)>=1700)?55:-1;
  if(n==='Spring of Rebirth')return [...own,...hand].some(spirit)?80:-1;
  if(n==="Sebek's Blessing")return e.lp[p]<8000||has(own,'Fire Princess')?70:-1;
  if(n==='The A. Forces')return live(own).some(t=>race(t)==='Warrior')&&live(own).filter(t=>['Warrior','Spellcaster'].includes(race(t))).length>=2?60:-1;
  if(n==='Steel Shell')return live(own).some(water)?50:-1;
  if(n==='Power of Kaishin')return live(own).some(t=>race(t)==='Aqua')?50:-1;
  if(n==='Cyclon Laser')return has(own,'Gradius')?60:-1;
  if(n==='Cestus of Dagla')return e.player===p&&e.turn>1&&e.phase===4&&live(own).some(t=>race(t)==='Fairy'&&battleReady(t)&&(!enemy.length||enemy.some(x=>face(x)&&atk(t)+500>(x.position&1?atk(x):x.defense??0))))?65:-1;
  if(n==='Cyber-Stein')return e.lp[p]>6000&&free>0&&q(p,L.EXTRA).some(t=>atk(t)>=3000&&atk(t)>threat)?95:-1;
  if(n==='Garma Sword Oath')return has(hand,'Garma Sword')&&[...hand,...own].filter(t=>monster(t)&&name(t)!=='Garma Sword'&&!exodiaPieces.has(t.code)).reduce((v,t)=>v+lvl(t),0)>=7?90:-1;
  if(n==='Gamble')return q(1-p,L.HAND).length>=6&&hand.filter(t=>!same(t,c)).length<=1&&q(p,L.DECK).length>=5&&!lethal?55:-1;
  if(n==='Mind Control')return e.player===p&&(enemy.length===1&&attacks.reduce((v,t)=>v+atk(t),0)>=e.lp[1-p]||has(hand,'Polymerization')&&enemy.some(t=>face(t)&&q(p,L.EXTRA).some(f=>fusionPlan(f,false,[{...t,controller:p}]))))?95:-1;
  if(n==='Brain Control')return e.player===p&&e.lp[p]>1800&&live(enemy).some(t=>!(data(t).type&(0x40|0x80|0x2000000|0x800000|0x4000000))&&(!attackBlocked(t,p,true)||hand.some(h=>monster(h)&&lvl(h)>4)))?90:-1;
  if(n==='Ectoplasmer')return has(own,'Malice Doll of Demise')||live(own).some(t=>Math.max(0,data(t).attack||0)/2>=e.lp[1-p])?75:-1;
  if(n==='Abyssal Designator')return -1; // A blind declaration usually feeds the enemy graveyard for 1000 LP.
  if(n==='Chiron the Mage')return handCost(c,1,t=>!!(data(t).type&2))&&best(theirBack)>=1000?95:-1;
  // Also when clearing the face-up blockers opens lethal; the discard must not be the monster we summon.
  if(n==='Lightning Vortex')return handCost(c,1)&&(live(enemy).length>=2||danger&&best(live(enemy))>=2400||live(enemy).length&&!theirBack.some(t=>!face(t))&&planLethal(hand.filter(t=>!same(t,c)).length>=2?freeSummon():[],live(enemy)))?100:-1;
  if(n==='Magical Stone Excavation'||n==='Spell Reproduction')return handCost(c,2,t=>n!=='Spell Reproduction'||!!(data(t).type&2))&&grave.some(t=>data(t).type&2&&spellValue(t)>=3000)?85:-1;
  if(n==='The Winged Dragon of Ra'){
   const effect=raEffectName(c);
   // The summon trigger is Ra's only trigger; the core often asks with its generic
   // "Activate the Trigger Effect of ...?" text instead of the effect's own label.
   if(effect==='Increase ATK and DEF'||/trigger effect/i.test(effect)){
    if(e.player!==p||e.lp[p]<=100)return -1;
    const ra=own.find(t=>face(t)&&name(t)==='The Winged Dragon of Ra');if(!ra)return -1;
    if(e.phase>=256)return atk(ra)<=0&&raBoostSafe()?110:-1;
    const forecast=Math.max(0,e.lp[p]-100),current=Math.max(0,atk(ra)),boosted=current+forecast,other=attacks.filter(t=>!same(t,ra)&&!t.attack_count).reduce((sum,t)=>sum+Math.max(0,atk(t)),0);
    if(!enemy.length&&!theirBack.some(t=>!face(t))&&battleDamage(boosted+other)>=e.lp[1-p])return 130;
    if(enemy.length===1&&face(enemy[0])&&(enemy[0].position&1)&&!resilient(enemy[0])&&boosted>atk(enemy[0])&&battleDamage(boosted-atk(enemy[0])+other)>=e.lp[1-p])return 130;
    if(current<=0&&raBoostSafe())return 110;
    // Ra's printed effect pays down to 100 LP. Outside a lethal line, only
    // take that risk when its boost creates real battle/damage value and the
    // visible field has no active effect-damage source that could finish us.
    const canBattle=e.player===p&&!ra.attack_disabled&&!ra.attack_count&&!attackBlocked(ra,p,true);
    if(canBattle&&!raBurnRisk()&&!enemy.some(t=>face(t)&&(t.position&1)&&atk(t)>=boosted)){
     if(!enemy.length&&!theirBack.some(t=>!face(t))){
      const before=battleDamage(current+other),after=battleDamage(boosted+other);
      if(after>before)return 112;
     }
     const betterBattle=enemy.some(t=>face(t)&&!resilient(t)&&((t.position&1)?(
      boosted>atk(t)&&battleDamage(boosted-atk(t))>battleDamage(Math.max(0,current-atk(t)))
     ):(current<=(t.defense??data(t).defense??0)&&boosted>(t.defense??data(t).defense??0))));
     if(betterBattle)return 112;
    }
    return -1;
   }
   if(effect==='Destroy'){
    if(e.lp[p]<=1600)return -1;
    const ra=own.find(t=>face(t)&&name(t)==='The Winged Dragon of Ra'),canFight=ra&&e.player===p&&(e.phase===4||e.phase===8)&&!ra.attack_count&&!ra.attack_disabled&&!attackBlocked(ra,p);
    const targets=enemy.filter(t=>face(t)&&!t.is_immune&&!/unaffected by|cannot be targeted by/i.test(e.cards.get(t.code)?.desc||''));
    const useful=targets.filter(t=>targetValue(t)>=2200&&!(canFight&&atk(ra)>((t.position&1)?atk(t):(t.defense??data(t).defense??0))));
    if(useful.length)return Math.min(120,95+Math.max(...useful.map(targetValue))/500);
    return -1;
   }
   // Old cores may omit the effect label; retain the conservative fallback.
   if(atk(c)>0)return e.lp[p]>1000&&enemy.some(t=>face(t)&&atk(t)>=atk(c))?95:-1;
   const forecast=projectedAttack(c),otherAttacks=attacks.filter(t=>!same(t,c)).reduce((sum,t)=>sum+Math.max(0,atk(t)),0);
   return e.lp[p]>100&&e.player===p&&e.phase===4&&enemy.length===0&&forecast+otherAttacks>=e.lp[1-p]?105:-1;
  }
  if(n==='Orb of Yasaka')return e.lp[p]<7000&&live(own).some(t=>spirit(t)&&battleReady(t)&&enemy.some(a=>face(a)&&atk(t)>atk(a)))?65:-1;
  if(n==='Mirror of Yata')return live(own).some(t=>spirit(t)&&atk(t)>=1400)?65:-1;
  if(n==='Water Hazard')return free===5&&hand.some(t=>monster(t)&&water(t)&&lvl(t)<=4)?95:-1;
  if(n==='Big Wave Small Wave'){const bodies=own.filter(water),targets=hand.filter(t=>water(t)&&monster(t)&&!(data(t).type&(0x80|0x200|0x2000000))).sort((a,b)=>atk(b)-atk(a));return bodies.length&&targets.length&&targets.slice(0,bodies.length).reduce((v,t)=>v+atk(t),0)>bodies.reduce((v,t)=>v+atk(t),0)+700?95:-1;}
  if(n==='Hydro Pressure Cannon')return q(1-p,L.HAND).length&&live(own).some(t=>water(t)&&lvl(t)<=3&&battleReady(t)&&enemy.some(a=>face(a)&&atk(t)>atk(a)))?65:-1;
  if(n==='Fish and Kicks')return q(p,L.REMOVED).filter(sea).length>=3&&best(enemyCards)>=1200?95:-1;
  if(n==='Salvage')return grave.filter(t=>water(t)&&monster(t)&&atk(t)<=1500).length>=2?85:-1;
  if(n==='Surface')return free>0&&grave.some(t=>sea(t)&&lvl(t)<=3)?85:-1;
  if(n==='Fish Depth Charge')return q(p,L.DECK).length>0&&live(own).some(t=>race(t)==='Fish'&&(threatened(t)||best(enemyCards)>atk(t)+700))?100:-1;
  if(n==='Forgotten Temple of the Deep')return c.location!==L.SZONE?has(own,'The Legendary Fisherman')||has(back,'Tornado Wall')?60:-1:live(own).some(t=>sea(t)&&lvl(t)<=4&&threatened(t))?100:-1;
  if(n==='Aegis of the Ocean Dragon Lord')return chain&&live(own).some(t=>water(t)&&lvl(t)<=3&&threatened(t))?100:-1;
  if(n==='Muko')return chain&&e.effect?.player===1-p&&/draw/i.test(e.cards.get(e.effect.code)?.desc||'')?100:-1;
  if(n==='Soul Charge')return e.lp[p]>2500&&free>0&&!lethal&&grave.some(t=>monster(t)&&atk(t)>=1500)?90:-1;
  if(n==='Overpowering Eye')return e.player===p&&enemy.length&&attacks.some(t=>race(t)==='Zombie'&&atk(t)<=2000&&atk(t)>0)?85:-1;
  if(n==='Zoma the Spirit')return free>0&&(incoming||own.length<2)?80:-1;
  if(n==='Call of the Earthbound')return incoming&&own.some(t=>!same(t,incomingTarget)&&(name(t)==='Spirit Reaper'||name(t)==='Zoma the Spirit'||((t.position&1)?atk(t):(t.defense??data(t).defense??0))>=atk(e.attackCard)))?100:-1;
  if(n==='Rafflesia Seduction')return live(enemy).length?85:-1;
  if(n==='Threatening Roar')return chain&&e.player!==p&&!e.battleProtected?.[p]&&(danger||live(enemy).some(t=>atk(t)>Math.max(0,...own.map(atk))))?95:-1;
  if(n==='Destiny Board')return back.filter(t=>t.sequence<5&&!same(t,c)&&!name(t).startsWith('Spirit Message')).length===0&&['I','N','A','L'].every(letter=>has([...hand,...q(p,L.DECK)],'Spirit Message "'+letter+'"'))?100:-1;
  if(n==='Insect Barrier')return enemy.some(t=>face(t)&&race(t)==='Insect')||has(back,'DNA Surgery')?80:-1;
  if(n==='Book of Life')return free>0&&grave.some(t=>monster(t)&&race(t)==='Zombie')&&q(1-p,L.GRAVE).some(monster)?95:-1;
  if(n==='Call of the Mummy')return own.length===0&&hand.some(t=>monster(t)&&race(t)==='Zombie'&&lvl(t)>4)?90:-1;
  if(n==='Insect Imitation')return own.some(t=>q(p,L.DECK).some(a=>race(a)==='Insect'&&lvl(a)===lvl(t)+1&&atk(a)>atk(t)+500))?85:-1;
  if(n==='Insect Queen')return e.phase===512&&free>0?85:incoming?-1:own.some(t=>!same(t,c)&&atk(t)<1000)?65:-1;
  if(n==='Jam Defender')return has(own,'Revival Jam')&&incoming&&name(incomingTarget||{})!=='Revival Jam'?90:-1;
  if(n==='Giant Rex'||n==='Malice Doll of Demise')return spent&&free>0?95:-1;
  // Beneficial recruiter, FLIP and battle triggers; these are only offered when legal.
  if(['Pinch Hopper','Pyramid Turtle','Goblin Zombie','Flying Kamakiri #1','Regenerating Mummy','Skull-Mark Ladybug','Kaiser Sea Horse','Creeping Doom Manta','Ninja Grandmaster Sasuke','Fusilier Dragon, the Dual-Mode Beast','Doomcaliber Knight','Rafflesia Seduction','Ryu Kokki','Dark Dust Spirit','Chorus of Sanctuary','Laser Cannon Armor','Insect Armor with Laser Cannon'].includes(n)){
   if(n==='Dark Dust Spirit')return enemyPower>ownPower-atk(c)+700?90:-1;
   if(n==='Rafflesia Seduction')return live(enemy).length?85:-1;
   if(n==='Chorus of Sanctuary')return own.some(t=>face(t)&&(t.position&4))&&!enemy.some(t=>face(t)&&(t.position&4))?40:-1;
   if(n==='Laser Cannon Armor'||n==='Insect Armor with Laser Cannon')return live(own).some(t=>race(t)==='Insect')?60:-1;
   return 85;
  }
  const unused=unusedCardValue(c,chain,n);if(unused!==null)return unused;
  return null;
 }
 // Cards the CPU skipped entirely before October 26: they had no rule, so the
 // generic fallback declined them (any text mentioning "destroy" was refused).
 const spellCounterUsers=new Set(['Breaker the Magical Warrior','Blast Magician','Magical Marionette','Royal Magical Library','Hannibal Necromancer','Skilled Dark Magician','Skilled White Magician','Apprentice Magician','Silent Magician LV4','Mythical Beast Cerberus','Magical Plant Mandragola','Tower of Babel']);
 const spellCounters=card=>{const live=[...own,...back].find(x=>same(x,card))||card,raw=live.counters||{};return Array.isArray(raw)?raw.filter(x=>(x.type&0xfff)===1).reduce((s,x)=>s+x.count,0):Number(raw[1]||0)};
 const counterUserOnField=source=>own.some(x=>!same(x,source)&&face(x)&&spellCounterUsers.has(name(x)));
 const cardText=card=>e.cards.get(card.code)?.desc||'';
 const isUnion=card=>monster(card)&&/\bunequip\b/i.test(cardText(card));
 // Monsters a Union can equip to: the quoted names in its text, or a Type (Heavy Mech Support Platform: Machine).
 const unionPartners=union=>{const text=cardText(union),names=[...text.matchAll(/"([^"]+)"/g)].map(m=>m[1]),type=/equip(?: it)? to (?:a |an |1 )?(\w[\w-]*)[- ]Type monster/i.exec(text)?.[1];
  return live(own).filter(x=>!same(x,union)&&monster(x)&&(names.includes(name(x))||(type&&race(x)===type)));};
 // Contact fusions ("Must first be Special Summoned (from your Extra Deck) by banishing the above cards").
 const contactMaterials=fusion=>{const text=cardText(fusion);return /Must first be Special Summoned \(from your Extra Deck\) by banishing/i.test(text)?[...text.split('Must first')[0].matchAll(/"([^"]+)"/g)].map(m=>m[1]):[]};
 const contactEffectTarget={'XY-Dragon Cannon':()=>theirBack.some(face),'XZ-Tank Cannon':()=>theirBack.some(x=>!face(x)),'YZ-Tank Dragon':()=>enemy.some(x=>!face(x)),'XYZ-Dragon Cannon':()=>enemyCards.length>0};
 // Summon a contact fusion when it beats something its materials cannot, or its removal effect has a target.
 function contactFusionUseful(fusion){
  const names=contactMaterials(fusion);if(!names.length)return false;
  const materials=names.map(m=>live(own).find(x=>monster(x)&&name(x)===m));if(materials.some(x=>!x))return false;
  const power=t=>(t.position&1)?atk(t):(t.defense??data(t).defense??0),strongest=Math.max(...materials.map(atk)),toBeat=Math.max(0,...live(enemy).filter(monster).map(power));
  const fusionAttack=data(fusion).attack??0,effect=contactEffectTarget[name(fusion)];
  return (toBeat>=strongest&&fusionAttack>toBeat)||(!!effect&&effect()&&hand.length>0);
 }
 function unusedCardValue(c,chain,n){
  const text=e.cards.get(c.code)?.desc||'',deck=()=>q(p,L.DECK),mainPhase=e.player===p&&(e.phase===4||e.phase===256);
  // LV monsters: Standby/End Phase level-up triggers are only offered when the next level can be summoned.
  if(chain&&/ LV\d+$/.test(n)&&c.location===L.MZONE&&(e.phase===2||e.phase===512)&&n!=='Horus the Black Flame Dragon LV8')return 92;
  // Spell negation; paid negations skip removal that would only hit cards we would not miss.
  if(['Horus the Black Flame Dragon LV8','Anti-Spell','Cursed Seal of the Forbidden Spell'].includes(n)){
   if(!chain||e.effect?.player!==1-p)return -1;
   const link=(e.activeChain||[]).at(-1),incoming=link&&!link.inactive?e.name(link.code):'';
   if(n!=='Horus the Black Flame Dragon LV8'&&['Mystical Space Typhoon','Heavy Storm',"Harpie's Feather Duster",'Giant Trunade'].includes(incoming)&&!back.some(x=>!same(x,c)&&backValue(x)>=600))return -1;
   return 100;
  }
  if(n==='Divine Wrath'){
   if(!chain||e.effect?.player!==1-p)return -1;
   const source=enemy.find(x=>face(x)&&x.code===e.effect.code);
   return source&&value(source)>=1000?98:-1;
  }
  // Union monsters: equip onto a partner (the engine offers only legal equips); keep an equipped Union in place,
  // and keep it as a monster when it completes a contact fusion worth summoning instead.
  if(monster(c)&&isUnion(c))return c.location===L.MZONE&&mainPhase&&!q(p,L.EXTRA).some(f=>contactMaterials(f).includes(n)&&contactFusionUseful(f))?82:-1;
  // Union support.
  if(n==='Formation Union'){
   // Equip mode only (resourceOption picks it): when a Union's own equip is not offered this turn.
   const ownEquip=(prompt?.activates||[]).some(x=>x.location===L.MZONE&&isUnion(x));
   return mainPhase&&!ownEquip&&live(own).some(x=>isUnion(x)&&unionPartners(x).length)?78:-1;
  }
  if(n==='Union Attack'){
   if(!(e.player===p&&e.phase===4))return -1;
   const attackers=live(own).filter(battleReady),total=attackers.reduce((sum,x)=>sum+atk(x),0),strongest=Math.max(0,...attackers.map(atk));
   const power=t=>(t.position&1)?atk(t):(t.defense??data(t).defense??0);
   return attackers.length>=2&&live(enemy).some(t=>monster(t)&&power(t)>=strongest&&power(t)<total&&value(t)>=1500)?84:-1;
  }
  if(n==='Combination Attack'){
   if(!(e.player===p&&e.phase>=8&&e.phase<=128))return -1;
   const power=t=>(t.position&1)?atk(t):(t.defense??data(t).defense??0);
   // The core does not report attack counts; duel.js counts attacks per zone this turn.
   return live(own).some(x=>(e.attacksThisTurn?.get?.(`${x.controller}:${x.sequence}`)||0)>0&&(x.position&1)&&(!enemy.length||live(enemy).some(t=>atk(x)-600>power(t))))?85:-1;
  }
  // Spell Counter effects.
  if(n==='Blast Magician'){const cap=Math.max(1,spellCounters(c))*700,target=live(enemy).filter(x=>monster(x)&&atk(x)<=cap).sort((a,b)=>value(b)-value(a))[0];return target&&value(target)>=900?90:-1;}
  if(n==='Magical Marionette')return best(enemy)>=1000?90:-1;
  if(n==='Hannibal Necromancer')return theirBack.some(x=>face(x)&&(data(x).type&4))?90:-1;
  if(n==='Mega Ton Magical Cannon')return enemyCards.reduce((sum,x)=>sum+value(x),0)>=2000?115:-1;
  if(n==='Royal Magical Library')return deck().length>3?85:-1;
  if(n==='Pitch-Black Power Stone'){
   if(c.location===L.SZONE&&face(c))return mainPhase&&counterUserOnField(c)?80:-1;
   return counterUserOnField(c)||hand.some(x=>spellCounterUsers.has(name(x)))?70:-1;
  }
  if(n==='Magical Dimension'){
   const caster=hand.filter(x=>monster(x)&&race(x)==='Spellcaster').sort((a,b)=>atk(b)-atk(a))[0],cheapest=own.filter(face).sort((a,b)=>value(a)-value(b))[0];
   if(!caster||!cheapest)return -1;
   return best(enemy)>=1000||atk(caster)>atk(cheapest)+500?98:-1;
  }
  // Contact fusions: discard 1 card to destroy an opposing card of the matching kind.
  const discardDestroy=contactEffectTarget[n];
  if(discardDestroy)return handCost(c,1)&&discardDestroy()?88:-1;
  if(n==='Armed Dragon LV5'&&!chain){
   const fodder=hand.filter(x=>monster(x)&&!exodiaPieces.has(x.code)).sort((a,b)=>atk(b)-atk(a))[0];
   const target=fodder&&live(enemy).filter(x=>monster(x)&&atk(x)<=atk(fodder)).sort((a,b)=>value(b)-value(a))[0];
   return target&&value(target)>=1000?85:-1;
  }
  if(n==='Twin-Headed Behemoth')return chain&&c.location===L.GRAVE&&free>0?90:-1;
  if(n==='Archfiend General')return c.location===L.HAND&&!has(hand,'Pandemonium')&&![...back,...theirBack].some(x=>face(x)&&name(x)==='Pandemonium')&&deck().some(x=>name(x)==='Pandemonium')?85:-1;
  if(n==='Dark Factory of Mass Production')return hand.length<=5?85:-1;
  if(n==='Last Will')return e.fieldToGraveTurn?.[p]===e.turn&&free>0&&deck().some(x=>monster(x)&&atk(x)<=1500)?90:-1;
  if(n==='Yu-Jo Friendship')return e.lp[1-p]-e.lp[p]>=2000?85:-1;
  if(n==='Unity'){
   if(!chain||!incoming||!incomingTarget||(incomingTarget.position&1))return -1;
   const total=own.filter(face).reduce((sum,x)=>sum+Math.max(0,data(x).defense??0),0),attacker=enemy.find(x=>same(x,e.attackCard));
   return attacker&&total>atk(attacker)&&(incomingTarget.defense??0)<=atk(attacker)?95:-1;
  }
  if(n==='Judgment of the Pharaoh'){
   // Only the Unity mode: clear the way for an attack into backrow on our own Main Phase 1.
   const attackers=live(own).filter(battleReady);
   return has(grave,'Unity')&&e.player===p&&e.phase===4&&theirBack.length>=2&&attackers.length&&e.lp[p]>=3000?80:-1;
  }
  if(n==='Return from the Different Dimension'){
   const banished=q(p,L.REMOVED).filter(x=>monster(x)&&face(x)).sort((a,b)=>atk(b)-atk(a)).slice(0,free);
   const damage=banished.reduce((sum,x)=>sum+atk(x),0);
   return e.player===p&&e.phase===4&&!enemy.length&&damage>=e.lp[1-p]?120:-1;
  }
  return existingDeckCardValue(c,chain,n,text,mainPhase);
 }
 // Cards from the existing game decks that the CPU also never used in those simulations.
 function existingDeckCardValue(c,chain,n,text,mainPhase){
  const defense=x=>x.defense??data(x).defense??0,attacker=enemy.find(x=>same(x,e.attackCard)),ourTurn=e.player===p;
  const trapMonster=['Tiki Curse','Tiki Soul','Tiki Peace'].includes(n);
  // Trap monsters: a blocker when an attack comes in on an empty field, otherwise an extra body in our Main Phase.
  if(trapMonster)return chain&&incoming&&!own.length?85:mainPhase&&free>0?60:-1;
  if(n==='Ultimate Offering'){
   if(c.location!==L.SZONE||!face(c))return mainPhase&&e.lp[p]>2000&&hand.some(monster)?60:-1;
   const summonable=hand.some(x=>monster(x)&&lvl(x)<=4);
   if(chain&&incoming&&!own.length&&summonable&&e.lp[p]>1000)return 85;
   // 500 LP buys an additional summon: spend the free Normal Summon first.
   return mainPhase&&e.normalSummonTurn?.[p]===e.turn&&e.lp[p]>2000&&free>0&&summonable?80:-1;
  }
  if(n==='Shadow Spell'){
   if(chain&&incoming&&attacker&&face(attacker)&&atk(attacker)>=1400)return 90;
   return mainPhase&&live(enemy).some(x=>monster(x)&&atk(x)>=1900)?80:-1;
  }
  if(n==='Micro Ray')return ourTurn&&(e.phase===4||e.phase===8)&&live(own).filter(battleReady).some(a=>live(enemy).some(t=>!(t.position&1)&&defense(t)>=atk(a)&&atk(a)>0))?80:-1;
  if(n==='Curse of Aging'){
   if(!ourTurn||!(e.phase===4||e.phase===8)||!handCost(c,1))return -1;
   const swing=live(own).filter(battleReady).some(a=>live(enemy).some(t=>{const power=(t.position&1)?atk(t):defense(t);return power>=atk(a)&&power-500<atk(a)}));
   return swing?82:-1;
  }
  if(n==='Ojama Trio')return enemy.length<=2&&(chain?e.player===1-p&&e.phase===512:mainPhase&&live(own).some(battleReady))?72:-1;
  if(n==='Time Seal')return chain&&e.player===1-p&&e.phase===512?70:-1;
  if(n==='Curse of Anubis'){
   if(!ourTurn||e.phase!==4)return -1;
   const effectMonster=x=>monster(x)&&face(x)&&(data(x).type&0x20),gain=enemy.filter(effectMonster).reduce((s,x)=>s+value(x),0),loss=own.filter(effectMonster).reduce((s,x)=>s+value(x),0);
   return gain-loss>=1000&&live(own).some(x=>battleReady(x)&&!(data(x).type&0x20))?85:-1;
  }
  if(n==='Ninjitsu Art of Decoy')return chain&&incoming&&incomingTarget&&/Ninja/.test(name(incomingTarget))&&attacker&&atk(attacker)>=((incomingTarget.position&1)?atk(incomingTarget):defense(incomingTarget))?88:-1;
  if(n==="Dragon's Rage")return live(own).some(x=>race(x)==='Dragon')?70:-1;
  if(n==='Dedication through Light and Darkness')return live(own).some(x=>name(x)==='Dark Magician')?95:-1;
  if(n==='Amazoness Village')return [...own,...hand].some(x=>/Amazoness/.test(name(x)))?70:-1;
  if(n==="Harpies' Hunting Ground"){const winged=a=>live(a).filter(x=>race(x)==='Winged Beast').length;return winged(own)>winged(enemy)||hand.some(x=>/Harpie Lady/.test(name(x)))?70:-1;}
  if(n==='Burst Breath'){
   const dragon=live(own).filter(x=>race(x)==='Dragon').sort((a,b)=>value(a)-value(b))[0];if(!dragon)return -1;
   const hit=side=>live(side).filter(x=>!same(x,dragon)&&defense(x)<=atk(dragon)).reduce((s,x)=>s+value(x),0);
   return hit(enemy)-hit(own)-value(dragon)>=1500?85:-1;
  }
  if(n==='Soul Resurrection')return free>0&&grave.some(x=>monster(x)&&(data(x).type&0x10)&&Math.max(atk(x),defense(x))>=1500)?75:-1;
  if(n==='The Warrior Returning Alive')return grave.some(x=>monster(x)&&race(x)==='Warrior')?85:-1;
  if(n==='Adhesion Trap Hole')return chain&&e.player===1-p&&live(enemy).some(x=>monster(x)&&atk(x)>=1600)?85:-1;
  if(n==='The Reliable Guardian')return chain&&incoming&&incomingTarget&&!(incomingTarget.position&1)&&attacker&&defense(incomingTarget)<=atk(attacker)&&defense(incomingTarget)+700>atk(attacker)?90:-1;
  if(n==='Attack and Receive')return chain?90:-1;
  if(n==='Abyss Soldier')return mainPhase&&hand.some(x=>!same(x,c)&&monster(x)&&hasAttribute(x,'WATER'))&&best(enemyCards)>=1500?85:-1;
  if(n==='Dark Master - Zorc'){
   const all=a=>live(a).filter(monster).reduce((s,x)=>s+value(x),0);
   const expected=all(enemy)*2/6+best(enemy)*3/6-all(own)/6;
   return mainPhase&&expected>=500?85:-1;
  }
  return null;
 }
 function targetScore(n,c,info){const ownCard=c.controller===p;
  if(n==='Pitch-Black Power Stone')return ownCard&&spellCounterUsers.has(name(c))?50000:-100000;
  // Union support: boost or re-arm our strongest monster; Formation Union picks a Union, then its partner.
  if(['Union Attack','Combination Attack','Formation Union'].includes(n))return ownCard&&c.location===L.MZONE?30000+atk(c):-100000;
  if(n==='Magical Dimension'){
   // First the Tribute (only our monsters are offered): the cheapest. Then the optional destroy: their best.
   const tribute=(info.cands||[]).every(x=>x.controller===p);
   return tribute?(ownCard?20000-value(c):-100000):(ownCard?-100000:30000+value(c));
  }
  if(n==='The Agent of Creation - Venus')return ownCard&&name(c)==='Mystical Shine Ball'&&[L.HAND,L.DECK].includes(c.location)?50000+atk(c):-100000;
  if(n==='Rescue Cat'){const missing=has(hand,'Ojama Delta Hurricane!!')?ojamaMissing():[],key=x=>(missing.includes(name(x))?100000:0)+atk(x);const eligible=(info.cands||[]).filter(x=>x.controller===p&&x.location===L.DECK&&monster(x)&&race(x)==='Beast'&&lvl(x)<=3).sort((a,b)=>key(b)-key(a)).filter((x,i,a)=>!missing.includes(name(x))||a.findIndex(y=>name(y)===name(x))===i);return eligible.slice(0,2).some(x=>same(x,c))?50000+atk(c):-100000;}
  if(n==='Juragedo')return raBoostScore(c)>=0?30000+raBoostScore(c):-100000;
  if(n==='Human-Wave Tactics')return ownCard&&c.location===L.DECK&&lowNormal(c)?30000+atk(c):-100000;
  if(n==='Enchanting Fitting Room')return ownCard&&lowNormal(c)?30000+atk(c):-100000;
  if(n==='Terraforming')return ownCard&&c.location===L.DECK&&name(c)==='Pandemonium'?50000:-100000;
  if(n==='Pandemonium')return ownCard&&c.location===L.DECK&&monster(c)&&name(c).includes('Archfiend')?30000+atk(c):-100000;
  if(n==='Frontline Base')return ownCard&&c.location===L.HAND&&(data(c).type&1024)&&lvl(c)<=4?50000+projectedAttack(c):-100000;
  if(n==='Ninjitsu Art of Transformation')return ownCard&&[L.HAND,L.DECK].includes(c.location)&&monster(c)&&['Beast','Winged Beast','Insect'].includes(race(c))?30000+projectedAttack(c):-100000;
  if(n==='Level Up!')return ownCard&&[L.HAND,L.DECK].includes(c.location)&&monster(c)?50000+projectedAttack(c):-100000;
  if(n==='Kaibaman')return ownCard&&c.location===L.HAND&&name(c)==='Blue-Eyes White Dragon'?50000+projectedAttack(c):-100000;
  if(n==='Riryoku'){
   const cands=(info.cands||[]).filter(x=>x.location===L.MZONE&&face(x)),friends=cands.filter(x=>x.controller===p).sort((a,b)=>atk(b)-atk(a)),foes=cands.filter(x=>x.controller!==p).sort((a,b)=>atk(b)-atk(a));
   const attacker=friends.filter(x=>battleReady(x)&&!(x.attack_count>0)).sort((a,b)=>atk(b)-atk(a))[0];
   // The first target pair is chosen together; then the card asks which one
   // loses ATK. Prefer halving the opponent, or the weakest of our two bodies.
   if(info.min===1&&cands.length===2){const lose=foes.find(x=>x.position&1)||friends.filter(x=>x!==attacker).sort((a,b)=>atk(a)-atk(b))[0];return lose&&same(c,lose)?100000+atk(c):-100000;}
   const bestFriend=attacker||friends[0],bestFoe=foes.filter(x=>x.position&1).sort((a,b)=>atk(b)-atk(a))[0];
   if(bestFriend&&bestFoe)return same(c,bestFriend)?100000+atk(c):same(c,bestFoe)?50000+atk(c):-100000;
   if(friends.length>=2)return same(c,bestFriend)?100000+atk(c):same(c,friends.at(-1))?50000-atk(c):-100000;
   return -100000;
  }
  if(n==='Cestus of Dagla')return ownCard&&race(c)==='Fairy'&&battleReady(own.find(x=>same(x,c))||c)?20000+atk(c):-100000;
  if(['Polymerization','Cybernetic Fusion Support'].includes(n)){
   if(c.location===L.EXTRA){const plan=fusionPlan(c,n==='Cybernetic Fusion Support'||e.fusionSupport?.[p]===e.turn);return plan?20000+plan.score:-100000;}
   if(ownCard&&[L.MZONE,L.HAND,L.GRAVE].includes(c.location))return -Math.max(0,atk(c))+(c.location===L.GRAVE?4000:0);
  }
  if(['Magician of Faith','Mask of Darkness','A Cat of Ill Omen','Senju of the Thousand Hands','Manju of the Ten Thousand Hands','Fusion Sage'].includes(n)&&ownCard&&[L.DECK,L.GRAVE].includes(c.location)){if(n==='Fusion Sage')return name(c)==='Polymerization'?100000:-100000;if(n==='Senju of the Thousand Hands'||n==='Manju of the Ten Thousand Hands'){const counterpart=(e.cards.get(c.code)?.desc||'');return hand.some(t=>counterpart.includes(name(t))||(e.cards.get(t.code)?.desc||'').includes(name(c)))?50000+atk(c):atk(c);}return name(c)==='Destiny Board'&&boardPlan?100000:spellValue(c);}
  if(n==='Soul Charge')return ownCard&&c.location===L.GRAVE?atk(c)+(['Jinzo','Pyramid Turtle'].includes(name(c))?800:0):-100000;
  if(['Magical Stone Excavation','Spell Reproduction'].includes(n)&&c.location===L.GRAVE)return spellValue(c);
  if(['Night Assailant','Electromagnetic Bagworm','Dark Jeroid','Otohime','Bait Doll','Nobleman of Extermination','Double Snare'].includes(n)&&[L.MZONE,L.SZONE].includes(c.location))return ownCard?-100000:20000+value(c);
  if(['Gatling Dragon','Blowback Dragon','Roulette Barrel','Fish and Kicks','Lightning Vortex','Chiron the Mage','The Winged Dragon of Ra','Proton Blast'].includes(n)&&[L.MZONE,L.SZONE].includes(c.location))return ownCard?-100000:20000+value(c);
  if(['Mind Control','Brain Control','Rafflesia Seduction'].includes(n)&&c.location===L.MZONE)return ownCard?-100000:20000+(face(c)?atk(c):900);
  if(n==='Fish Depth Charge'&&ownCard&&c.location===L.MZONE)return (threatened(c)?50000:0)-atk(c);
  if(n==='Ectoplasmer'&&ownCard&&c.location===L.MZONE)return name(c)==='Malice Doll of Demise'?100000:(data(c).attack||0)/2>=e.lp[1-p]?90000:-atk(c);
  if(['Pinch Hopper','Pyramid Turtle','Flying Kamakiri #1','Goblin Zombie','Call of the Mummy','Water Hazard','Surface','Big Wave Small Wave','Book of Life'].includes(n)){
   if(!ownCard)return c.location===L.GRAVE?atk(c): -100000;
   if(c.location===L.HAND&&n==='Goblin Zombie')return null;
   return atk(c)+(name(c)==='Vampire Lord'?700:0)+(name(c)==='Pyramid Turtle'&&danger?1000:0);
  }
  if(n==='Call of the Earthbound')return !ownCard?-100000:['Spirit Reaper','Zoma the Spirit'].includes(name(c))?100000:(c.position&1?atk(c):c.defense??data(c).defense??0);
  if(n==='Forgotten Temple of the Deep')return ownCard&&threatened(c)?100000:-100000;
  if(n==='Overpowering Eye')return ownCard&&race(c)==='Zombie'&&atk(c)<=2000?atk(c):-100000;
  if(['Fusion Weapon','Heavy Mech Support Platform','Orb of Yasaka','Mirror of Yata','Hydro Pressure Cannon'].includes(n))return ownCard?atk(c):-100000;
  return null;
 }
 function specialOk(c){return !['The Winged Dragon of Ra','The Wicked Eraser','Doomcaliber Knight'].includes(name(c));}
 function setAllowed(c){return !board||name(c)==='Destiny Board';}
 return {activation,targetScore,fusionChoices,setAllowed,setScore,specialOk,contactFusionUseful};
}
