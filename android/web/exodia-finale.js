export const EXODIA_DURATION=5000;
export const isExodiaWin=result=>Number(result?.reason)===0x10;
export const isCardWin=result=>[0x10,0x15].includes(Number(result?.reason));
const layouts={16:[70903634,8124921,33396948,44519536,7902349],21:[94212438,31893528,67287533,94772232,30170981]};
let playing=null;
export function playCardWin(result){
 if(!isCardWin(result))return Promise.resolve();
 if(playing)return playing;
 playing=(async()=>{
  const destiny=Number(result.reason)===0x15,pieces=layouts[Number(result.reason)];
  const panel=document.createElement('dialog');panel.className='exodia-finale';panel.setAttribute('aria-label',destiny?'Destiny Board duel result':'Exodia duel result');
  const cards=document.createElement('div');cards.className='exodia-finale-cards';
  for(const code of pieces){const img=document.createElement('img');img.src=`assets/cards/${code}.jpg`;img.alt=destiny?'FINAL'[pieces.indexOf(code)]:code===33396948?'Exodia the Forbidden One':'Exodia piece';cards.append(img)}
  const title=document.createElement('h1');title.textContent=result.player===0?'You win':result.player===1?'You lose':'Draw';title.className='exodia-finale-result';title.setAttribute('role','status');
  panel.append(cards,title);panel.addEventListener('cancel',event=>event.preventDefault());document.body.append(panel);
  const animations=[];
  try{
   panel.showModal();
   [...cards.children].forEach((img,i)=>animations.push(img.animate([{opacity:0,offset:0},{opacity:0,offset:i*.1},{opacity:1,offset:i*.1+.2},{opacity:1,offset:1}],{duration:EXODIA_DURATION,fill:'both',easing:'linear'})));
   const text=title.animate([{opacity:0,offset:0},{opacity:0,offset:.6},{opacity:1,offset:.7},{opacity:1,offset:1}],{duration:EXODIA_DURATION,fill:'both',easing:'linear'});animations.push(text);
   await text.finished;
  }finally{for(const animation of animations)animation.cancel();panel.close();panel.remove()}
 })().finally(()=>{playing=null});return playing;
}

export const playExodiaFinale=playCardWin;
