// Pointer type, rather than :hover, excludes touch and pen on hybrid devices.
export function installHandHover(root){
 let active=null;
 const clear=()=>{active?.classList.remove('mouse-hand-hover');active=null;};
 const over=e=>{if(e.pointerType!=='mouse'||e.buttons)return;const card=e.target.closest('.duel .hand > button[data-hand]');if(card===active)return;clear();if(card&&!document.querySelector('dialog[open],.action-pop')){active=card;card.classList.add('mouse-hand-hover');}};
 const out=e=>{if(active?.contains(e.target)&&!active.contains(e.relatedTarget))clear();};
 root.addEventListener('pointerover',over);root.addEventListener('pointerout',out);
 document.addEventListener('pointerdown',clear,true);document.addEventListener('scroll',clear,true);
 document.addEventListener('visibilitychange',clear);window.addEventListener('blur',clear);
}
