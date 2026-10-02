import {effectMessageCue,effectChoiceCue} from './effect-feedback.js';
import {planBattle} from './battle-planner.js';
import {FieldKnowledge} from './field-knowledge.js';
import {smartContext,exodiaPieces} from './smart_policy.js';
import {DuelEngine,M,R,I,B,L,P} from './engine.js';
export {M,R,I,B,L,P};
export class MobileDuel extends DuelEngine {
 constructor(cards){super(cards);this.fieldKnowledge=new FieldKnowledge();this.rebornMonsters=new Map();this.resolvingChain=0}
 unknownDefense(c){return this.tributeSets?.has(this.fieldKnowledge.key(c))?2000:900}
 knownFieldCard(viewer,c){return this.fieldKnowledge.known(viewer,c)}
 wasReborn(c){return this.rebornMonsters.get(this.fieldKnowledge.key(c))===c.code}
 trackReborn(m){
  const key=c=>this.fieldKnowledge.key(c),memory=this.rebornMonsters;
  if(m.type===M.CHAIN_SOLVING){const link=this.activeChain?.find(c=>c.link===m.chain_size);this.resolvingChain=link&&!link.inactive?link.code:0;if(link&&!link.inactive)this.effect={code:link.code,player:link.player};}
  if([M.CHAIN_SOLVED,M.CHAIN_END].includes(m.type))this.resolvingChain=0;
  if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type)){
   memory.delete(key(m));
   if(m.type===M.SPSUMMONING&&this.resolvingChain===83764718)memory.set(key(m),m.code);
  }
  if(m.type===M.MOVE){
   const code=memory.get(key(m.from));memory.delete(key(m.from));memory.delete(key(m.to));
   if(code&&m.from.location===L.MZONE&&m.to.location===L.MZONE)memory.set(key(m.to),code);
  }
  if(m.type===M.SWAP){const a=key(m.card1),b=key(m.card2),ca=memory.get(a),cb=memory.get(b);memory.delete(a);memory.delete(b);if(ca)memory.set(b,ca);if(cb)memory.set(a,cb);}
  if(m.type===M.SHUFFLE_SET_CARD)for(const c of m.cards||[]){memory.delete(key(c.from));memory.delete(key(c.to));}
 }
 start(...args){this.cancelledAttacks=new Map();this.tributeSets=new Set();this.releasedForSet=[0,0];this.piercingTurn={};this.piercingCards=new Map();this.feedbackStats=new Map();this.orDealGuesses=0;this.reasoningSeed=Number(args[5])>>>0;this.questionGuesses=0;this.summoningPlayer=null;this.expertTarget=null;this.attackLocks=new Map();this.limiterDoom=new Set();this.cardTurnCounts=new Map();this.declaredRaces=new Map();this.rebornMonsters=new Map();this.resolvingChain=0;this.fieldKnowledge=new FieldKnowledge();this.exodiaPlan=[false,false];this.aiModifiers=JSON.parse(String(args[8]||'').match(/^-- SHADOW_RUN_AI (.+)$/m)?.[1]||'{}');this.fusionSupport={};this.pendingSummons=[];this.events=[];this.visuals=[];this.selectionHint=null;this.peak={peak_attack:0,peak_defense:0,peak_field:0,turns:0};this.effect=null;this.materialSubject=null;this.attacker=null;this.chainDepth=0;this.battleOpen=false;this.chainedSinceAttack=false;this.activeChain=[];this.battleProtected=[false,false];this.attackCard=null;this.attackTarget=null;this.inDamageStep=false;this.lastSummoned=[];this.revealedHands=[{},{}];this.resolutionSource=0;return super.start(...args)}
 handRevealed(viewer,c){return !!c?.code&&(!!c.isPublic||!!c.is_public||this.revealedHands?.[viewer]?.[c.controller+':'+c.sequence]===c.code);}
 onMessage(m){
  this.trackReborn(m);
  if([M.NEW_TURN,M.NEW_PHASE].includes(m.type))this.cancelledAttacks?.clear();
  if(m.type===M.NEW_TURN)this.releasedForSet=[0,0];
  if(m.type===M.MOVE){
   const reason=m.reason??(m.wire?.length>=29?new DataView(Uint8Array.from(m.wire).buffer).getUint32(25,true):0);
   const old=this.fieldKnowledge.key(m.from),next=this.fieldKnowledge.key(m.to),was=this.tributeSets.has(old);
   this.tributeSets.delete(old);this.tributeSets.delete(next);
   if(was&&m.from.location===L.MZONE&&m.to.location===L.MZONE)this.tributeSets.add(next);
   if(m.from.location===L.MZONE&&(reason&2)&&(reason&16))this.releasedForSet[m.from.controller]++;
  }
  if(m.type===M.SWAP){const a=this.fieldKnowledge.key(m.card1),b=this.fieldKnowledge.key(m.card2),wasA=this.tributeSets.has(a),wasB=this.tributeSets.has(b);this.tributeSets.delete(a);this.tributeSets.delete(b);if(wasA)this.tributeSets.add(b);if(wasB)this.tributeSets.add(a);}
  if(m.type===M.SHUFFLE_SET_CARD){for(const c of m.cards||[]){this.tributeSets.delete(this.fieldKnowledge.key(c.from));this.tributeSets.delete(this.fieldKnowledge.key(c.to));}}
  if(m.type===M.SET&&m.location===L.MZONE){if(this.releasedForSet[m.controller])this.tributeSets.add(this.fieldKnowledge.key(m));this.releasedForSet[m.controller]=0;}
  if([M.SUMMONING,M.SPSUMMONING,M.CHAIN_END].includes(m.type))this.releasedForSet=[0,0];
  const feedback=effectMessageCue(this,m,M,L);if(feedback){this.visuals.push(feedback);this.logs.unshift((feedback.player===0?"You · ":feedback.player===1?"Opponent · ":"")+feedback.text);}
  if(m.type===M.NEW_TURN){this.limiterDoom=new Set();this.piercingTurn={};this.piercingCards=new Map();}
  if(m.type===M.MOVE&&m.from?.location===L.MZONE){this.piercingCards?.delete(`${m.from.controller}:${m.from.sequence}`);this.attackLocks?.delete(`${m.from.controller}:${m.from.sequence}`);this.limiterDoom?.delete(`${m.from.controller}:${m.from.sequence}`);}
  if(m.type===M.CHAIN_SOLVED){const link=this.activeChain?.find(c=>c.link===m.chain_size);if(link&&!link.inactive){const n=this.name(link.code);if(n==='Meteorain')(this.piercingTurn??={})[link.player]=this.turn;if(n==='Exarion Universe')(this.piercingCards??=new Map()).set(`${link.player}:${link.sequence}`,link.code);if(['Spellbinding Circle','Nightmare Wheel','Shadow Spell','Fiendish Chain'].includes(n))for(const t of link.targets||[])if(t.location===L.MZONE)this.attackLocks.set(`${t.controller}:${t.sequence}`,{code:link.code,controller:link.player,location:link.location,sequence:link.sequence});if(n==='Limiter Removal')for(const c of this.query(link.player,L.MZONE).filter(Boolean))if(this.cards.get(c.code)?.race==='Machine')this.limiterDoom.add(`${link.player}:${c.sequence}`);}}

  if(m.type===M.MOVE&&m.from?.location===L.SZONE)for(const [target,source] of this.attackLocks||[])if(source.controller===m.from.controller&&source.sequence===m.from.sequence)this.attackLocks.delete(target);
  // Read the core's public turn-counter hints rather than guessing elapsed turns.
  this.cardTurnCounts??=new Map();
  const counterKey=c=>`${c.controller}:${c.location}:${c.sequence}`;
  this.declaredRaces??=new Map();
  if(m.type===M.CARD_HINT&&m.card_hint===3)this.declaredRaces.set(counterKey(m),BigInt(m.description));
  if(m.type===M.MOVE){const race=this.declaredRaces.get(counterKey(m.from));this.declaredRaces.delete(counterKey(m.from));this.declaredRaces.delete(counterKey(m.to));if(race!==undefined&&m.from.location===L.MZONE&&m.to.location===L.MZONE&&!(m.to.position&10))this.declaredRaces.set(counterKey(m.to),race);}
  if(m.type===M.POS_CHANGE&&((m.position??m.current_position)&10))this.declaredRaces.delete(counterKey(m));
  if(m.type===M.SWAP){const a=counterKey(m.card1),b=counterKey(m.card2),ra=this.declaredRaces.get(a),rb=this.declaredRaces.get(b);this.declaredRaces.delete(a);this.declaredRaces.delete(b);if(ra!==undefined)this.declaredRaces.set(b,ra);if(rb!==undefined)this.declaredRaces.set(a,rb);}
  if(m.type===M.CARD_HINT&&m.card_hint===1)this.cardTurnCounts.set(counterKey(m),Number(m.description));
  if(m.type===M.MOVE){
   const count=this.cardTurnCounts.get(counterKey(m.from));
   this.cardTurnCounts.delete(counterKey(m.from));this.cardTurnCounts.delete(counterKey(m.to));
   if(count!==undefined&&m.from.location===L.SZONE&&m.to.location===L.SZONE)this.cardTurnCounts.set(counterKey(m.to),count);
  }
  if(m.type===M.POS_CHANGE&&(m.position??m.current_position)&10)this.cardTurnCounts.delete(counterKey(m));
  // Time Machine restores control to the side that lost the monster, not its owner.
  if([M.NEW_TURN,M.NEW_PHASE,M.ATTACK,M.DAMAGE_STEP_START].includes(m.type))this.battleLosses=[];
  if(m.type===M.MOVE&&this.inDamageStep&&m.from?.location===L.MZONE&&m.to?.location===L.GRAVE)
   (this.battleLosses??=[]).push({code:m.card,controller:m.from.controller,graveController:m.to.controller});
  this.fieldKnowledge.message(m,M,L);
  this.revealedHands??=[{},{}];
  if([M.CONFIRM_DECKTOP,M.CONFIRM_EXTRATOP].includes(m.type)){
   const cards=(m.cards||[]).filter(c=>c.code).map(c=>({...c}));
   if(cards.length){const source=this.name(this.resolvingChain||this.effect?.code);const text=(source?source+' — ':'')+'Excavated cards (top first)';this.logs.unshift(text+': '+cards.map(c=>this.name(c.code)).join(', '));this.visuals.push({kind:'reveal',public:true,excavation:true,cards,text});}
  }
  if(m.type===M.CONFIRM_CARDS){
   for(const c of m.cards||[])if(c.location===L.HAND&&c.code)this.revealedHands[m.player][c.controller+':'+c.sequence]=c.code;
   const ordeal=this.name(this.effect?.code)==='Ordeal of a Traveler';
   const cards=(m.cards||[]).filter(c=>c.location===L.HAND&&(ordeal||c.controller!==0)&&c.code);
   if(ordeal&&cards.length){const text='Ordeal revealed '+cards.map(c=>this.name(c.code)).join(', ');this.logs.unshift(text);this.visuals.push({kind:'reveal',cards:cards.map(c=>({...c})),text});}
   if(!ordeal&&m.player===0){const shown=(m.cards||[]).filter(c=>c.code);if(shown.length)this.visuals.push({kind:'reveal',audience:0,cards:shown.map(c=>({...c})),text:(this.name(this.effect?.code)||'Card effect')+' — revealed cards'});}
  }
  if([M.CHAIN_END,M.NEW_TURN].includes(m.type))this.revealedHands=[{},{}];
  if(m.type===M.SHUFFLE_HAND||m.type===M.MOVE&&[m.from?.location,m.to?.location].includes(L.HAND)){
   const sides=m.type===M.SHUFFLE_HAND?[m.player]:[m.from?.controller,m.to?.controller];
   for(const known of this.revealedHands)for(const key of Object.keys(known))if(sides.includes(Number(key.split(':')[0])))delete known[key];
  }

  if([M.NEW_TURN,M.NEW_PHASE,M.CHAIN_END].includes(m.type))this.lastSummoned=[];
  if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type))this.summoningPlayer=m.controller;
  if([M.SUMMONED,M.SPSUMMONED,M.FLIPSUMMONED,M.NEW_TURN,M.CHAIN_END].includes(m.type))this.summoningPlayer=null;
  if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type))this.lastSummoned=[{controller:m.controller,location:m.location,sequence:m.sequence}];
  if(m.type===M.DAMAGE_STEP_START)this.inDamageStep=true;
  if([M.DAMAGE_STEP_END,M.NEW_TURN,M.NEW_PHASE,M.ATTACK_DISABLED].includes(m.type))this.inDamageStep=false;

  if(m.type===M.HINT&&m.hint_type===2){const v=Number(m.hint),group=Math.floor(v/100000000),value=v%100000000;
   if(group===10||group===11)this.events.push({kind:'loss_source',card:value,battle:group===11});
   if(group>=14&&group<=17)for(let i=0;i<Math.min(value,100);i++)this.events.push({kind:({14:'battle_destroy',15:'destroy',16:'banish',17:'tribute_summons'})[group]});
   if(group===12)this.events.push({kind:'loss_damage',amount:value});
   if(group===13){this.resolutionSource=value;this.events.push({kind:'resolution',card:value});}
  }
  if(m.type===M.DAMAGE&&m.player===0){this.events.push({kind:'loss_damage',amount:m.amount});if(this.resolutionSource)this.events.push({kind:'loss_source',card:this.resolutionSource,battle:false});}
  if(m.type===M.NEW_PHASE)this.events.push({kind:'loss_source',card:0,battle:false});
  if(m.type===M.NEW_TURN){this.battleProtected=[false,false];this.attackCard=null;this.attackTarget=null;this.battleOpen=false;this.chainedSinceAttack=false;}
  if(m.type===M.ATTACK){this.attackCard=m.card;this.attackTarget=m.target;}
  if([M.NEW_PHASE,M.DAMAGE_STEP_END,M.ATTACK_DISABLED].includes(m.type)){this.attackCard=null;this.attackTarget=null;}
  if(m.type===M.ATTACK&&this.player===0){this.battleOpen=true;this.chainedSinceAttack=false;}
  if(m.type===M.CHAINING)this.chainedSinceAttack=true;
  if(m.type===M.CHAIN_END)this.chainedSinceAttack=false;
  if(m.type===M.NEW_PHASE){this.battleOpen=false;this.chainedSinceAttack=false;}
  if(m.type===M.CHAIN_SOLVED){const x=this.activeChain?.find(c=>c.link===m.chain_size);if(x&&!x.inactive&&this.name(x.code)==='Cybernetic Fusion Support')(this.fusionSupport??={})[x.player]=this.turn;if(x&&!x.inactive&&['Waboku','Threatening Roar','Negate Attack'].includes(this.name(x.code)))(this.battleProtected??=[false,false])[x.player]=true;}
  if(m.type===M.HINT&&Number(m.hint)===900000002)this.events.push({kind:'tribute_dividend'});
  if(m.type===M.HINT&&Number(m.hint)===900000001)this.events.push({kind:'relic_used',relic:'phoenix_rebirth'});
  if(m.type===M.CHAINING){this.chainDepth=m.chain_size||1;(this.activeChain??=[]).push({code:m.code,player:m.triggering_controller??m.player??m.controller,targets:[],location:m.location,sequence:m.sequence,link:m.chain_size||1});}
  if(m.type===M.BECOME_TARGET&&this.activeChain?.length)this.activeChain[this.activeChain.length-1].targets.push(...m.cards);
  if([M.CHAIN_SOLVING,M.CHAIN_NEGATED,M.CHAIN_DISABLED].includes(m.type)){const link=this.activeChain?.find(c=>c.link===m.chain_size);if(link)this.visuals.push({kind:'chain',stage:m.type===M.CHAIN_SOLVING?'resolve':'negated',code:link.code,link:link.link,text:this.name(link.code)});}
  if([M.CHAIN_NEGATED,M.CHAIN_DISABLED,M.CHAIN_SOLVED].includes(m.type)){
   const link=this.activeChain?.find(c=>c.link===m.chain_size);if(link)link.inactive=true;
  }
  if(m.type===M.CHAIN_END){this.activeChain=[];this.chainDepth=0;this.effect=null;this.materialSubject=null;}
  if(m.type===M.HINT&&m.hint_type===3)this.selectionHint=Number(m.hint);
  if(m.type===M.DAMAGE&&m.player===1&&m.amount>0&&m.amount===this.lp[1])this.events.push({kind:'exact_lethal'});
  if(m.type===M.TOSS_DICE)this.visuals.push({kind:'dice',results:m.results,player:m.player});
  if(m.type===M.TOSS_COIN)this.visuals.push({kind:'coin',results:m.results,player:m.player});
  if(m.type===M.POS_CHANGE)this.visuals.push({kind:'set',card:{controller:m.controller,location:m.location,sequence:m.sequence},text:(m.controller===0?'Your monster':'Opponent’s monster')+' changes position'});
  if(m.type===M.SET)this.visuals.push({kind:'set',card:{controller:m.controller,location:m.location,sequence:m.sequence},text:m.controller===0?'You set a card':'Opponent sets a card'});
  if(m.type===M.MOVE&&m.from.location&&m.to.location)this.visuals.push({kind:'move',reason:m.reason??(m.wire?.length>=29?new DataView(Uint8Array.from(m.wire).buffer).getUint32(25,true):0),from:m.from,to:m.to,code:(m.from.controller===0||m.to.controller===0||((m.from.location&12)&&(m.from.position&5))||((m.to.location&12)&&(m.to.position&5))||m.to.location===L.GRAVE)?m.card:0});
  if(m.type===M.DRAW)this.visuals.push({kind:'draw',from:{controller:m.player,location:L.DECK},to:{controller:m.player,location:L.HAND},code:0});
  if(m.type===M.NEW_TURN)this.visuals.push({kind:'turn',player:m.player});
  if(m.type===M.NEW_PHASE)this.visuals.push({kind:'phase',phase:m.phase});
  if(m.type===M.ATTACK)this.visuals.push({kind:'attack',card:m.card,target:m.target,text:m.target?'ATTACK!':'DIRECT ATTACK!'});
  if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type))this.visuals.push({kind:'summon',card:{controller:m.controller,location:m.location,sequence:m.sequence},text:(m.controller===0?'You summon ':'Opponent summons ')+this.name(m.code)});
  if(m.type===M.CHAINING)this.visuals.push({kind:'chain',stage:'activate',code:m.code,link:m.chain_size||1,text:this.name(m.code)});
  if([M.DAMAGE,M.RECOVER,M.PAY_LPCOST].includes(m.type))this.visuals.push({kind:'lp',player:m.player,amount:m.amount*(m.type===M.RECOVER?1:-1)});
  if(m.type===M.LPUPDATE&&m.lp!==this.lp[m.player])this.visuals.push({kind:'lp',player:m.player,amount:m.lp-this.lp[m.player]});
  const add=(kind,extra={})=>this.events.push({kind,...extra});
  if(m.type===M.NEW_TURN)this.peak.turns++;
  if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type)&&m.controller===0)this.pendingSummons.push({kind:'summon',card:m.code,method:m.type===M.SUMMONING?'normal':m.type===M.SPSUMMONING?'special':'flip'});
  if([M.SUMMONED,M.SPSUMMONED,M.FLIPSUMMONED].includes(m.type)){this.events.push(...this.pendingSummons);this.pendingSummons=[];}
  if(m.type===M.MOVE&&m.to?.location!==L.MZONE)this.pendingSummons=this.pendingSummons.filter(c=>c.card!==m.card);
  if(m.type===M.CHAINING){this.effect={code:m.code,player:m.controller??m.player};if(this.effect.player===0)add('activate',{card:m.code})}
  if(m.type===M.DAMAGE)add(m.player===1?'damage':'damage_taken',{amount:m.amount});
  if(m.type===M.DAMAGE&&m.player===1&&!(this.battleOpen&&!this.chainedSinceAttack))this.events.push({kind:'effect_damage',amount:m.amount});
  if(m.type===M.RECOVER&&m.player===0)add('recover',{amount:m.amount});
  if(m.type===M.DRAW&&m.player===0)add('draw',{amount:m.drawn?.length??m.cards?.length??m.count??1});
  if(m.type===M.SET&&m.controller===0)add('set',{card:m.code});
 }
 snapshot(){const s=super.snapshot();
  const currentStats=new Map(),changes=[],changedCards=[];
  for(const side of s.players)for(const c of side.monsters)if(c&&(c.position&5)){
   const key=`${c.controller}:${c.location}:${c.sequence}:${c.code}`,old=this.feedbackStats?.get(key);currentStats.set(key,{attack:c.attack,defense:c.defense,level:c.level});
   if(old){const diff=[['attack','ATK'],['defense','DEF'],['level','Level']].filter(([k])=>old[k]!==undefined&&c[k]!==undefined&&old[k]!==c[k]).map(([k,label])=>`${label} ${old[k]} → ${c[k]}`);if(diff.length){changes.push(this.name(c.code)+': '+diff.join(', '));changedCards.push({...c});}}
  }
  this.feedbackStats=currentStats;
  if(changes.length){this.visuals.push({kind:'effect-action',text:changes.join(' · '),cards:changedCards});this.logs.unshift(changes.join(' · '));}
for(const side of s.players)for(const c of [...side.monsters,...side.spells])if(c)c.turnCount=this.cardTurnCounts?.get(`${c.controller}:${c.location}:${c.sequence}`)??(c.location===L.SZONE&&(c.position&5)&&['Swords of Revealing Light','Wave-Motion Cannon',"Nightmare's Steelcage"].includes(this.name(c.code))?0:undefined);const own=s.players[0].monsters.filter(c=>c&&(c.position&5));
  this.peak.peak_field=Math.max(this.peak.peak_field,own.length);
  for(const c of own){this.peak.peak_attack=Math.max(this.peak.peak_attack,c.attack||0);this.peak.peak_defense=Math.max(this.peak.peak_defense,c.defense||0)}return s;
 }
 // A cancelled legal-target prompt must not restart the same attack on an unchanged board.
 attackBoardKey(){return JSON.stringify([this.turn,this.phase,this.lp,[0,1].map(p=>[L.MZONE,L.SZONE].map(loc=>this.query(p,loc).map(c=>c?[c.code,c.position,c.attack,c.defense,c.status,c.equipTarget,c.counters]:null)))]);}
 attackWasCancelled(p,c){const previous=this.cancelledAttacks?.get(p+':'+c.sequence);return previous!==undefined&&previous===this.attackBoardKey();}
 respond(r){const m=this.pending;
  if(m&&!(m.type===M.SELECT_OPTION&&this.name(this.effect?.code)==='Ordeal of a Traveler')){const feedback=effectChoiceCue(this,m,r,M);if(feedback){this.visuals.push(feedback);this.logs.unshift((m.player===0?'You · ':'Opponent · ')+feedback.text);}}
  if(m?.type===M.SELECT_CHAIN&&r.index!==null&&r.index!==undefined)this.effect={code:m.selects[r.index]?.code,player:m.player};
  if(m?.type===M.SELECT_EFFECTYN&&r.yes)this.effect={code:m.code,player:m.player};
  if(m?.type===M.SELECT_OPTION&&this.name(this.effect?.code)==='Ordeal of a Traveler'){
   const text=(m.player===0?'You':'Opponent')+' guessed '+(['Monster','Spell','Trap'][r.index]||this.description(m.options[r.index]));
   this.logs.unshift(text);this.visuals.push({kind:'announcement',text});
  }
  if(m?.type===M.SELECT_IDLECMD&&[I.SELECT_SUMMON,I.SELECT_SPECIAL_SUMMON,I.SELECT_MONSTER_SET].includes(r.action)){const list=r.action===I.SELECT_SUMMON?m.summons:r.action===I.SELECT_SPECIAL_SUMMON?m.special_summons:m.monster_sets;this.materialSubject=list[r.index]?.code;}
  if(m?.type===M.SELECT_CARD&&r.indicies?.length===1){const selected=m.selects[r.indicies[0]];if((this.data[selected?.code]?.type||0)&0xc0)this.materialSubject=selected.code;}

  if(m?.type===M.SELECT_IDLECMD&&r.action===I.SELECT_ACTIVATE)this.effect={code:m.activates[r.index]?.code,player:m.player};
  if(m?.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_BATTLE){const c=m.attacks[r.index];this.attacker={...c,player:m.player,canStop:!!(m.to_m2||m.to_ep),attack:this.query(m.player,L.MZONE)[c.sequence]?.attack||0};if(m.player===0)this.events.push({kind:'attack',card:c.code})}
  if(m?.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_CHAIN)this.effect={code:m.chains[r.index]?.code,player:m.player};
  if(m?.type===M.SELECT_CARD&&r.indicies===null&&this.selectionHint===549&&this.attacker?.player===m.player&&m.selects.every(c=>c.controller!==m.player&&c.location===L.MZONE))this.cancelledAttacks.set(m.player+':'+this.attacker.sequence,this.attackBoardKey());
  this.selectionHint=null;return super.respond(r);
 }
 summary(){return [...this.events,{kind:'duel_metrics',grave_monsters:this.query(0,L.GRAVE).filter(c=>c&&(this.data[c.code]?.type&1)).length,...this.peak,banished_count:this.core.duelQueryCount(this.h,0,L.REMOVED)+this.core.duelQueryCount(this.h,1,L.REMOVED)}]}
 auto(m=this.pending){
  this.fieldKnowledge.observe(m.player,(p,l)=>this.query(p,l),L);
  const p=m.player,own=this.query(p,L.MZONE).filter(Boolean),enemy=this.query(1-p,L.MZONE).filter(Boolean);
  const stat=c=>this.data[c.code]||{},live=c=>c.location===L.MZONE?this.query(c.controller??p,L.MZONE)[c.sequence]:null,atk=c=>live(c)?.attack??c.attack??stat(c).attack??0,def=c=>live(c)?.defense??c.defense??stat(c).defense??0;
  const visible=c=>!!(c.position&5),strength=c=>visible(c)?(c.position&1?atk(c):def(c)):(this.knownFieldCard(p,c)?this.data[this.knownFieldCard(p,c)]?.defense??900:this.unknownDefense(c));
  const threat=Math.max(0,...enemy.map(strength));
  const fodder=own.map(c=>Math.max(0,atk(c))+(stat(c).type&0x4000?-1500:0)).sort((a,b)=>a-b);
  const worthwhile=(c,setting=false)=>{const limit=smart.tributeWorth(c,setting);if(limit!==null)return limit;const level=this.cards.get(c.code)?.level||0,n=level>6?2:level>4?1:0;return !n||own.length<n||smart.projectedAttack(c)>fodder.slice(0,n).reduce((a,b)=>a+b,0)||smart.projectedAttack(c)>threat&&own.every(x=>atk(x)<=threat)};
  const safeCost=c=>{const cost=/pay ([\d,]+) (?:LP|Life Points)/i.exec(this.cards.get(c.code)?.desc||'');return !cost||this.lp[p]-Number(cost[1].replaceAll(',',''))>Math.max(500,enemy.length&&!own.length?threat:0)};
  const desc=c=>this.cards.get(c.code)?.desc?.toLowerCase()||'';
  const text=this.cards.get(this.effect?.code)?.desc?.toLowerCase()||'';
  const hostileEquip=['Snatch Steal','Mask of the Accursed'].includes(this.name(this.effect?.code));
  const benefit=!hostileEquip&&/equip|gains? \d+ atk|increase.*atk|recover|increase.*def/.test(text)&&!/destroy.*equip/.test(text);
  const smart=smartContext(this,p,L,m);
  // Equal positive ATK destroys both Attack Position monsters; equal DEF does not.
  const tradeTarget=(power,t,attacker=null)=>power>0&&visible(t)&&(t.position&1)&&power===(attacker?smart.combatPower(t,attacker):atk(t))&&!this.battleProtected?.[1-p]&&!/cannot be destroyed (?:by|as a result of) battle/i.test(this.cards.get(t.code)?.desc||'');
  const idle=(action,index=null)=>({type:R.SELECT_IDLECMD,action,index});
  if(m.type===M.SELECT_IDLECMD){
   if(m.to_bp&&!enemy.length&&own.filter(c=>(c.position&1)&&smart.attackAllowed(c,true)).reduce((n,c)=>n+smart.battleDamage(atk(c)),0)>=this.lp[1-p])return idle(I.TO_BP);
   const activate=m.activates.map((c,index)=>({c,index,name:this.name(c.code),text:desc(c)})).filter(x=>safeCost(x.c));
   const planned=activate.map(x=>({...x,score:smart.activation(x.c,false)})).filter(x=>x.score!==null&&x.score>=80).sort((a,b)=>b.score-a.score);
   if(planned.length)return idle(I.SELECT_ACTIVATE,planned[0].index);
   const clear=activate.find(x=>smart.activation(x.c,false)!==-1&&['Raigeki','Harpie\'s Feather Duster','Dark Hole','Heavy Storm'].includes(x.name)&&(x.name.includes('Duster')?this.query(1-p,L.SZONE).some(Boolean):x.name==='Heavy Storm'?this.query(1-p,L.SZONE).filter(Boolean).length>this.query(p,L.SZONE).filter(Boolean).length:enemy.length&&(x.name!=='Dark Hole'||enemy.reduce((s,c)=>s+strength(c),0)>own.reduce((s,c)=>s+atk(c),0))));
   if(clear)return idle(I.SELECT_ACTIVATE,clear.index);
   const helpful=activate.find(x=>{
    const value=smart.activation(x.c,false);if(value!==null)return value>=0;
    if(x.name==='Breaker the Magical Warrior')return this.query(1-p,L.SZONE).some(Boolean);
    if(x.name==='Magical Scientist')return own.length<4&&enemy.length>0&&this.lp[p]>2500;
    if(x.name==='Nobleman of Crossout')return enemy.some(c=>!visible(c));
    if(x.name==='Snatch Steal'||x.name==='Change of Heart')return enemy.some(visible);
    if(x.name==='Heavy Storm')return this.query(1-p,L.SZONE).filter(Boolean).length>this.query(p,L.SZONE).filter(Boolean).length;
    if(x.name==='Mystical Space Typhoon')return this.query(1-p,L.SZONE).some(Boolean);
    if(['Fissure','Smashing Ground','Swords of Revealing Light'].includes(x.name))return enemy.length>0;
    if(/destroy|tribute.*monster.*you control/.test(x.text))return false;
    if(/draw \d+ card/.test(x.text)&&!/discard|banish|pay/.test(x.text))return this.core.duelQueryCount(this.h,p,L.DECK)>3;
    if(/gain \d+ life|recover|increase your life/.test(x.text))return this.lp[p]<8000;
    if(/equip|gains? \d+ atk/.test(x.text))return own.some(visible);
    if(['Monster Reborn','Premature Burial','Call of the Haunted'].includes(x.name))return this.query(p,L.GRAVE).some(c=>c&&atk(c)>threat)||this.query(1-p,L.GRAVE).some(c=>c&&atk(c)>threat);
    if(['Fissure','Smashing Ground','Swords of Revealing Light'].includes(x.name))return enemy.length>0;
    return false;
   });
   if(helpful)return idle(I.SELECT_ACTIVATE,helpful.index);
   const ranked=list=>list.map((c,i)=>({c,i})).sort((a,b)=>atk(b.c)-atk(a.c));
   const firstMove=own.length===0&&enemy.length===0&&this.query(p,L.GRAVE).filter(Boolean).length===0;
   const usefulAttacker=c=>!smart.attackBlocked(c,p,true)&&smart.projectedAttack(c)>0&&(!enemy.length||enemy.some(t=>smart.projectedAttack(c)>strength(t))||smart.clearedLane(c));
   const special=ranked(m.special_summons).filter(x=>smart.specialOk(x.c)!==false).find(x=>usefulAttacker(x.c)||smart.summonUtility(x.c));if(special)return idle(I.SELECT_SPECIAL_SUMMON,special.i);
   const flip=m.pos_changes.findIndex(c=>{if(exodiaPieces.has(c.code))return false;const field=this.query(p,L.MZONE)[c.sequence];const name=this.name(c.code);if(field&&visible(field)&&smart.attackBlocked(field,p))return false;const useful=name==='Magician of Faith'?this.query(p,L.GRAVE).some(c=>stat(c).type&2):name==='Mask of Darkness'?this.query(p,L.GRAVE).some(c=>stat(c).type&4):['Man-Eater Bug','Penguin Soldier'].includes(name)?enemy.length>0:name==='Morphing Jar'?(this.query(p,L.HAND).length<3&&this.query(p,L.DECK).length>5):false;const extra=smart.flipUseful(name,field);return field&&!(field.position&1)&&smart.saferPosition(field)!==false&&extra!==false&&(useful||extra===true||m.to_bp&&!smart.attackBlocked(field,p)&&(atk(field)>threat||smart.clearedLane(field)))});if(flip>=0)return idle(I.SELECT_POS_CHANGE,flip);
   // Compare all legal defenders before choosing an individually safer ATK summon.
   // A different monster in DEF may be the only line that survives piercing.
   if(this.cpuReviewRules?.survivalGuard!==false&&enemy.filter(c=>visible(c)&&(c.position&1)).reduce((n,c)=>n+atk(c),0)>=this.lp[p]){
    const attacks=m.summons.filter(c=>!smart.preferSet(c)&&smart.summonScore(c)>=0&&worthwhile(c));
    const safe=m.monster_sets.map((c,index)=>({c,index,damage:smart.incomingDamage(c,false)})).filter(x=>!exodiaPieces.has(x.c.code)&&worthwhile(x.c,true)&&x.damage<this.lp[p]).sort((a,b)=>a.damage-b.damage);
    if(safe.length&&attacks.length&&attacks.every(c=>!usefulAttacker(c)&&!smart.summonUtility(c)&&smart.incomingDamage(c,true)>=this.lp[p]))return idle(I.SELECT_MONSTER_SET,safe[0].index);
   }
   const summon=ranked(m.summons).filter(x=>(!(stat(x.c).type&0x200000)||smart.saferPosition(x.c)===true)&&!smart.preferSet(x.c)&&smart.summonScore(x.c)>=0).sort((a,b)=>(smart.summonScore(b.c)-smart.summonScore(a.c))||(atk(b.c)-atk(a.c))).find(x=>(usefulAttacker(x.c)||smart.summonUtility(x.c)||smart.saferPosition(x.c)===true)&&worthwhile(x.c));if(summon&&(!firstMove||smart.projectedAttack(summon.c)>1500))return idle(I.SELECT_SUMMON,summon.i);

   if(m.monster_sets.some(c=>!exodiaPieces.has(c.code)&&smart.saferPosition(c)!==true&&worthwhile(c,true))){const index=m.monster_sets.map((c,i)=>({c,i})).filter(x=>!exodiaPieces.has(x.c.code)&&smart.saferPosition(x.c)!==true&&worthwhile(x.c,true)).sort((a,b)=>((smart.preferSet(b.c)?1:0)-(smart.preferSet(a.c)?1:0))||((def(b.c)+(stat(b.c).type&0x200000?600:0))-(def(a.c)+(stat(a.c).type&0x200000?600:0))))[0].i;const candidate=m.monster_sets[index];if(this.cpuReviewRules?.reflectBounder!==false&&this.name(candidate.code)==='Reflect Bounder'&&smart.effectsEnabled(p)&&!smart.attackBlocked(candidate,p,true)&&smart.incomingDamage(candidate,true)<this.lp[p]){const summonIndex=m.summons.findIndex(c=>c.code===candidate.code&&c.sequence===candidate.sequence);if(summonIndex>=0)return idle(I.SELECT_SUMMON,summonIndex)}return idle(I.SELECT_MONSTER_SET,index)}
   // Keep one main back-row slot free for spells from hand; the Field Zone is separate.
   const backrowCount=this.query(p,L.SZONE).filter((c,i)=>c&&(c.sequence??i)<5).length;
   const set=backrowCount<(this.aiModifiers?.spellTrapZones??5)-1?m.spell_sets.findIndex(c=>smart.setAllowed(c)&&(stat(c).type&4||stat(c).type&0x10000)):-1;if(set>=0)return idle(I.SELECT_SPELL_SET,set);
   const defend=m.pos_changes.findIndex(c=>{const f=this.query(p,L.MZONE)[c.sequence];return f&&(f.position&1)&&smart.saferPosition(f)!==true&&((this.name(f.code)==='Spirit Reaper'&&!smart.reaperDirectReady(f))||(smart.attackBlocked(f,p)&&def(f)>atk(f))||enemy.some(x=>(x.position&1)&&atk(x)>atk(f)))&&(this.name(f.code)==='Spirit Reaper'||!(m.to_bp&&!smart.attackBlocked(f,p)&&enemy.some(x=>atk(f)>strength(x))));});
   if(defend>=0)return idle(I.SELECT_POS_CHANGE,defend);
   return idle(m.to_bp?I.TO_BP:I.TO_EP);
  }
  if(m.type===M.SELECT_BATTLECMD){if(p===1&&this.aiModifiers?.expertOpponent){const plan=planBattle(this,p,L,m,smart);if(plan&&!this.attackWasCancelled(p,m.attacks[plan.index])){this.expertTarget={...plan,turn:this.turn};return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:plan.index}}}if((m.to_m2||m.to_ep)&&this.battleProtected?.[1-p]&&!enemy.some(t=>!visible(t)))return {type:R.SELECT_BATTLECMD,action:m.to_m2?B.TO_M2:B.TO_EP,index:null};const boosts=(m.chains||[]).map((c,index)=>({index,score:smart.activation(c,true)})).filter(x=>x.score!==null&&x.score>=0).sort((a,b)=>b.score-a.score);if(boosts.length)return {type:R.SELECT_BATTLECMD,action:B.SELECT_CHAIN,index:boosts[0].index};let best=null;const oppDeck=this.query(1-p,L.DECK).length;for(let i=0;i<m.attacks.length;i++){const c=m.attacks[i];if((m.to_m2||m.to_ep)&&this.attackWasCancelled(p,c))continue;const a=own.find(x=>x.sequence===c.sequence)||this.query(p,L.MZONE)[c.sequence],power=smart.combatPower(a||c),an=a||c,nm=this.name(an.code);const direct=!this.battleProtected?.[1-p]&&(c.can_direct||!enemy.length);if(!smart.attackAllowed(an,direct))continue;const noPoke=(nm==='Goblin Attack Force'||nm==='Panther Warrior')||(nm==='The Bistro Butcher'&&oppDeck>2);let score=direct?smart.battleDamage(power)+(smart.battleDamage(power)>=this.lp[1-p]?100000:0):-Infinity;let bt=null,bd=0,cands=[];if(direct)bd=smart.battleDamage(power);for(const t of enemy){if(this.battleProtected?.[1-p]&&visible(t))continue;const v=strength(t);if(!(power>v))continue;const atkPos=visible(t)&&(t.position&1);const over=atkPos?power-v:0;const edef=t.defense??this.data[t.code]?.defense??0;const dmg=smart.battleDamage(atkPos?over:((!atkPos&&smart.pierce(an))?Math.max(0,power-edef):0));if(dmg<=0&&noPoke)continue;const cand=2000+v+over;cands.push({cand,t,dmg});if(cand>score){score=cand;bt=t;bd=dmg;}}let fb=false;if(score===-Infinity&&(nm==='Goblin Attack Force'||nm==='Panther Warrior')){for(const t of enemy){if(this.battleProtected?.[1-p]&&visible(t))continue;const v2=strength(t);if(power>v2){const cand=2000+v2;if(cand>score){score=cand;bt=t;bd=0;fb=true;}}}}if(score>-Infinity){let adj=smart.attackScore(an,bt,{dmg:bd,deckOut:oppDeck<=2});if(adj<=-99999){cands.sort((a,b)=>b.cand-a.cand);let fixed=false;for(const q of cands){if(q.t===bt)continue;const a2=smart.attackScore(an,q.t,{dmg:q.dmg,deckOut:oppDeck<=2});if(a2<=-99999)continue;bt=q.t;bd=q.dmg;score=q.cand;adj=a2;fixed=true;break;}if(!fixed)continue;}score+=adj;const _pw=power,_bw=best?best.power:0;
    if(!best||score>best.score||(score===best.score&&((_pw>=1400)?(_bw<1400||_pw<_bw):(_bw<1400&&_pw>_bw))))best={score,i,power:_pw};}}
   // Only trade after exhausting every existing winning/direct attack option.
   if(!best){for(let i=0;i<m.attacks.length;i++){const c=m.attacks[i];if((m.to_m2||m.to_ep)&&this.attackWasCancelled(p,c))continue;const a=own.find(x=>x.sequence===c.sequence)||c,power=atk(a);if(!smart.attackAllowed(a,false))continue;if(enemy.some(t=>tradeTarget(power,t,a))&&(!best||power>best.power))best={i,power};}}
   if(!best&&!this.battleProtected?.[1-p]){for(let i=0;i<m.attacks.length;i++){const c=m.attacks[i];if((m.to_m2||m.to_ep)&&this.attackWasCancelled(p,c))continue;const a=own.find(x=>x.sequence===c.sequence)||c;if(!smart.attackAllowed(a,false))continue;const v=smart.suicideScore(a);if(v>0&&(!best||v>best.score))best={score:v,i,power:0};}}
   // Mandatory attacks (e.g. Diffusion Wave-Motion) cannot be declined even under Waboku.
   if(!best&&!m.to_m2&&!m.to_ep&&m.attacks.length){const forced=m.attacks.map((c,i)=>({i,power:atk(own.find(x=>x.sequence===c.sequence)||c)})).sort((a,b)=>b.power-a.power);best=forced[0];}
   return best?{type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:best.i}:{type:R.SELECT_BATTLECMD,action:m.to_m2?B.TO_M2:B.TO_EP,index:null}}
  if(m.type===M.SELECT_SUM)return {type:R.SELECT_SUM,indicies:this.sumSelection(m,c=>c.controller===p&&c.location===L.MZONE&&this.name(c.code)==='Relinquished')};
  if(m.type===M.SELECT_CARD||m.type===M.SELECT_TRIBUTE){
   const targetAttack=this.selectionHint===549&&this.attacker?.player===p&&m.selects.every(c=>c.controller!==p&&c.location===L.MZONE);
   const candidates=m.selects.map((c,i)=>({c,i,score:0}));
   const fxN=this.name(this.effect?.code);const _locs=m.selects.map(_s=>_s.location);const _tinfo={text:text,min:m.min,cands:m.selects,allGrave:_locs.length>0&&_locs.every(_l=>_l===L.GRAVE),maha:benefit&&m.selects.some(_s=>_s.controller===p&&_s.location===L.MZONE)};
    for(const x of candidates){const c=x.c,field=c.location===L.MZONE?this.query(c.controller,L.MZONE)[c.sequence]:null;
     // This outranks card-specific target heuristics and works without effect text
     // (e.g. hand-size discard), for discard and send-to-GY selections alike.
     if(c.controller===p&&c.location===L.HAND&&exodiaPieces.has(c.code)){x.score=-Infinity;continue;}

     if(targetAttack&&field&&this.expertTarget?.turn===this.turn&&this.expertTarget.attacker===this.attacker?.sequence&&this.expertTarget.target===c.sequence){x.score=10000000;continue;}
     if(targetAttack&&field&&visible(field)&&this.battleProtected?.[1-p]){x.score=-Infinity;continue;}
     if(targetAttack&&field&&tradeTarget(this.attacker.attack,field,this.query(p,L.MZONE)[this.attacker.sequence]||this.attacker)){x.score=5000+Math.min(4000,this.attacker.attack);continue;}
     if(targetAttack&&field){const attacker=this.query(p,L.MZONE)[this.attacker.sequence]||this.attacker,power=smart.combatPower(attacker,field),opposing=strength(field),damage=smart.battleDamage((field.position&1)?Math.max(0,power-opposing):smart.pierce(attacker)?Math.max(0,power-opposing):0);const adjustment=smart.attackScore(attacker,field,{dmg:damage});if(adjustment<=-99999||visible(field)&&power<opposing&&smart.suicideScore(attacker)<=0){x.score=-Infinity;continue;}}
     const _over=targetAttack?null:smart.targetScore(fxN,c,_tinfo);if(_over!==null&&_over!==undefined){x.score=_over;continue;}
    if(m.type===M.SELECT_TRIBUTE)x.score=-smart.expendable(field||c)+(stat(c).type&0x4000?5000:0)+smart.tributeAdj(field||c);
    else if(['Monster Reborn','Premature Burial','Call of the Haunted'].includes(this.name(this.effect?.code)))x.score=atk(c);
    else if(m.selects.every(x=>x.controller===p&&x.location===L.HAND)&&/discard/.test(text))x.score=-(smart.expendable(c)+(stat(c).type&6?1600:0)+(this.name(c.code).includes('Forbidden One')?100000:0));
    else if(targetAttack){const power=field?strength(field):900;const fAtk=field?(field.attack??this.data[field.code]?.attack??0):0,fDef=field?(field.defense??this.data[field.code]?.defense??0):0;if(field&&visible(field)&&this.battleProtected?.[1-p])x.score=-Infinity;else if(field&&visible(field)&&!(field.position&1)&&fAtk>this.attacker.attack&&fDef<this.attacker.attack)x.score=20000+fAtk;else x.score=power<this.attacker.attack?10000+power:-power}
    else if(benefit)x.score=(c.controller===p?10000:-10000)+atk(field||c);
    else if((hostileEquip||/destroy|banish|return.*hand|take control/.test(text))&&[L.MZONE,L.SZONE].includes(c.location))x.score=(c.controller!==p?10000:-10000)+(field&&visible(field)?atk(field):800);
    else x.score=atk(c)+(c.controller===p?200:0);
   }
   candidates.sort((a,b)=>b.score-a.score);if(targetAttack&&m.can_cancel&&this.attacker.canStop!==false&&candidates.every(x=>x.score===-Infinity))return {type:R.SELECT_CARD,indicies:null};let n=0,indicies=[];
   const held=new Set(this.query(p,L.HAND).filter(Boolean).map(c=>c.code));
   const recoverPieces=fxN==='Backup Soldier'?new Set(m.selects.filter(c=>c.controller===p&&c.location===L.GRAVE&&exodiaPieces.has(c.code)&&!held.has(c.code)).map(c=>c.code)).size:0;
   const need=fxN==='Penguin Soldier'?Math.max(m.min,Math.min(m.max,candidates.filter(x=>x.c.controller!==p&&x.c.location===L.MZONE&&x.score>0).length)):recoverPieces?Math.max(m.min,Math.min(m.max,recoverPieces)):fxN==='Soul Charge'&&m.selects.every(c=>c.controller===p&&c.location===L.GRAVE)?Math.max(m.min,Math.min(m.max,5-own.length,Math.max(0,Math.floor((this.lp[p]-2000)/1000)))):m.min;
   for(const x of candidates){if(n>=need)break;if(x.score===-Infinity&&n>=m.min)continue;indicies.push(x.i);n+=m.type===M.SELECT_TRIBUTE?(x.c.release_param||1):1}
   return {type:m.type===M.SELECT_TRIBUTE?R.SELECT_TRIBUTE:R.SELECT_CARD,indicies};
  }
  if(m.type===M.SELECT_CHAIN){
   const index=m.selects.findIndex(c=>{
    const name=this.name(c.code);
    const value=smart.activation(c,true);if(value!==null)return value>=0;
    if(['Mirror Force','Sakuretsu Armor','Trap Hole','Bottomless Trap Hole','Magic Jammer','Seven Tools of the Bandit'].includes(name))return true;
    if(name==='Torrential Tribute')return enemy.length>own.length;
    if(['Waboku','Negate Attack'].includes(name))return this.player!==p&&enemy.some(x=>visible(x)&&atk(x)>Math.max(0,...own.map(atk)));
    if(name==='Call of the Haunted')return own.length<5&&this.query(p,L.GRAVE).some(c=>c&&atk(c)>threat);
    return false;
   });
   if(index>=0){this.effect={code:m.selects[index].code,player:p};return {type:R.SELECT_CHAIN,index}}
   return {type:R.SELECT_CHAIN,index:m.forced?0:null};
  }
  if(m.type===M.ANNOUNCE_NUMBER&&this.name(this.effect?.code)==='Reasoning'&&this.cpuReviewRules?.reasoning!==false){
   // Reproducible guess from public state, never the opponent's hidden deck.
   let hash=(this.reasoningSeed^Math.imul(this.turn,2654435761)^Math.imul(this.query(p,L.DECK).length,2246822519)^Math.imul(this.query(1-p,L.GRAVE).length,3266489917))>>>0;
   hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);hash=(hash^(hash>>>16))>>>0;
   const other=m.options.map((v,i)=>({level:Number(v),i})).filter(x=>x.level>=1&&x.level<=8&&x.level!==4),four=m.options.findIndex(v=>Number(v)===4);
   const index=four>=0&&hash%10<3?four:other[Math.floor(hash/10)%other.length]?.i??Math.max(0,four);
   return {type:R.ANNOUNCE_NUMBER,value:index};
  }
  if(m.type===M.ANNOUNCE_CARD&&this.name(this.effect?.code)==='Question'){
   const allowed=this.choices(m),monsters=new Set(this.query(1-p,L.GRAVE).filter(c=>c&&(this.data[c.code]?.type&1)).map(c=>c.code));
   const guesses=allowed.filter(c=>monsters.has(c.code));
   if(guesses.length){const seed=((this.turn*1103515245+(++this.questionGuesses)*2654435761+this.query(p,L.DECK).length*12345)>>>0);return guesses[seed%guesses.length].response;}
  }
  if(m.type===M.SELECT_OPTION&&this.name(this.effect?.code)==='Ordeal of a Traveler'){
   // Guess from public hand information only; otherwise use a reproducible mixed guess.
   const publicCards=this.query(1-p,L.HAND).filter(c=>this.handRevealed(p,c));
   let index;if(publicCards.length){const counts=[1,2,4].map(t=>publicCards.filter(c=>this.data[c.code]?.type&t).length);index=counts.indexOf(Math.max(...counts));}
   else {const value=((this.turn*1103515245+this.query(p,L.DECK).length*12345+(this.orDealGuesses=(this.orDealGuesses||0)+1)*2654435761)>>>0);index=value%3;}
   return {type:R.SELECT_OPTION,index};
  }
  if(m.type===M.SELECT_OPTION&&this.name(this.effect?.code)==='Poison of the Old Man'){
   const heal=smart.healingAllowed(p)&&this.lp[1-p]>800&&(this.lp[p]<4000||own.some(c=>visible(c)&&this.name(c.code)==='Fire Princess'));
   const desired=BigInt(heal?0:1),code=8842266n;const index=m.options.findIndex(v=>BigInt(v)===(code<<20n)+desired||BigInt(v)===(code<<4n)+desired);
   if(index>=0)return {type:R.SELECT_OPTION,index};
  }
  if(m.type===M.SELECT_EFFECTYN){const value=smart.activation(m,true);return {type:R.SELECT_EFFECTYN,yes:value===null||value>=0}}
  if(m.type===M.SELECT_POSITION){const _pos=smart.position(this.name(m.code),{code:m.code,controller:p,location:L.HAND});const attack=_pos!==null?_pos:(this.cpuReviewRules?.positionForecast===false?(this.data[m.code]?.attack||0):smart.projectedAttack({code:m.code,controller:p,location:L.HAND}))>threat;const flip=_pos!==true&&!!(this.data[m.code]?.type&0x200000)&&(this.data[m.code]?.attack||0)<1000;const order=flip?[8,4,1,2]:attack?[1,4,8,2]:[4,8,1,2];return {type:R.SELECT_POSITION,position:order.find(x=>m.positions&x)}}
  return super.auto(m);
 }
}
