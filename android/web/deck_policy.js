// Rules for the expanded fixed opponent decks. Only public opposing cards are valued.
export function deckPolicy(x){
 const {e,p,L,q,name,data,atk,face,own,enemy,hand,grave,back,theirBack,lvl,race,attr,same,threat,ownPower,enemyPower,danger,targetValue,backValue,attackBlocked,exodiaPieces}=x;
 const has=(a,n)=>a.some(c=>name(c)===n),live=a=>a.filter(face),monster=c=>!!(data(c).type&1),spirit=c=>!!(data(c).type&0x200),water=c=>attr(c)==='WATER',sea=c=>['Fish','Sea Serpent','Aqua'].includes(race(c));
 const enemyCards=[...enemy,...theirBack],value=c=>c.location===L.SZONE?backValue(c):targetValue(c),best=a=>Math.max(0,...a.map(value)),free=5-own.length;
 const handCost=(source,n,filter=()=>true)=>hand.filter(c=>!same(c,source)&&!exodiaPieces.has(c.code)&&filter(c)).length>=n;
 const spellValue=c=>({'Raigeki':4000,'Monster Reborn':3500,'Pot of Greed':3200,'Graceful Charity':3000,'Heavy Storm':theirBack.length*1500,'Polymerization':1200}[name(c)]??1000);
 const battleReady=c=>face(c)&&(c.position&1)&&!attackBlocked(c,p)&&!c.attack_disabled;
 const incoming=e.attackCard?.controller===1-p;
 const incomingTarget=own.find(c=>same(c,e.attackTarget));
 const threatened=c=>incoming&&same(c,incomingTarget)||(e.activeChain||[]).some(a=>a.player!==p&&(a.targets||[]).some(t=>same(t,c)));
 const attacks=live(own).filter(battleReady);
 const lethal=attacks.reduce((s,c)=>s+Math.max(0,atk(c)),0)>=e.lp[1-p]&&!enemy.length;
 const board=back.some(c=>face(c)&&name(c)==='Destiny Board');
 const boardPlan=board||has(hand,'Destiny Board')||has(back,'Destiny Board');
 const substitutes=new Set(['Beastking of the Swamps','Goddess with the Third Eye','Mystical Sheep #1','Versago the Destroyer']);
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
  // Leave room for all four messages. Temporary spells can still resolve normally.
  if(board&&(d.type&(0x20000|0x40000))&&!n.startsWith('Spirit Message')&&n!=='Destiny Board'&&c.location!==L.SZONE)return -1;
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
  if(n==='Ceasefire'){const effects=[...own,...enemy].filter(t=>face(t)&&(data(t).type&32)).length;return effects>=3||effects*500>=e.lp[1-p]?90:-1;}
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
  if(n==='Lightning Vortex')return handCost(c,1)&&(live(enemy).length>=2||danger&&best(live(enemy))>=2400)?100:-1;
  if(n==='Magical Stone Excavation'||n==='Spell Reproduction')return handCost(c,2,t=>n!=='Spell Reproduction'||!!(data(t).type&2))&&grave.some(t=>data(t).type&2&&spellValue(t)>=3000)?85:-1;
  if(n==='The Winged Dragon of Ra')return atk(c)>0?e.lp[p]>2000&&enemy.some(t=>face(t)&&atk(t)>=atk(c))?95:-1:e.lp[p]>2000&&enemy.length===0&&e.lp[p]-100>=e.lp[1-p]&&e.player===p?105:-1;
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
  return null;
 }
 function targetScore(n,c,info){const ownCard=c.controller===p;
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
 function setAllowed(c){return !boardPlan||name(c)==='Destiny Board';}
 return {activation,targetScore,fusionChoices,setAllowed,specialOk};
}
