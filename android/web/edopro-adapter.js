// Run the Dueling AI against a duel hosted somewhere else: a native EDOPro/ocgcore
// build, a server, or any other host. The host forwards raw core messages and board
// queries; the AI answers with raw response bytes. See docs/DUELING-AI.md.
import {MobileDuel} from './duel.js';
import {decodeNativeMessage,decodeNativeQuery,encodeNativeResponse} from './vendor/package/dist/index.js';

// Locations the host should query for both players on every decision.
export const QUERY_LOCATIONS=[1,2,4,8,16,32,64]; // deck, hand, monster zone, spell/trap zone, grave, banished, extra
// QUERY_CODE|POSITION|LEVEL|ATTRIBUTE|RACE|ATTACK|DEFENSE|EQUIP_CARD|COUNTERS|STATUS|IS_PUBLIC
export const QUERY_FLAGS=0x1|0x2|0x10|0x40|0x80|0x100|0x200|0x4000|0x20000|0x80000|0x100000;

export class EdoproAI{
 /**
  * cards: card details (see data/cards.json). engineData: engine card data keyed by code (engine-data.json).
  * seat: the player the AI controls. deck: the AI's own {main, extra} card IDs.
  * lp: starting Life Points for players 0 and 1. seed: any number; the same seed gives the same choices.
  */
 constructor({cards,engineData,seat=1,deck={main:[],extra:[]},lp=[8000,8000],seed=0,rules=1}){
  this.seat=seat;this.queue=null;this.process=0;this.zones=new Map();this.response=null;
  const duel=this.duel=new MobileDuel(cards);
  duel.data=engineData;
  for(const c of Object.values(engineData))if(typeof c.race!=='bigint')c.race=BigInt(c.race);
  const zone=(p,location)=>this.zones.get(p+','+location)||[];
  // A stand-in for the rules engine: it replays the host's messages and board, and keeps the AI's answer.
  duel.core={
   createDuel:()=>1,destroyDuel(){},loadScript(){},duelNewCard(){},startDuel(){},
   duelProcess:()=>this.queue?this.process:0,
   duelGetMessage:()=>{const messages=this.queue||[];this.queue=null;return messages},
   duelSetResponse:(_,response)=>{this.response=response},
   duelQueryLocation:(_,{controller,location})=>zone(controller,location),
   duelQuery:(_,{controller,location,sequence})=>zone(controller,location)[sequence]||null,
   duelQueryCount:(_,p,location)=>zone(p,location).length,
  };
  duel.scripts={};
  const own=seat=>seat===this.seat?deck:{main:[],extra:[]};
  duel.start(own(0).main,own(1).main,lp[0],lp[1],5,seed,own(0).extra,own(1).extra,'',5,null,rules);
 }
 /**
  * Forward core messages without asking for a decision, for example the messages that end the duel.
  * messages: raw core messages in order, each [type, ...body] as EDOPro receives them.
  */
 observe(messages,zones){this.load(messages,zones,2);this.duel.advance();}
 /**
  * Ask the AI to answer the prompt that ends `messages`. Pass every message since the previous call,
  * including those for the other player, and the current board from `zones`.
  * Returns the response as raw bytes for OCG_DuelSetResponse.
  */
 decide(messages,zones){
  const missing=Error(`decide() needs the messages since the last call, ending with a prompt for player ${this.seat}.`);
  this.load(messages,zones,1);
  if(!this.queue.length)throw missing;
  let state;
  try{state=this.duel.advance()}catch(error){if(/without a recognized prompt/.test(error.message))throw missing;throw error}
  // The engine passes on a chain the AI cannot respond to without asking it.
  if(this.response)return encodeNativeResponse(this.response);
  const prompt=state.pending;
  if(prompt?.player!==this.seat)throw missing;
  const response=this.duel.auto();
  this.duel.respond(response);
  return encodeNativeResponse(response);
 }
 // zones: {"<player>,<location>": raw OCG_DuelQueryLocation bytes} for QUERY_LOCATIONS and both players.
 load(messages,zones,process){
  this.zones=new Map(Object.entries(zones||{}).map(([key,bytes])=>[key,decodeNativeQuery(bytes)]));
  this.queue=messages.map(bytes=>decodeNativeMessage(bytes)).filter(Boolean);
  this.process=process;this.response=null;
 }
}
