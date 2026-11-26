// Duel Bets (incremental minigame): the rules with no DOM — money, shop items and their prices, what each
// duel pays, the board/bracket ladder and the bracket standings. idle-bets.js draws it; the tests import it.
import {winKind} from './idle-bets-sim.js';

export const SAVE_KEY='ygo-duel-bets-v1';
export const BOARD_MAX=9,BRACKET_MAX=9,BRACKET_ROUNDS=4,ROSTER_SIZE=9;
// Test switch for this branch: the settings window offers "Infinite money". Turn off before merging.
export const DEV_TOOLS=true;

// The league each board slot plays in. Slot 2 is "The Big Leagues" by request.
// Brackets climb in prestige (and stakes) from the first to the ninth.
export const BRACKET_NAMES=['Card Shop Cup','City Qualifier','Underground Circuit','Invitational Open','Masters Series','Grand Prix',"Pharaoh's Tournament",'Shadow Games','Millennium Cup'];
export const bracketName=b=>BRACKET_NAMES[b-1]||'Bracket '+b;
export const LEAGUES=['Free Table','The Big Leagues','Pro Circuit','Regional Finals','National Finals','Continental Cup','Battle City','Duelist Kingdom','World Championship'];
// A board's level sets its stakes: board k before brackets, slot k + 2 per extra bracket after.
export const slotLevel=(slot,bracket=0)=>slot+(bracket>1?2*(bracket-1):0);
export const levelScale=level=>10**(level-1);
// Board 1: bet 1, win 5. Board k after that: bet 10^(k-1), win 10^k.
export const boardStake=level=>level<=1?1:10**(level-1);
export const boardPayout=level=>level<=1?5:10**level;
export const BOARD_RATIO=35;
export const boardOpenerCost=k=>100*BOARD_RATIO**(k-2);
export const bracketOpenerCost=b=>boardOpenerCost(9)*1000**(b-1);

// Shop items. kind: 'simple' prices grow slowly; 'drastic' ones (they lift every board) grow steeply;
// 'opener' is bought once. set = the board you must own before the item can appear; show = the milestone
// that reveals it. icon = a card id (assets/cards-thumb, falling back to assets/cards).
// A set is priced from the next opener: about 1/20 of what opens the following board.
// Scaling copied from Cookie Clicker / AdVenture Capitalist / Scritchy Scratchy (see docs/DUEL-BETS-BRANCH.md):
// - Income items: each level is worth 15% more than the one before (1 level ×1, 2 ×2.15, 5 ×6.7, 10 ×20) and its
//   price climbs ×1.3225 (1.15²), so every next level takes 15% longer to pay back — Cookie Clicker's 1.15 per building.
// - Boards: stakes ×10 per board (Scritchy Scratchy's first tickets: $10, $100, $1,000…); an opener costs BOARD_RATIO×
//   the one before, so each new board takes about 2.5× longer to pay back than the last (Cookie Clicker's buildings).
// - An item's income per level grows with its first price to the power 0.75 (Cookie Clicker: ~12× price for ~6× income).
export const GROWTH=1.15;
export const levelValue=l=>l>0?(GROWTH**l-1)/(GROWTH-1):0;
const EXP_ITEM=/^(fee_|char_|calls\d$|flawless$|longgame$|blitz$|deckout$|special$|purse$)/;
export const ITEM_GROWTH=1.15;// every income item's own price growth (× GROWTH for its rising reward)
// Global multipliers are priced like Cookie Clicker's upgrades: each step costs far more than the last.
// The tier bonuses (+% on everything a tier wins) ×2.3 per level; High Roller (×2 everything) ×1,000 per level.
const TIER_GROWTH=2.3;
export const growsExp=id=>EXP_ITEM.test(id);
export function speedAt(l){return Math.round((1+.1*l)*10)/10}
// Auto Bet's interval in seconds at a level: 5s, 20% faster per level, never under 0.5s.
// Auto Bet's wait on a betting screen: 10 s at level 1 (as long as the no-bet timer), 15% shorter each level, down to 0.5 s.
export function autoSeconds(l){return Math.max(.5,Math.round(10*.85**(l-1)*10)/10)}
const setBase=k=>k<=1?5:boardOpenerCost(k+1)/20;
const I=(id,set,name,icon,factor,growth,kind,extra={})=>({id,set,name,icon,base:setBase(set)*factor,growth,kind,max:Infinity,...extra});
const lvl=(s,id)=>s.items?.[id]||0;
const lv=(s,id)=>levelValue(lvl(s,id));// a level count as reward strength
// Lucky Calls is the very first purchase: it costs 1.
const calls=k=>I('calls'+k,k,k===1?'Lucky Calls':LEAGUES[k-1]+' Calls',74137509,k===1?.2:1,ITEM_GROWTH,'simple',{text:()=>`+${k===1?1:fmt(boardPayout(k)*.25)} per correct call on board ${k}.`,show:s=>k===1||s.boards>=k});
export const ITEMS=[
 calls(1),
 I('fee_summon',1,'Summon Fees',70781052,1,ITEM_GROWTH,'simple',{text:()=>'+0.1 for every summon.',show:()=>true}),
 I('fee_attack',1,'Battle Fees',5053103,1,ITEM_GROWTH,'simple',{text:()=>'+0.1 for every attack.',show:()=>true}),
 I('fee_spell',1,'Spell Fees',55144522,.8,ITEM_GROWTH,'simple',{text:()=>'+0.1 for every Spell activated.',show:()=>true}),
 I('fee_trap',1,'Trap Fees',44095762,.8,ITEM_GROWTH,'simple',{text:()=>'+0.2 for every Trap activated.',show:()=>true}),
 // Automation: Auto Bet backs a duelist on one waiting board every few seconds (faster per level);
 // Scouting Report makes it back the higher-tier CPU (a coin flip when both are the same tier).
 I('autobet',1,'Auto Bet',72302403,6,1.6,'simple',{max:20,text:l=>l?`Bets after ${autoSeconds(l)}s on the betting screen · next level ${autoSeconds(l+1)}s.`:`Bets on a random duelist once a board's betting screen has been up ${autoSeconds(1)}s.`,maxText:`Bets after ${autoSeconds(20)}s on the betting screen.`,show:s=>s.stats.bets>=1||lvl(s,'calls1')>=1}),
 I('scout',1,'Scouting Report',4031928,60,1,'opener',{max:1,keep:true,text:()=>'Auto Bet backs the higher-tier CPU (random when both are the same tier).',show:s=>lvl(s,'autobet')>=1}),
 // +0.1× per purchase (user, 2026-11-25), up to 8×; still the steepest-growing price in the opening shop.
 I('speed',1,'Duel Speed',16589042,10,1.8,'drastic',{max:70,text:l=>`Duels play at ${speedAt(l)}× now · next level ${speedAt(l+1)}×.`,maxText:'Duels play at 8× speed.',show:()=>true}),
 I('open2',1,'The Big Leagues',37313786,20,1,'opener',{max:1,text:()=>'Opens board 2. Bets cost 10 and pay 100.',show:s=>lvl(s,'calls1')>=2||s.earned>=20}),
 calls(2),
 // CPU-tier bonuses come later: once Board 2 is open. The stronger the tier, the smaller the bonus.
 I('tier1',2,'Tier 1 Upsets',40640057,2,TIER_GROWTH,'simple',{text:()=>'+10% on what a duel pays when a Tier 1 deck wins.',show:s=>s.boards>=2}),
 I('tier2',2,'Tier 2 Wins',91152256,1.6,TIER_GROWTH,'simple',{text:()=>'+7% on what a duel pays when a Tier 2 deck wins.',show:s=>s.boards>=2}),
 I('tier3',2,'Tier 3 Wins',89631139,1.2,TIER_GROWTH,'simple',{text:()=>'+5% on what a duel pays when a Tier 3 deck wins.',show:s=>s.boards>=2}),
 I('endless',2,'Endless Wins',10000020,.8,TIER_GROWTH,'simple',{text:()=>'+3% on what a duel pays when an Endless deck wins.',show:s=>s.boards>=2}),
 I('fee_destroy',2,'Wreckage Fees',12580477,1.6,ITEM_GROWTH,'simple',{text:()=>'+0.2 for every monster destroyed.',show:s=>s.boards>=2}),
 I('fee_direct',2,'Direct Hit Fees',46986414,2.4,ITEM_GROWTH,'simple',{text:()=>'+0.5 for every direct attack.',show:s=>lvl(s,'fee_destroy')>=1}),
 I('exodia',2,'Exodia Jackpot',33396948,8,4,'drastic',{max:20,text:l=>`Exodia wins pay ${fmt(jackpotBase('exodia',{items:{exodia:l+1}}))} (now ${fmt(jackpotBase('exodia',{items:{exodia:l}}))}).`,show:s=>s.boards>=2}),
 I('open3',2,'Board 3: '+LEAGUES[2],32807846,20,1,'opener',{max:1,text:()=>`Opens board 3. Bets cost ${fmt(boardStake(3))} and pay ${fmt(boardPayout(3))}.`,show:s=>s.boards>=2&&lvl(s,'calls2')>=1}),
 calls(3),
 I('highroller',3,'High Roller',3549275,15,1000,'drastic',{max:12,text:l=>`Everything pays ×${2**(l+1)} (now ×${2**l}).`,show:s=>s.boards>=3}),
 I('open4',3,'Board 4: '+LEAGUES[3],4031928,20,1,'opener',{max:1,text:()=>`Opens board 4. Bets cost ${fmt(boardStake(4))} and pay ${fmt(boardPayout(4))}.`,show:s=>s.boards>=3&&lvl(s,'calls3')>=1}),
 calls(4),
 I('fee_fusion',4,'Fusion Fees',24094653,2,ITEM_GROWTH,'simple',{text:()=>'+1 for every Fusion Summon.',show:s=>s.boards>=4}),
 I('fee_damage',4,'Damage Fees',19523799,2,ITEM_GROWTH,'simple',{text:()=>'+0.2 for every 1,000 damage dealt.',show:s=>lvl(s,'fee_fusion')>=1}),
 I('open5',4,'Board 5: '+LEAGUES[4],72302403,20,1,'opener',{max:1,text:()=>`Opens board 5. Bets cost ${fmt(boardStake(5))} and pay ${fmt(boardPayout(5))}.`,show:s=>s.boards>=4&&lvl(s,'calls4')>=1}),
 calls(5),
 I('deckout',5,'Deck-Out Jackpot',70368879,3,3,'drastic',{max:20,text:()=>'+50 whenever a duel ends by deck-out.',show:s=>s.boards>=5}),
 I('fee_heal',5,"Healer's Tithe",11714098,2,ITEM_GROWTH,'simple',{text:()=>'+0.5 for every 1,000 LP gained.',show:s=>s.boards>=5}),
 I('open6',5,'Board 6: '+LEAGUES[5],83764718,20,1,'opener',{max:1,text:()=>`Opens board 6. Bets cost ${fmt(boardStake(6))} and pay ${fmt(boardPayout(6))}.`,show:s=>s.boards>=5&&lvl(s,'calls5')>=1}),
 calls(6),
 I('special',6,'Alternate Win Jackpot',28566710,3,3,'drastic',{max:20,text:()=>'+200 whenever a duel ends by a special win other than Exodia.',show:s=>s.boards>=6}),
 I('flawless',6,'Flawless Bonus',5318639,2,ITEM_GROWTH,'simple',{text:()=>'+5 whenever the winner still has 8,000 LP or more.',show:s=>s.boards>=6}),
 I('open7',6,'Board 7: '+LEAGUES[6],50045299,20,1,'opener',{max:1,text:()=>`Opens board 7. Bets cost ${fmt(boardStake(7))} and pay ${fmt(boardPayout(7))}.`,show:s=>s.boards>=6&&lvl(s,'calls6')>=1}),
 calls(7),
 I('longgame',7,'Long Game',19613556,2,ITEM_GROWTH,'simple',{text:()=>'+1 for every turn past turn 10.',show:s=>s.boards>=7}),
 I('open8',7,'Board 8: '+LEAGUES[7],98502113,20,1,'opener',{max:1,text:()=>`Opens board 8. Bets cost ${fmt(boardStake(8))} and pay ${fmt(boardPayout(8))}.`,show:s=>s.boards>=7&&lvl(s,'calls7')>=1}),
 calls(8),
 I('blitz',8,'Blitz Bonus',38033121,2,ITEM_GROWTH,'simple',{text:()=>'+10 whenever a duel ends by turn 5.',show:s=>s.boards>=8}),
 I('open9',8,'Board 9: '+LEAGUES[8],32012841,20,1,'opener',{max:1,text:()=>`Opens board 9. Nine boards become your first bracket.`,show:s=>s.boards>=8&&lvl(s,'calls8')>=1}),
 calls(9),
 I('purse',9,"Champion's Purse",72989439,2,ITEM_GROWTH,'simple',{text:()=>'+50% to bracket champion payouts.',show:s=>s.brackets>=1}),
 I('autochamp',9,'Auto Champion Bet',72989439,2000,1,'opener',{max:1,keep:true,text:()=>'Places the champion bet for you when a bracket opens for betting.',show:s=>s.brackets>=1}),
 I('bracket',9,'New Bracket',12580477,1,1,'opener',{max:BRACKET_MAX-1,text:l=>`Opens the ${bracketName(l+2)}: nine more boards at higher stakes.`,maxText:'All nine brackets are open.',show:s=>s.brackets>=1}),
];
// Shop pictures are relic cutouts (assets/relics/<name>.png), one per item.
const CALL_ART=["Let's Go Gambling",'Weighted Coins','Divine Gambler',"Duelist's Wager",'Golden Scale','Golden Receipt','Merchant Sigil',"Collector's Stamp",'Champion Trophy'];
const ART={tier1:"Underdog's Banner",tier2:"Warrior's Vow",tier3:'Lone Champion',endless:'Eternal Flame',fee_summon:'Tribute Power',fee_attack:'Battle Proficiency',
 autobet:'Weighted Dice',scout:'Mind Reader',speed:'Sun and Moon Dial',open2:'Grand Bazaar',fee_destroy:'Cracked Sword',fee_direct:'Lancer Spear',exodia:'Legendary Shackles',
 open3:'Treasure Map',fee_spell:'Magician Staff',fee_trap:'Trap Weaver',highroller:'Bottomless Purse',open4:'Booster Box',fee_fusion:'Fusion Chamber',
 fee_damage:'Burn Proficiency',open5:'Golden Receipt',deckout:'Starving Library',fee_heal:'Healing Spring',open6:'Merchant Sigil',special:'Premature Triumph',flawless:'Life Shield',
 open7:'Golden Scale',longgame:'Ominous Clock',open8:"Collector's Stamp",blitz:'Reckless Spear',open9:'Champion Trophy',purse:'Loaded Purse',bracket:'Twin Banner',autochamp:'Divine Gambler'};
// Shop sections, in order. Every item belongs to one.
export const CATEGORIES=[['Payouts',/^(calls\d|highroller|purse)$/],['Card Fees',/^(fee_.*|exodia|deckout|special|flawless|longgame|blitz)$/],['CPU Tiers',/^(tier[123]|endless)$/],['Characters',/^char_/],['Automation',/^(speed|autobet|scout|autochamp)$/],['Expansion',/^(open\d|bracket)$/]];
// The shop's two tab rows (user: Characters on the second line).
// Jackpots and finishes live in Card Fees (user, 2026-11-26).
export const TAB_ROWS=[['Payouts','Card Fees','CPU Tiers'],['Characters','Automation','Expansion']];
export const categoryOf=id=>CATEGORIES.find(([,re])=>re.test(id))?.[0]||'Other';
for(const it of ITEMS)it.art=/^calls\d$/.test(it.id)?CALL_ART[Number(it.id.slice(5))-1]:ART[it.id];
// Exact tooltip text: what one level does, what you have now, what the next level gives.
const FEE={fee_summon:[.1,'every summon'],fee_attack:[.1,'every attack'],fee_spell:[.1,'every Spell Card activated'],fee_trap:[.2,'every Trap Card activated'],
 fee_destroy:[.2,'every monster destroyed'],fee_direct:[.5,'every direct attack'],fee_fusion:[1,'every Fusion Summon (on top of Summon Fees)'],fee_damage:[.2,'every 1,000 damage dealt'],fee_heal:[.5,'every 1,000 LP gained']};
const TIER_WHO={tier1:'a Tier 1 deck',tier2:'a Tier 2 deck',tier3:'a Tier 3 deck',endless:'an Endless deck'};
const WIN={ flawless:[5,'the winner still has 8,000 LP or more'],blitz:[10,'a duel ends by turn 5'],deckout:[50,'a duel ends by deck-out'],special:[200,'a duel ends by an alternate win (not Exodia)']};
// Tooltip lines (Discord: the old ones were walls of text): one short sentence, then "Now: …" and "Next level: …",
// which the shop shows as a small two-row table.
export function tooltip(s,id){const it=ITEM[id],l=lvl(s,id),c=v=>'+'+fmt(v),max=l>=it.max;
 const rows=(now,next)=>[`Now: ${now}`,...(max||next==null?[]:[`Next level: ${next}`])];
 if(/^calls\d$/.test(id)){const k=Number(id.slice(5)),u=callUnit(k);return [`+${fmt(u)} on every correct call on Board ${k}, 15% more each level.`,...rows(c(u*levelValue(l)),c(u*levelValue(l+1))),`A correct call there pays ${fmt(correctPayout(s,k,k))}.`]}
 if(FEE[id]){const [v0,w]=FEE[id],v=v0*power(id);return [`+${fmt(v)} for ${w}, in every duel. 15% more each level.`,...rows(c(v*levelValue(l)),c(v*levelValue(l+1)))]}
 if(TIER_PCT[id]){const p=TIER_PCT[id];return [`+${p}% on everything a duel pays when ${TIER_WHO[id]} wins it.`,...rows(`+${p*l}%`,`+${p*(l+1)}%`)]}
 if(WIN[id]){const [v0,w]=WIN[id],v=v0*power(id);return [`+${fmt(v)} whenever ${w}. 15% more each level.`,...rows(c(v*levelValue(l)),c(v*levelValue(l+1)))]}
 if(id==='exodia')return ['Exodia wins pay a jackpot, doubled if you backed the winner. Each level doubles it.',...rows(fmt(jackpotBase(id,s)),fmt(jackpotBase(id,{items:{[id]:l+1}})))]
 if(id==='longgame'){const v=power(id);return [`+${fmt(v)} for every turn past turn 10. 15% more each level.`,...rows(c(v*levelValue(l))+' a turn',c(v*levelValue(l+1))+' a turn')]}
 if(id==='speed')return ['Every duel plays 0.1× faster per level, up to 8×.',...rows(speedAt(l)+'×',speedAt(l+1)+'×')]
 if(id==='autobet')return ['Bets for you once a betting screen has been up this long. 15% shorter each level, down to 0.5 s.',...rows(l?autoSeconds(l)+' s':'off',autoSeconds(l+1)+' s')]
 if(id==='scout')return ['Auto Bet backs the higher-tier CPU (random when the tiers are equal).']
 if(id==='highroller')return ['Doubles everything you earn.',...rows('×'+2**l,'×'+2**(l+1))]
 if(id==='purse')return ['+50% on correct champion bets, per level.',...rows(`+${50*l}%`,`+${50*(l+1)}%`)]
 if(/^char_/.test(id)){const v=2*power(id),n=ITEM[id].charName;return [`+${fmt(v)} whenever ${n} wins a duel. 15% more each level.${ITEM[id].ucCount?` Covers all ${ITEM[id].ucCount} Ultimate Collectors.`:''}`,...rows(c(v*levelValue(l)),c(v*levelValue(l+1)))]}
 if(id==='autochamp')return ['Places your champion bet as soon as a bracket opens (picks like Auto Bet).']
 if(id==='bracket')return [`Opens the ${bracketName(s.brackets+1)||'next bracket'}: 9 more CPUs on 9 more boards, at higher stakes.`,`${s.brackets} of ${BRACKET_MAX} brackets open.`]
 return [it.text(l)]}
export const ITEM=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
// Character items: one per CPU character, registered from the catalog at start (before a save is read).
// Price by the character's strongest deck tier (rank 0 Opening … 4 Endless/World Championship); as with every income
// item, a dearer one earns more per win (power).
// Ultimate Collector characters all share one item (char_uc), priced for how many of them there are.
// Character items appear by price like every item (cheapest first, M.revealed); the old 3-wins unlock revealed the
// strong, dear characters first (user, 2026-11-26).
export const CHAR_UNLOCK=3;
export const CHAR_ITEM={};
export function registerCharacters(list){charOrder=null;const uc=list.filter(c=>c.uc),add=it=>{if(!ITEM[it.id]){ITEMS.push(it);ITEM[it.id]=it}};
 for(const c of list.filter(c=>!c.uc)){CHAR_ITEM[c.id]='char_'+c.id;add(I('char_'+c.id,1,c.name+' Wins',0,4*3**c.rank,ITEM_GROWTH,'simple',{text:()=>`Pays whenever ${c.name} wins a duel.`,show:()=>true,portrait:c.sprite,charName:c.name}))}
 if(uc.length){for(const c of uc)CHAR_ITEM[c.id]='char_uc';const rank=Math.max(...uc.map(c=>c.rank));
  add(I('char_uc',1,'Ultimate Collector Wins',0,4*3**rank*Math.sqrt(uc.length),ITEM_GROWTH,'simple',{text:()=>'Pays whenever any Ultimate Collector wins a duel.',show:()=>true,portrait:uc[0].sprite,charName:'an Ultimate Collector',ucCount:uc.length}))}}
export function itemCost(id,level){const it=ITEM[id];
 // Duel Speed: the first five levels are cheap (the 5th costs 50), then its ×1.8 climb continues from there.
 if(id==='speed')return Math.ceil(50*it.growth**(level-4));if(id==='bracket')return bracketOpenerCost(level+1);if(/^open\d$/.test(id))return boardOpenerCost(Number(id.slice(4)));// +level keeps every price strictly rising, even while rounding would repeat a small number.
 return Math.ceil(it.base*(it.growth*(growsExp(id)?GROWTH:1))**level+level)}
export const itemLevel=lvl;

// ---- state ----
// A new game (and a reset) starts with 5 coins.
export const START_COINS=5;
// First-time guide (Discord 2026-11-26, Nori: a pointing-hand helper like the main game's): 0 point at a duelist,
// 1 point at an affordable upgrade, 2 done.
export const GUIDE_DONE=2;
export function newState(){return {v:1,coins:START_COINS,earned:0,spent:0,items:{fee_summon:1},boards:1,brackets:0,stats:{bets:0,correct:0,slots:{},exodia:0,destiny:0,champions:0},settings:{fx:'full',infinite:false,off:{}},brackets_saved:[],deckStats:{},guide:0}}
const num=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
export function sanitize(raw){const s=newState();if(!raw||typeof raw!=='object')return s;
 s.coins=Math.max(0,num(raw.coins,START_COINS));s.earned=Math.max(0,num(raw.earned));s.spent=Math.max(0,num(raw.spent));
 for(const it of ITEMS){const v=Math.floor(num(raw.items?.[it.id]));if(v>0)s.items[it.id]=Math.min(v,it.max)}
 s.boards=Math.min(BOARD_MAX,Math.max(1,Math.floor(num(raw.boards,1))));s.brackets=Math.min(BRACKET_MAX,Math.max(0,Math.floor(num(raw.brackets))));
 if(s.boards<BOARD_MAX)s.brackets=0;else s.brackets=Math.max(1,s.brackets);
 for(const k of ['bets','correct','exodia','destiny','champions'])s.stats[k]=Math.max(0,Math.floor(num(raw.stats?.[k])));
 for(const [k,v] of Object.entries(raw.stats?.slots||{}))if(/^\d$/.test(k))s.stats.slots[k]=Math.max(0,Math.floor(num(v)));
 if(['full','light','off'].includes(raw.settings?.fx))s.settings.fx=raw.settings.fx;s.settings.infinite=DEV_TOOLS&&!!raw.settings?.infinite;for(const k of ['scout','autochamp','autobet'])if(raw.settings?.off?.[k])s.settings.off[k]=true;
 if(raw.deckStats&&typeof raw.deckStats==='object')for(const [k,v] of Object.entries(raw.deckStats))if(/^\d+:\d+$/.test(k)&&Array.isArray(v)&&v.length===4)s.deckStats[k]=v.map(x=>Math.max(0,Math.floor(num(x))));
 // Character wins come from the deck stats (older saves had no separate count).
 s.charWins={};for(const [k,v] of Object.entries(s.deckStats))addCharWin(s,Number(k.split(':')[0]),v[1]);
 s.guide=Math.max(0,Math.min(GUIDE_DONE,Math.floor(num(raw.guide))));if(!('guide' in raw)&&s.stats.bets>0)s.guide=GUIDE_DONE;// older saves: no guide
 if(Array.isArray(raw.brackets_saved))s.brackets_saved=raw.brackets_saved.filter(b=>b&&Array.isArray(b.roster)&&b.roster.length===ROSTER_SIZE).slice(0,BRACKET_MAX);
 return s}
export const canAfford=(s,cost)=>s.settings.infinite||s.coins>=cost;
export function spend(s,cost){if(!canAfford(s,cost))return false;if(!s.settings.infinite)s.coins-=cost;s.spent+=cost;return true}
export function earn(s,amount){if(!(amount>0))return 0;s.coins+=amount;s.earned+=amount;return amount}
// Bought one-time items leave the shop, except automation ones (keep), which stay with an ON/OFF switch.
// An item appears once you have earned half its first price (Cookie Clicker reveals a building as you near its price),
// so a new game starts with only Lucky Calls and Summon Fees; owned items always stay.
export const REVEAL=.5;
// Characters come one at a time (user, 2026-11-26: "revealed much more slowly"): in price order (then name), the k-th
// needs CHAR_REVEAL × CHAR_STEP^k earned in total (200, 320, 512… about 12 by 56K, 20 by 2.4M, all by ~300M).
export const CHAR_REVEAL=200,CHAR_STEP=1.6;
let charOrder=null;
const charIndex=id=>{if(!charOrder){charOrder=new Map(ITEMS.filter(i=>/^char_/.test(i.id)).sort((a,b)=>itemCost(a.id,0)-itemCost(b.id,0)||String(a.charName||a.name).localeCompare(String(b.charName||b.name))).map((i,k)=>[i.id,k]))}return charOrder.get(id)??0};
const charThreshold=id=>CHAR_REVEAL*CHAR_STEP**charIndex(id);
export const revealed=(s,it)=>lvl(s,it.id)>0||it.id==='calls1'||((s.earned||0)>=itemCost(it.id,0)*REVEAL&&(!/^char_/.test(it.id)||(s.earned||0)>=charThreshold(it.id)));
export const visibleItems=s=>ITEMS.filter(it=>it.set<=Math.max(s.boards,s.brackets?9:0)&&it.show(s)&&revealed(s,it)&&!(it.kind==='opener'&&!it.keep&&lvl(s,it.id)>=it.max));
export const isOn=(s,id)=>lvl(s,id)>0&&!s.settings?.off?.[id];
// Buying returns what changed so the screen can react ('board', 'bracket' or null).
export function buy(s,id){const it=ITEM[id],level=lvl(s,id);if(!it||level>=it.max||!it.show(s))return null;const cost=itemCost(id,level);if(!spend(s,cost))return null;
 s.items[id]=level+1;
 if(/^open\d$/.test(id)){s.boards=Math.max(s.boards,Number(id.slice(4)));if(s.boards>=BOARD_MAX){s.brackets=Math.max(1,s.brackets);return {kind:'bracket',cost}}return {kind:'board',cost}}
 if(id==='bracket'){s.brackets=Math.min(BRACKET_MAX,s.brackets+1);return {kind:'bracket',cost}}
 return {kind:'item',cost}}

// ---- what things pay ----
export const speedOf=s=>speedAt(lvl(s,'speed'));
export const autoInterval=s=>isOn(s,'autobet')?autoSeconds(lvl(s,'autobet'))*1000:0;
const TIER_RANK={'Opening Duel':0,'Tier 1':1,'Tier 2':2,'Tier 3':3,Endless:4,'World Championship':4};
export const tierRank=label=>TIER_RANK[label]??2;
// The seat Auto Bet backs: random, or with Scouting Report the higher tier (random on a tie).
export function autoPick(s,seats,random=Math.random){if(isOn(s,'scout')){const a=tierRank(seats[0].label),b=tierRank(seats[1].label);if(a!==b)return a>b?0:1}return random()<.5?0:1}
export const multiplier=s=>2**lvl(s,'highroller');
export const callUnit=k=>k===1?1:boardPayout(k)*.25;
// Every Calls item: +callUnit per correct call at level 1, each level worth 15% more than the one before.
export function callsBonus(slot,l){return levelValue(l)*callUnit(slot)}
export const correctPayout=(s,slot,level)=>(boardPayout(level)+callsBonus(slot,lvl(s,'calls'+slot))*levelScale(level)/levelScale(slot))*multiplier(s);
// The dearer an income item's first purchase, the more each level earns: (first price / 15)^0.75, never under 1.
// 15 is the opening shop's Summon Fees. Sub-linear so late items are strong without running away.
const POWER_REF=15,powerCache=new Map();
export function power(id){if(!powerCache.has(id))powerCache.set(id,Math.max(1,(itemCost(id,0)/POWER_REF)**.75));return powerCache.get(id)}
export function jackpotBase(kind,s){const l=lvl(s,kind);return (kind==='exodia'?50*2**l:kind==='deckout'?50*levelValue(l):kind==='special'?200*levelValue(l):0)*power(kind)}
// Income from one replayed frame's events on a board of this level.
// Items pay the same on every board (like Cookie Clicker buildings, a new board never multiplies the old items);
// only the bets and the Calls items grow with a board's stakes. High Roller multiplies everything.
export const itemScale=s=>multiplier(s);
export function eventIncome(s,events,level){let total=0;const scale=itemScale(s),f=(id,v)=>{const l=lvl(s,id);return l?levelValue(l)*v*power(id):0};
 for(const e of events){
  if(e[0]==='s'||e[0]==='f'){total+=f('fee_summon',.1);if(e[0]==='f')total+=f('fee_fusion',1)}
  else if(e[0]==='a'){total+=f('fee_attack',.1);if(e[3]===-1)total+=f('fee_direct',.5)}
  else if(e[0]==='x'&&(e[4]??4)===4)total+=f('fee_destroy',.2);
  else if(e[0]==='c'){if(e[3]===2)total+=f('fee_spell',.1);else if(e[3]===4)total+=f('fee_trap',.2)}
  else if(e[0]==='l'){if(e[2]<0)total+=f('fee_damage',.2*(-e[2]/1000));else total+=f('fee_heal',.5*(e[2]/1000))}
 }
 return total*scale}
export const tierKey=label=>/^Tier 1/.test(label)?'tier1':/^Tier 2/.test(label)?'tier2':/^Tier 3/.test(label)?'tier3':/Endless/.test(label)?'endless':null;
// Everything a finished duel pays. result: {winner, reason, turns, winnerLp, winnerTier (deck label)};
// pick = the seat the player backed (null = no bet). Returns {total, parts:[[label, amount, big]]}.
export function duelPayout(s,result,level,slot,pick=null){const parts=[],scale=itemScale(s),add=(label,v,big=false)=>{if(v>0)parts.push([label,v,big])};
 if(pick!=null&&result.winner===pick)add('Correct call',correctPayout(s,slot,level),true);
 const kind=winKind(result);
 if(kind==='exodia'){const v=jackpotBase(kind,s)*scale*(pick!=null&&result.winner===pick?2:1);add('EXODIA JACKPOT',v,true)}
 if(kind==='deckout')add('Deck-out jackpot',jackpotBase('deckout',s)*scale,true);
 if(kind==='special')add('Alternate win jackpot',jackpotBase('special',s)*scale,true);
 if(result.winner<2&&result.winnerId!=null){const id=CHAR_ITEM[result.winnerId]||'char_'+result.winnerId,l=lvl(s,id);if(l)add(id==='char_uc'?'Ultimate Collector wins':(ITEM[id]?.charName||'Character')+' wins',2*levelValue(l)*power(id)*scale)}
 if(result.winner<2&&result.winnerLp>=8000)add('Flawless',5*lv(s,'flawless')*power('flawless')*scale);
 if(result.turns>10)add('Long game',(result.turns-10)*lv(s,'longgame')*power('longgame')*scale);
 if(result.winner<2&&result.turns<=5)add('Blitz',10*lv(s,'blitz')*power('blitz')*scale);
 return {total:parts.reduce((a,p)=>a+p[1],0),parts}}

// Tier wins: a percentage on top of everything the duel paid (its fees, the call, jackpots, bonuses and feats).
// Each level adds the same share; the share is smaller for stronger tiers.
export const TIER_PCT={tier1:10,tier2:7,tier3:5,endless:3};
const TIER_LABEL={tier1:'Tier 1 upset',tier2:'Tier 2 win',tier3:'Tier 3 win',endless:'Endless win'};
export const tierPct=(s,tier)=>TIER_PCT[tier]?TIER_PCT[tier]*lvl(s,tier):0;
export function withTierBonus(s,result,pay,fees=0){const tier=result.winner<2?tierKey(result.winnerTier||''):null,pct=tierPct(s,tier),v=pct/100*(pay.total+Math.max(0,fees||0));
 return v>0?{...pay,total:pay.total+v,parts:[...pay.parts,[`${TIER_LABEL[tier]} +${pct}%`,v]]}:pay}

// Every finished duel the player's boards and brackets play, per deck ("id:tier" -> [duels, wins, Exodia wins, Destiny wins]).
export function recordDeckResult(s,seats,winner,reason){seats.forEach((d,p)=>{if(!d)return;const k=d.id+':'+d.tier,v=s.deckStats[k]??=[0,0,0,0];v[0]++;if(winner===p){v[1]++;addCharWin(s,d.id,1);if(EXODIA_WINS.includes(reason))v[2]++;if(reason===21)v[3]++}})}
const EXODIA_WINS=[16,20,31,33];
function addCharWin(s,id,n){s.charWins??={};s.charWins[id]=(s.charWins[id]||0)+n;if(CHAR_ITEM[id]==='char_uc')s.charWins.uc=(s.charWins.uc||0)+n}

// ---- replay pacing ----
// How long each recorded frame stays on screen at 1× speed.
// A frame that only changes the phase passes quickly, so showing phases doesn't slow duels down.
export function frameDelay(frame){if(!frame[1]&&frame[0].length&&frame[0].every(e=>e[0]==='p'))return 120;let ms=260;for(const e of frame[0]){ms+=e[0]==='t'?520:e[0]==='a'?360:e[0]==='f'?420:e[0]==='x'?200:e[0]==='c'?220:e[0]==='s'?160:e[0]==='l'?140:0}return Math.min(ms,1400)}
export function schedule(tl){let t=0;const at=tl.frames.map(f=>{const start=t;t+=frameDelay(f);return start});return {at,total:t+900}}
export const finalLp=(tl,p)=>{for(let i=tl.frames.length-1;i>=0;i--){const b=tl.frames[i][1];if(b&&b[p])return b[p][0]}return 8000};
export const resultOf=(tl,decks)=>({winnerId:tl.winner<2?tl.seats[tl.winner]?.id:null,winner:tl.winner,reason:tl.reason,turns:tl.turns,winnerLp:tl.winner<2?finalLp(tl,tl.winner):0,winnerTier:tl.winner<2?decks?.[tl.winner]?.label||'':''});
export function damageDealt(tl){const d=[0,0];for(const f of tl.frames)for(const e of f[0])if(e[0]==='l'&&e[2]<0)d[1-e[1]]+=-e[2];return d}

// ---- brackets: a round-robin league of the same 9 CPUs on 9 boards; most wins takes it ----
// Round r pairs every CPU i with CPU i+r+1 (mod 9): 9 duels, everyone plays twice per round, and after 4 rounds
// (36 duels) every pair has met exactly once. Then the next 9 CPUs are drawn.
export function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
// pool: [{id,tier,label}] every CPU deck of every tier. Characters don't repeat inside one roster.
export function pickRoster(pool,random,size=ROSTER_SIZE){const out=[],seen=new Set();let guard=0;while(out.length<size&&guard++<size*50){const d=pool[Math.floor(random()*pool.length)];if(seen.has(d.id)&&guard<size*40)continue;seen.add(d.id);out.push(d)}return out}
export function roundPairs(round,random=Math.random,n=ROSTER_SIZE){const pairs=[];for(let i=0;i<n;i++){const j=(i+round+1)%n;pairs.push(random()<.5?[i,j]:[j,i])}
 for(let i=pairs.length-1;i>0;i--){const k=Math.floor(random()*(i+1));[pairs[i],pairs[k]]=[pairs[k],pairs[i]]}return pairs}
export function standings(wins,damage){return wins.map((w,i)=>i).sort((a,b)=>wins[b]-wins[a]||damage[b]-damage[a]||a-b)}
export const championStake=(s,bracket)=>boardStake(slotLevel(9,bracket))*10;
// One of 9 contenders: a correct champion bet pays 10× its stake (before Champion's Purse and High Roller).
export const championPayout=(s,bracket)=>championStake(s,bracket)*10*(1+.5*lvl(s,'purse'))*multiplier(s);
// Unwatched bracket duels are settled from each deck's recorded results (idle-bets-library.js keeps them).
const TIER_BASE={'Opening Duel':.6,'Tier 1':1,'Tier 2':1.4,'Tier 3':1.9,Endless:2.4,'World Championship':2.4};
export function strength(deck,stats){const st=stats?.[deck.id+':'+deck.tier]||{g:0,w:0};return (TIER_BASE[deck.label]??1.5)*((st.w+3)/(st.g+6))/.5}
export function modelWinner(a,b,stats,random){const sa=strength(a,stats),sb=strength(b,stats);return random()<sa/(sa+sb)?0:1}
export function modelWinKind(deck,stats,random){const st=stats?.[deck.id+':'+deck.tier];if(!st||!st.w)return 1;const r=random()*(st.w+1);return r<(st.ex||0)?16:r<(st.ex||0)+(st.de||0)?21:1}

// ---- numbers ----
const SUFFIX=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qad','Qid','Sxd','Spd','Ocd','Nod','Vg'];
export function fmt(n){if(!Number.isFinite(n))return '∞';const a=Math.abs(n);if(a<100)return (Math.floor(n*10)/10).toLocaleString('en-US');if(a<1e4)return Math.floor(n).toLocaleString('en-US');
 const k=Math.min(SUFFIX.length-1,Math.floor(Math.log10(a)/3));if(k>=SUFFIX.length-1&&a>=1e66)return n.toExponential(2).replace('+','');const v=Math.round(n/1000**k*1e9)/1e9;return (v>=100?Math.floor(v):Math.floor(v*100)/100).toLocaleString('en-US')+SUFFIX[k]}
