import {isUltra} from './ultra-rarity.js';
const seen=new Set();
export function isShopUltra(item,cards){return item.kind==='single'&&!item.sold&&(isUltra(item.id)||cards.find(c=>c.id===item.id)?.sets?.some(s=>s.rarity==='Ultra Rare'));}
export function announceShopUltra(run,cards){
 const key=JSON.stringify([run.started_at,run.round,run.shop?.map(x=>[x.kind,x.id])]);
 if(seen.has(key)||!run.shop?.some(x=>isShopUltra(x,cards)))return;
 seen.add(key);if(seen.size>100)seen.delete(seen.values().next().value);
 document.dispatchEvent(new CustomEvent('shop-ultra'));
}
