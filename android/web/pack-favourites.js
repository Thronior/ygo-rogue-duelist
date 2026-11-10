// Favourite booster packs (Discord 2026-11-10, Eriko): a star on shop offers (solo and Tag), on Collection › Packs tiles and in
// the pack details. Favourites go first on the shop's pack shelf and in Collection, and the shelf heading counts those in stock.
// Saved per device in settings.favoritePacks (storage.py). The star sits outside [data-shop-item], so it never selects a pack.
const favourites=new Set();
const attr=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
export function loadFavouritePacks(list){favourites.clear();for(const id of Array.isArray(list)?list:[])if(typeof id==='string')favourites.add(id)}
export const isFavouritePack=id=>favourites.has(id);
export function toggleFavouritePack(id){if(favourites.has(id))favourites.delete(id);else favourites.add(id);return [...favourites]}
// Stable: favourites first, everything else keeps its order.
export const favouritesFirst=(list,idOf=x=>x)=>list.map((x,i)=>({x,i,f:favourites.has(idOf(x))?1:0})).sort((a,b)=>b.f-a.f||a.i-b.i).map(o=>o.x);
export function packStar(id,name,cls=''){const on=favourites.has(id);return `<button type="button" class="pack-fav ${cls}" data-do="pack-favourite" data-pack="${attr(id)}" aria-pressed="${on}" aria-label="${on?'Remove from favourites':'Add to favourites'}: ${attr(name)}" title="${on?'Favourite pack':'Add to favourites'}"><span aria-hidden="true">${on?'★':'☆'}</span></button>`}
export function packFavouriteToggle(id){const on=favourites.has(id);return `<button type="button" class="pack-fav-toggle" data-do="pack-favourite" data-pack="${attr(id)}" aria-pressed="${on}"><span aria-hidden="true">${on?'★':'☆'}</span> <span>${on?'Favourite pack':'Add to favourites'}</span></button>`}
export const favouritesInStock=n=>n?`<span class="fav-instock"><span aria-hidden="true">★</span> <span>Favourites in stock: ${n}</span></span>`:'';
