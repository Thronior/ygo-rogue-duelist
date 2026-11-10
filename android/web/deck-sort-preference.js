// Deck editor Sort and Deck status choices, remembered per device (Discord 2026-11-10).
// Solo and Tag share them. The type tab and the search box still reset after each duel; the reset button
// puts Sort and Deck status back to the defaults and remembers that.
const KEY='ygo-deck-sort';
export const DEFAULT_DECK_SORT='Newest',DEFAULT_DECK_STATUS='First';
const STATUSES=['Any','In','Out','First'];
let saved=null;
function read(){
 if(saved)return saved;
 try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{saved={}}
 return saved;
}
// `allowed` is the caller's sort list: Tag offers fewer sorts than solo.
export const savedDeckSort=allowed=>allowed.includes(read().sort)?read().sort:DEFAULT_DECK_SORT;
export const savedDeckStatus=()=>STATUSES.includes(read().status)?read().status:DEFAULT_DECK_STATUS;
// Pass only what changed ({sort} or {status}), so a Tag status change keeps a solo-only sort such as Type.
export function rememberDeckSort(change){
 saved={...read(),...change};
 try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}
}
