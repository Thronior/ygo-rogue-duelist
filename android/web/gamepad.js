// Controller play through the Gamepad API (2026-11-05). Nothing polls until a pad connects; the rAF loop stops
// when the last one leaves. Every button replays an input the game already handles (click, hover, long press,
// right click), so no screen needs controller-specific code.
// Button order is the standard (XInput) layout: 0 A/Cross, 1 B/Circle, 2 X/Square, 3 Y/Triangle, 4 LB, 5 RB, 8 Back/Share, 9 Start/Options.
const A=0,BTN_B=1,X=2,Y=3,LB=4,RB=5,SELECT=8,START=9,UP=12,DOWN=13,LEFT=14,RIGHT=15;
// Sony pads on a non-standard mapping (DirectInput order): Square, Cross, Circle, Triangle, L1, R1, L2, R2, Share, Options.
const SONY=/054c|sony|dualshock|dualsense|wireless controller/i;
const SONY_ORDER=[1,2,0,3,4,5,6,7,8,9,10,11];
const TARGETS='button,a[href],input,select,textarea,summary,[role="button"],[data-do],[data-inspect],[data-pick],[data-shop-item],[data-zone],[data-hand],[data-preview],[data-pile],[data-reveal],[data-tag],[data-relic],[data-enemy-relic],[data-curse],[data-pack],[tabindex]:not([tabindex="-1"])';
const PREFERRED='.menu-card[data-distance="0"],.selected,[aria-pressed="true"],[autofocus]';
const MENU_EVERY=260,DEAD=.5,REPEAT_DELAY=320,REPEAT_EVERY=110,HOLD_MS=560;

export function padKind(id=''){return SONY.test(id)?(/0ce6|0df2|dualsense/i.test(id)?'dualsense':'dualshock'):'xinput'}

// Reads one pad into the standard layout: 16 booleans plus the left and right sticks.
// Some phones list built-in sensors (fingerprint readers and the like) as gamepads, and one with an axis or button stuck
// away from rest kept waking pad mode and pushing focus to the right edge, so a deck editor card looked hovered for good
// (player report, 2026-11-13). An input only counts once it has been seen at rest since the pad appeared.
export function settle(rest,key,s){
 let r=rest.get(key);if(!r)rest.set(key,r={b:new Array(16).fill(false),a:[false,false,false,false]});
 s.pressed=s.pressed.map((v,i)=>{if(!v)r.b[i]=true;return v&&r.b[i]});
 ['lx','ly','rx','ry'].forEach((k,i)=>{if(Math.abs(s[k])<=DEAD)r.a[i]=true;if(!r.a[i])s[k]=0});
 return s;
}
export function readPad(pad){
 const pressed=new Array(16).fill(false),b=pad.buttons,ax=pad.axes;
 const on=i=>!!b[i]&&(b[i].pressed||b[i].value>.5);
 if(pad.mapping==='standard'||!SONY.test(pad.id)){for(let i=0;i<16;i++)pressed[i]=on(i)}
 else{
  SONY_ORDER.forEach((raw,i)=>{pressed[i]=on(raw)});
  // The D-pad is a hat axis (usually 9): -1 up, then clockwise in steps of 2/7; above 1 is neutral.
  const hat=ax.length>9?ax[9]:null;
  if(hat!==null&&hat>=-1.05&&hat<=1.05){const step=Math.round((hat+1)*3.5)%8;pressed[UP]=step===0||step===1||step===7;pressed[RIGHT]=step>=1&&step<=3;pressed[DOWN]=step>=3&&step<=5;pressed[LEFT]=step>=5&&step<=7}
  else for(let i=12;i<16;i++)pressed[i]=on(i);
 }
 return {pressed,lx:ax[0]||0,ly:ax[1]||0,rx:ax[2]||0,ry:(pad.mapping==='standard'?ax[3]:ax[5]??ax[3])||0};
}

// Hidden-from-screen-reader hit areas with an action (the shopkeeper's) still count.
const visible=el=>{if(el.disabled||el.closest('[inert]')||!el.dataset.do&&el.closest('[aria-hidden="true"]'))return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2&&el.checkVisibility({opacityProperty:true,visibilityProperty:true})&&getComputedStyle(el).pointerEvents!=='none'};
const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
const signature=el=>el.tagName+[...el.attributes].filter(a=>a.name.startsWith('data-')&&a.name!=='data-pad-focus').map(a=>a.name+'='+a.value).join('|')+(el.dataset&&Object.keys(el.dataset).length?'':'#'+(el.textContent||'').trim().slice(0,40));

// The active layer: the topmost open dialog, else the page (with any card action pop-up on top of it).
// Top-layer order follows showModal calls, not DOM order (an inspection opens over a pack dialog appended later).
const opened=new WeakMap();let openSeq=0;
if(typeof HTMLDialogElement!=='undefined')for(const name of ['showModal','show']){const original=HTMLDialogElement.prototype[name];HTMLDialogElement.prototype[name]=function(...args){opened.set(this,++openSeq);return original.apply(this,args)}}
function layer(){let top=null,best=-1;for(const d of document.querySelectorAll('dialog[open]')){const n=opened.get(d)||0;if(n>=best){best=n;top=d}}return top}
const inLayer=el=>{const top=layer();return top?top.contains(el):!el.closest('dialog')};
function candidates(){
 const top=layer(),scope=top||document.body;
 const all=[...scope.querySelectorAll(TARGETS)].filter(el=>el!==scope&&!el.closest('.pad-cursor')&&(top||!el.closest('dialog')));
 // Outermost usable target wins (a card button holding its own image and badges is one stop);
 // a target inside one that ignores clicks (the shopkeeper's hit area) stands on its own.
 const shown=all.filter(visible),set=new Set(shown);
 return shown.filter(el=>{for(let p=el.parentElement;p&&p!==scope;p=p.parentElement)if(set.has(p))return false;return true});
}

// Picks the nearest target in a direction, weighting sideways drift so rows and columns stay straight.
export function nearest(from,list,dx,dy){
 let best=null,score=Infinity;
 for(const {el,r} of list){
  const c=center(r),vx=c.x-from.x,vy=c.y-from.y,along=vx*dx+vy*dy;
  // Overlap on the cross axis makes a target "in line" even when its centre is offset.
  const overlap=dx?Math.min(r.bottom,from.bottom)-Math.max(r.top,from.top):Math.min(r.right,from.right)-Math.max(r.left,from.left);
  const edge=dx?(dx>0?r.left-from.right:from.left-r.right):(dy>0?r.top-from.bottom:from.top-r.bottom);
  if(along<=1||edge<-Math.min(dx?r.width:r.height,dx?from.width:from.height)/2)continue;
  const side=Math.abs(vx*dy-vy*dx),s=Math.max(edge,0)+(overlap>0?0:side*2)+side*.3;
  if(s<score){score=s;best=el}
 }
 return best;
}

export function installGamepad({screen=()=>'',phaseButton=()=>null,options=()=>false,chainStep=()=>{},shopButton=()=>null,carousel=()=>null,autoPress=()=>false,cursorClass=()=>'',cursorAnchor=()=>null,jump=()=>null,settingsButton=()=>null,confirmJump=()=>null,aButton=()=>null,toggleDetails=()=>false,legend=()=>null,snap=()=>null,confirm=()=>null,steer=()=>null,covers=()=>[],startButton=()=>null,screenBack=()=>{},inspect=()=>false,back=()=>false}={}){
 if(!navigator.getGamepads)return ()=>{};
 const memory=new WeakMap();
 let raf=0,scroller=null,snapKey=null,snapIdle=true,lastPop=null,padType='xinput',legendBox=null,legendKey='',cursorKind='',menuMode=false,focus=null,lastSig='',lastWhere='',lastRect=null,cursor=null,prev=new Array(16).fill(false),heldDir=null,repeatAt=0,active=false,frame=0,holdTimer=0;
 const rest=new Map();
 const pads=()=>[...navigator.getGamepads()].filter(p=>p?.connected);
 function ensureCursor(){
  if(!cursor){cursor=document.createElement('div');cursor.className='pad-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<i></i>'}
  // A modal dialog sits in the top layer, so the cursor must live inside it to stay visible.
  const host=layer()||document.body;if(cursor.parentElement!==host)host.append(cursor);
  return cursor;
 }
 function place(){
  if(!focus?.isConnected||!active||menuMode){cursor?.classList.remove('on');return}
  // The pointer can sit on a part of the selection (a save slot's portrait) rather than the whole control.
  const r=(cursorAnchor(focus)||focus).getBoundingClientRect(),c=ensureCursor();
  // A transformed dialog becomes the fixed cursor's containing block; measure where translate(0,0) lands.
  let h={left:0,top:0};if(c.parentElement!==document.body){c.style.transition='opacity 120ms';c.style.transform='none';h=c.getBoundingClientRect()}else c.style.transition=''
  if(r.width)lastRect=r;
  c.style.transform=`translate(${Math.round(r.left-h.left-3)}px,${Math.round(r.top-h.top-3)}px)`;c.style.width=Math.round(r.width+6)+'px';c.style.height=Math.round(r.height+6)+'px';
  // Some targets (roster portraits) take only the small pointer, set further inside, instead of the ring.
  const kind=cursorClass(focus)||'';if(kind!==cursorKind){if(cursorKind)c.classList.remove(cursorKind);if(kind)c.classList.add(kind);cursorKind=kind}
  c.classList.add('on');
 }
 // The legend names what each button does here, drawn with the connected pad's own glyphs (Kenney Input Prompts, CC0).
 function glyph(key){const ps=padType!=='xinput',dir=key==='start'||key==='select'?(padType==='dualshock'?'ps4':ps?'ps':'xbox'):ps?'ps':'xbox';return `<img src="assets/pad/${dir}-${key}.svg" alt="">`}
 function showLegend(){
  const top=layer(),entries=active?legend(top):null,host=top||document.body;
  const key=entries?.length?screen()+'|'+padType+'|'+entries.map(([keys,label])=>[].concat(keys).join('+')+':'+label).join('|'):'';
  if(key===legendKey&&legendBox?.parentElement===host)return;
  legendKey=key;
  if(!key){legendBox?.classList.remove('on');return}
  if(!legendBox){legendBox=document.createElement('div');legendBox.className='pad-legend';legendBox.setAttribute('aria-hidden','true')}
  legendBox.dataset.screen=screen();
  legendBox.innerHTML=entries.map(([keys,label])=>`<span>${[].concat(keys).map(glyph).join('')}${label}</span>`).join('');
  if(legendBox.parentElement!==host)host.append(legendBox);
  legendBox.classList.add('on');
 }
 const fire=(el,type,init={})=>{const r=el.getBoundingClientRect(),p=center(r);const Ctor=type.startsWith('pointer')?PointerEvent:MouseEvent;return el.dispatchEvent(new Ctor(type,{bubbles:!['mouseenter','mouseleave','pointerenter','pointerleave'].includes(type),cancelable:true,composed:true,view:window,clientX:p.x,clientY:p.y,pointerId:7031,pointerType:'mouse',isPrimary:true,...init}))};
 function leave(el,next){if(!el?.isConnected)return;fire(el,'pointerout',{relatedTarget:next});fire(el,'mouseout',{relatedTarget:next});fire(el,'pointerleave',{relatedTarget:next});fire(el,'mouseleave',{relatedTarget:next})}
 const hover=(el,from=null)=>{fire(el,'pointerover',{relatedTarget:from});fire(el,'mouseover',{relatedTarget:from});fire(el,'pointerenter',{relatedTarget:from});fire(el,'mouseenter',{relatedTarget:from})};
 function setFocus(el,{scroll=true}={}){
  if(el===focus){place();return}
  const old=focus;old?.removeAttribute('data-pad-focus');leave(old,el);
  focus=el;if(!el){place();return}
  lastSig=signature(el);lastWhere=screen()+'|'+(layer()?.className??'page');el.setAttribute('data-pad-focus','');
  const owner=layer();if(owner?owner.contains(el):!el.closest('.action-pop'))memory.set(owner||document,{sig:lastSig,rect:el.getBoundingClientRect(),where:lastWhere});
  // Scrolling closes hover tooltips, so a selection that scrolled into view is hovered again once it settles.
  if(scroll){const y=el.getBoundingClientRect().top;el.scrollIntoView({block:'nearest',inline:'nearest'});if(el.getBoundingClientRect().top!==y)setTimeout(()=>{if(focus===el&&active&&el.isConnected){leave(el,null);hover(el)}},150)}
  // Focusing is a mouse hover: previews, tooltips and hand lift all listen for pointerover from a mouse.
  hover(el,old);
  if(el.matches('input,select,textarea'))el.focus({preventScroll:true});
  place();
 }
 function reacquire(){
  const list=candidates();if(!list.length){setFocus(null);return}
  // Each layer remembers its own selection, so closing a dialog returns to the card that opened it.
  const top=layer(),memo=memory.get(top||document)||{sig:lastSig,rect:lastRect,where:lastWhere};
  const same=list.find(el=>signature(el)===memo.sig);if(same)return setFocus(same,{scroll:false});
  let pick=list[0];
  // A new screen or dialog starts on its selected item; a re-render of the same one stays near the old spot.
  const moved=screen()+'|'+(top?.className??'page')!==memo.where;
  if(memo.rect&&!(moved&&list.some(el=>el.matches(PREFERRED)))){const p=center(memo.rect);let d=Infinity;for(const el of list){const c=center(el.getBoundingClientRect()),e=Math.hypot(c.x-p.x,c.y-p.y);if(e<d){d=e;pick=el}}}
  else pick=list.find(el=>el.matches(PREFERRED))||pick;
  setFocus(pick,{scroll:false});
 }
 function move(dx,dy){
  if(!focus?.isConnected||!visible(focus)){reacquire();if(focus)return}
  if(!focus)return;
  if(dx&&focus.matches('input[type="range"]')){const step=Number(focus.step)||1;focus.value=Number(focus.value)+dx*step;focus.dispatchEvent(new Event('input',{bubbles:true}));focus.dispatchEvent(new Event('change',{bubbles:true}));return}
  // A panel over the board (a duel prompt) hides what is under it from the mouse, so the D-pad skips it too.
  const shields=covers().map(p=>({p,r:p.getBoundingClientRect()})),under=(el,r)=>shields.some(s=>!s.p.contains(el)&&(c=>c.x>=s.r.left&&c.x<=s.r.right&&c.y>=s.r.top&&c.y<=s.r.bottom)(center(r)));
  const from=focus.getBoundingClientRect(),list=candidates().filter(el=>el!==focus).map(el=>({el,r:el.getBoundingClientRect()})).filter(({el,r})=>!under(el,r));
  // A screen can fix where a direction leads (down from the duel phase buttons goes to your own side).
  const next=steer(focus,dx,dy,from)||nearest(from,list,dx,dy);if(!next)return;
  setFocus(next);
  // Moving through the duelist roster picks each duelist, so their details show as you go.
  if(autoPress(next))press(next);
 }
 // A is exactly a mouse click: the full pointer/mouse sequence with detail 1, so tap gestures and click handlers both see it.
 function press(el){
  if(!el?.isConnected)return;
  if(el.matches('select')){const n=el.options.length;if(n){el.selectedIndex=(el.selectedIndex+1)%n;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}return}
  if(el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]),textarea')){el.focus();return}
  fire(el,'pointerdown',{button:0,buttons:1});fire(el,'mousedown',{button:0,buttons:1});
  fire(el,'pointerup',{button:0,buttons:0});fire(el,'mouseup',{button:0,buttons:0});
  if(el.isConnected)fire(el,'click',{button:0,detail:1});
 }
 // X is a long press: a touch held past every hold timer (500 ms), then released without a click.
 function longPress(el){
  if(!el?.isConnected||holdTimer)return;
  const opened=layer();
  fire(el,'pointerdown',{button:0,buttons:1,pointerType:'touch',pointerId:7032});
  holdTimer=setTimeout(()=>{holdTimer=0;if(el.isConnected)fire(el,'pointerup',{button:0,buttons:0,pointerType:'touch',pointerId:7032});
   // Screens without a hold gesture (duel cards, deck lists) still inspect the card.
   if(layer()===opened&&!document.querySelector('.action-pop'))inspect(el);
  },HOLD_MS);
 }
 // B is a right click; when nothing claims it, it closes the open dialog like its Close button.
 function rightClick(el){
  // A card's action menu closes like a tap elsewhere would, and the selection returns to the card.
  const pop=!layer()&&document.querySelector('.action-pop');
  // Menu screens treat B as their Back button before any right click.
  if(!pop&&!layer()&&screen()!=='duel'&&screenBack())return;
  if(pop){document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:7031,pointerType:'mouse',button:0,buttons:1}));document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7031,pointerType:'mouse',button:0}));if(pop.contains(focus))reacquire();return}
  const before=layer(),html=before?.textContent;let clicked=false;const saw=()=>{clicked=true};
  document.addEventListener('click',saw,true);
  try{if(el?.isConnected){fire(el,'pointerdown',{button:2,buttons:2});fire(el,'mousedown',{button:2,buttons:2});fire(el,'pointerup',{button:2,buttons:0});fire(el,'mouseup',{button:2,buttons:0});fire(el,'contextmenu',{button:2,buttons:0})}}
  finally{document.removeEventListener('click',saw,true)}
  // The duel's right click presses a visible Cancel; a dialog that is still open and untouched closes instead.
  if(before&&before.open&&layer()===before&&!clicked&&before.textContent===html)back(before);
 }
 const scrolls=(el,vertical)=>(vertical?el.scrollHeight>el.clientHeight+2:el.scrollWidth>el.clientWidth+2)&&/auto|scroll|overlay/.test(getComputedStyle(el)[vertical?'overflowY':'overflowX']);
 function findScroller(vertical){
  for(let el=focus?.parentElement;el&&el!==document.body;el=el.parentElement)if(scrolls(el,vertical))return el;
  let best=null,area=0;
  for(const el of (layer()||document.body).querySelectorAll('*')){if(!el.clientHeight||el.closest('.pad-cursor,.pad-legend')||!scrolls(el,vertical))continue;const a=el.clientWidth*el.clientHeight;if(a>area){area=a;best=el}}
  return best||document.scrollingElement;
 }
 function wake(){if(!active){active=true;document.documentElement.classList.add('pad-active');if(focus?.isConnected)hover(focus)}if(!focus?.isConnected)reacquire()}
 // Handing over to the real mouse ends the fake hover, so no tooltip or lifted card is left behind.
 function sleep(){if(!active)return;active=false;document.documentElement.classList.remove('pad-active');leave(focus,null);place();legendBox?.classList.remove('on');legendKey=''}
 function tick(now){
  raf=0;const list=pads();if(!list.length){sleep();return}
  raf=requestAnimationFrame(tick);
  const state=list.map(p=>settle(rest,p.index+':'+p.id,readPad(p))),pressed=new Array(16).fill(false);let lx=0,ly=0,rx=0,ry=0;
  const used=list.find((p,i)=>state[i].pressed.some(Boolean)||Math.abs(state[i].lx)>DEAD||Math.abs(state[i].ly)>DEAD);if(used)padType=padKind(used.id);
  for(const s of state){s.pressed.forEach((v,i)=>{if(v)pressed[i]=true});if(Math.abs(s.lx)>Math.abs(lx))lx=s.lx;if(Math.abs(s.ly)>Math.abs(ly))ly=s.ly;if(Math.abs(s.rx)>Math.abs(rx))rx=s.rx;if(Math.abs(s.ry)>Math.abs(ry))ry=s.ry}
  const dir=pressed[UP]||ly<-DEAD?'0,-1':pressed[DOWN]||ly>DEAD?'0,1':pressed[LEFT]||lx<-DEAD?'-1,0':pressed[RIGHT]||lx>DEAD?'1,0':null;
  const any=pressed.some(Boolean)||dir||Math.abs(rx)>DEAD||Math.abs(ry)>DEAD;
  if(any)wake();
  if(active){
   apply({now,dir,heldDir,any,rx,ry,downs:pressed.map((v,i)=>v&&!prev[i])});
  }
  heldDir=dir;prev=pressed;
 }
 function apply({now,dir,heldDir,any,rx,ry,downs}){
  if(!active)return;
  const down=i=>downs[i];
  // The main menu is a carousel: directions turn it and A/Start press the front card, with no cursor.
  const menu=any||frame%6===0?(layer()?null:carousel()):menuMode?carousel():null;menuMode=!!menu;
  if(menu&&menu.center&&focus!==menu.center)setFocus(menu.center,{scroll:false});
  if(dir&&(dir!==heldDir||now>=repeatAt)){repeatAt=now+(dir===heldDir?(menu?MENU_EVERY:REPEAT_EVERY):REPEAT_DELAY);const [dx,dy]=dir.split(',').map(Number);if(menu)menu.step(dx||dy);else move(dx,dy)}
  // The right stick scrolls the scroller holding the selection, else the biggest one on screen; found once per push.
  if(Math.abs(ry)>.25||Math.abs(rx)>.25){if(!scroller?.isConnected)scroller=findScroller(Math.abs(ry)>=Math.abs(rx));scroller?.scrollBy(Math.round(rx*rx*rx*8),Math.round(ry*ry*ry*8))}
  else scroller=null;
  if(down(A)||down(START)||down(SELECT)||down(BTN_B)||down(X)||down(Y)||down(LB)||down(RB)){if(!focus?.isConnected||!inLayer(focus)||!visible(focus))reacquire()}
  // A on a roster portrait confirms the duelist: it moves to START RUN rather than clicking again.
  // Some layers give A a fixed job (a fully revealed pack: Next pack); X still inspects the selected card.
  if(down(A)){const fixed=aButton(layer()),next=!fixed&&focus&&confirmJump(focus);if(fixed)press(fixed);else if(next){if(autoPress(focus))press(focus);setFocus(next)}else press(focus)}
  // Shop: RB buys, LB rerolls, Start is Next Duel, Select is Edit deck. Duel: RB/LB step the chain mode, Start confirms, Select opens Options.
  const where=screen(),shop=where==='shop'&&!layer();
  if(down(START)){if(where==='duel')press(confirm());else if(shop)press(shopButton('next'));else if((where==='characters'||where==='draft')&&!layer())press(startButton());else if(where==='title')press(focus)}
  // Select: duel Options, shop Edit deck, elsewhere the screen's or window's Settings button.
  if(down(SELECT)){if(where==='duel')options();else if(shop)press(shopButton('deck'));else press(settingsButton())}
  if(down(BTN_B))rightClick(focus);
  if(down(X))longPress(focus);
  // Y: deck editor toggles hover details (re-hovering applies it at once); elsewhere it jumps to the phase buttons.
  if(down(Y)){if(toggleDetails()){if(focus?.isConnected){leave(focus,null);hover(focus)}}else{const el=phaseButton();if(el)setFocus(el)}}
  // RB/LB: duel chain mode, shop BUY/REROLL, and on character select the variants and back to the roster.
  if(down(RB)){if(where==='duel')chainStep(1);else if(shop)press(shopButton('buy'));else if(!layer()){const el=jump(1);if(el)setFocus(el)}}
  if(down(LB)){if(where==='duel')chainStep(-1);else if(shop)press(shopButton('reroll'));else if(!layer()){const el=jump(-1);if(el)setFocus(el)}}
  // Re-renders replace elements; find the same control again, and follow layout shifts a few times a second.
  // A dialog opening or closing moves the selection into the new top layer.
  // A card's action menu (Summon, Set, ...) takes the selection when it opens.
  const pop=(frame%3===0||any)&&!layer()&&document.querySelector('.action-pop');
  if(pop&&pop!==lastPop){lastPop=pop;const first=[...pop.querySelectorAll('button')].find(visible);if(first)setFocus(first)}
  const check=++frame%6===0||any,stale=focus&&(!focus.isConnected||check&&!inLayer(focus));
  if(stale||!focus&&check)reacquire();
  else if(check)place();
  if(check){
   // A new prompt (chain, zone or target pick), or choices appearing where there were none, moves the selection onto a choice once.
   // Read-only windows (inspection, piles, log) report the prompt with no element, so closing them leaves the cursor alone.
   const s=snap();if(!s)snapIdle=true;else if(s.el&&(s.key!==snapKey||snapIdle)){snapKey=s.key;snapIdle=false;if(s.el!==focus)setFocus(s.el)}
   showLegend();
  }
 }
 const start=()=>{if(!raf&&pads().length)raf=requestAnimationFrame(tick)};
 const connected=()=>start();
 // A real mouse or touch takes over again; the cursor returns with the next controller input.
 const pointer=e=>{if(e.isTrusted&&active)sleep()};
 window.addEventListener('gamepadconnected',connected);
 window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('pointerdown',pointer,{passive:true,capture:true});
 start();
 return ()=>{cancelAnimationFrame(raf);raf=0;clearTimeout(holdTimer);window.removeEventListener('gamepadconnected',connected);window.removeEventListener('pointermove',pointer);window.removeEventListener('pointerdown',pointer,{capture:true});cursor?.remove();legendBox?.remove();sleep()};
}
