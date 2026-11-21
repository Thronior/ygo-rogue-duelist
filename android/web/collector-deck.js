// Ultimate Collector deck editor on the shared solo editor (deck-editor-view.js, user 2026-11-21). The shared editor
// works on pool indices; the collector saves card IDs per zone (main, side, extra). Each pool copy gets its zone once
// when the editor opens, so a tap lights the copy that was tapped, and the deck is rebuilt from the zones on each change.
// Sections: 'deck' (Main + Fusion, like solo's one deck with its Extra Deck tab) and 'side'. While siding the grid shows
// every card of the match decks: selected = in the Main or Fusion Deck, the rest is the Side Deck.
const inDeck=zone=>zone==='main'||zone==='extra';

export function zonesFor(pool,deck){
 const free=new Map();pool.forEach((id,i)=>{let list=free.get(id);if(!list)free.set(id,list=[]);list.push(i)});
 const zones=pool.map(()=>null);
 for(const zone of ['main','extra','side'])for(const id of deck?.[zone]||[]){const i=free.get(id)?.shift();if(i!==undefined)zones[i]=zone}
 return zones;
}

export function deckFromZones(pool,zones){const deck={main:[],side:[],extra:[]};zones.forEach((zone,i)=>{if(zone)deck[zone].push(pool[i])});return deck}

// The pool indices the section shows (`visible`, in pool order so Newest still works) and which of them are selected
// (indices into `visible`).
export function sectionView(zones,section,siding){
 const visible=[],selected=[];
 zones.forEach((zone,i)=>{
  const show=siding||(section==='side'?!inDeck(zone):zone!=='side');if(!show)return;
  if(siding||section!=='side'?inDeck(zone):zone==='side')selected.push(visible.length);
  visible.push(i);
 });
 return {visible,selected};
}

// One copy in or out of the section. Siding moves it between the Deck and the Side Deck.
export function toggleZone(zones,i,section,siding,fusion){
 const zone=zones[i],selected=siding||section!=='side'?inDeck(zone):zone==='side';
 zones[i]=selected?(siding?'side':null):(!siding&&section==='side'?'side':fusion?'extra':'main');
 return zones[i];
}

// Copies used by card name across every zone; a name at its limit (1, 2 or 3) is full.
export function nameCounts(pool,zones,nameOf){const counts=new Map();zones.forEach((zone,i)=>{if(!zone)return;const name=nameOf(pool[i]);counts.set(name,(counts.get(name)||0)+1)});return counts}
