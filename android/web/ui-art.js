// Use pre-cropped artwork files so responsive layouts never expose card frames.
export const relicImage=id=>`assets/relics/${String(id).endsWith('.png')?encodeURIComponent(id):id+'.jpg'}`;
export function relicArtwork(src,attributes=''){
 return `<img class="relic-artwork" src="${src}" alt="Relic artwork" ${attributes}>`;
}

// Snapshot names are already ordered for each viewer, including the optional 1v1.
export function activeTagCharacters(content,view,tag){
 return [0,1].map(side=>{
  const seat=tag.activeSeats?.[side]??0,name=tag.names?.[side]?.[seat];
  const match=Object.values(content.characters).find(c=>c.name===name);
  const ids=tag.pvp?view.characters:side===0?view.characters:view.opponents;
  const fallback=tag.pvp?(side===0?tag.localSeat:1-tag.localSeat):seat;
  return match||content.characters[ids?.[fallback]];
 });
}
