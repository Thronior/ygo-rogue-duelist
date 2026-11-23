// "★ All" (itch.io request; user 2026-11-22): one small menu that marks every card the editor currently shows, all pages,
// Yes, No or none, after an inline confirm with the count. Used by the Character settings marks editor and the solo deck
// editor. A <details> menu: opening it needs no handler, and nothing runs until a choice is confirmed.
const CHOICES=[[1,'★','Mark Yes','Mark {0} cards Yes?'],[-1,'✕','Mark No','Mark {0} cards No?'],[0,'☆','Clear marks','Clear the marks on {0} cards?']];
export const markAllMarkup=()=>`<details class="mark-all"><summary title="Mark every card shown" aria-label="Mark every card shown">★ All<span aria-hidden="true"> ▾</span></summary><div class="mark-all-menu"></div></details>`;
const options=count=>`<small>${'All {0} cards shown'.replace('{0}',count.toLocaleString())}</small>${CHOICES.map(([mark,sym,label])=>`<button type="button" class="${mark<0?'no':''}" data-mark-all="${mark}"><b>${sym}</b>${label}</button>`).join('')}`;
const confirmMarkup=(count,mark)=>{const row=CHOICES.find(c=>c[0]===mark);return `<p>${row[3].replace('{0}',count.toLocaleString())}</p><div class="mark-all-confirm"><button type="button" class="primary" data-mark-all-go="${mark}">Confirm</button><button type="button" data-mark-all-cancel>Cancel</button></div>`};
// Call from a document click listener. count(): how many cards are shown now; apply(mark) does the marking.
// Returns true when the click belonged to a menu.
export function handleMarkAllClick(e,{count,apply}){
 const box=e.target.closest?.('.mark-all');if(!box)return false;
 const menu=box.querySelector('.mark-all-menu'),n=count();
 // Open towards the free side: a button wrapped to the left edge (phone portrait) opens rightwards.
 if(e.target.closest('summary')){menu.innerHTML=options(n);const left=box.getBoundingClientRect().left<innerWidth/2;menu.style.left=left?'0':'';menu.style.right=left?'auto':'';return true}
 const pick=e.target.closest('[data-mark-all]');
 if(pick){e.preventDefault();menu.innerHTML=n?confirmMarkup(n,Number(pick.dataset.markAll)):options(0);return true}
 const go=e.target.closest('[data-mark-all-go]');
 if(go){e.preventDefault();box.open=false;void apply(Number(go.dataset.markAllGo));return true}
 if(e.target.closest('[data-mark-all-cancel]')){e.preventDefault();box.open=false;return true}
 return true;
}
// Close an open menu on a click elsewhere.
export function closeMarkAllMenus(e){for(const box of document.querySelectorAll('.mark-all[open]'))if(!box.contains(e.target))box.open=false}
