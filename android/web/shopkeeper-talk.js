// The shopkeeper talks: one line at a time in a pixel-art speech bubble above his head, for 4 seconds.
// A new line replaces the old one. Lines wait while a dialog (receipt, purchases, pack opening) covers the
// shop, so they are seen. Landscape only: mobile.css hides the bubble in portrait, where he is hidden too.
const LINES={
 welcome:['Welcome to my shop!','Ah, a customer! Come in, come in.','Welcome! Take a look around.','Fresh stock, just for you.','Welcome back, duelist!','Browse all you like. Buying is better.','Step right up! Everything is for sale.','Welcome! Mind the price tags.'],
 ultra:['Ooh, one of my best cards!','An Ultra Rare! You have a good eye.','I was saving that one for someone special.','That card is a real treasure.','Now that is a premium pick!','Hard to part with that one...','The crown jewel of my shelf. Sold!','You won’t find a rarer card around here.','Collectors would fight over that one.','Top-shelf taste, I see!'],
 premiumRelic:['Good choice. I recommend that relic myself.','That relic is worth every coin.','A fine relic! It will carry you far.','My personal favourite. No regrets.','Strong stuff. Use it wisely.','That one is a staff pick!','Premium relic for a premium duelist.','I would have kept that one myself.','Ah, the good stuff. Smart buy.','That relic has won a lot of duels.'],
 pack:['Packs! My bestsellers.','May the rare cards find you.','Nothing beats that fresh-pack smell.','I had a good feeling about that pack.','Fresh packs, fresh chances!','Hope you pull something shiny.','Every pack is a little adventure.','No refunds on bad pulls, mind you.','Something rare was in there, I bet.','Come back for more packs anytime!'],
 relic:['A relic! Fine taste.','That one has a story behind it.','Handle it with care.','Relics make the duelist, they say.','A little edge never hurts.','Pleasure doing business!','That will serve you well.','Found that one in an old ruin.','Ancient power, fair price.','One relic, coming right up.'],
 single:['Good pick! That fits your deck.','Building something nice, are we?','Singles! The smart duelist’s choice.','No gambling, just the cards you want.','Fine cards for a fine deck.','Hand-picked. I like it.','Your deck thanks you.','Solid choice. Solid card.','That’s a card I would play too.','Thank you kindly!'],
 mixed:['Quite the shopping spree!','A little of everything, eh?','Now that is a proper haul!','You’re my favourite customer today.','Business is booming!','Bit of everything! I like your style.','Big spender! I like it.','Let me bag all that up for you.','A balanced diet of goods. Excellent.','Come back soon, and bring more coins!'],
 poke:['Hey! Hands off!','Stop that!','Touch the cards, not me!','Ow! What was that for?','I’m not for sale!','Personal space, please.','Do you mind?','Poke me again and prices go up.','The merchandise is over there!','Careful! I bruise easily.'],
 reroll:['Let me show you my other wares.','Not your style? Try these!','Fresh stock, coming up!','Maybe you’ll like these better.','I have plenty more in the back.','Picky, picky! How about these?','Okay, okay. Feast your eyes on this.','One moment... there we go!','These just came in.','Something here should catch your eye.'],
};
const SHOW_MS=4000,last={};
let bubble=null,hideTimer=0,flushTimer=0,queued=null;
function pick(kind){const list=LINES[kind];let i;do i=Math.floor(Math.random()*list.length);while(list.length>1&&i===last[kind]);last[kind]=i;return list[i]}

// What a purchase says: an Ultra Rare first, then a relic of 120+ coins, then the mix of kinds bought.
export function purchaseLine(items){
 if(items.some(x=>x.ultra))return 'ultra';
 if(items.some(x=>x.kind==='artifact'&&x.price>=120))return 'premiumRelic';
 const kinds=new Set(items.map(x=>x.kind==='artifact'?'relic':x.kind==='single'?'single':'pack'));
 return kinds.size===1?[...kinds][0]:'mixed';
}

const keeperOf=()=>document.querySelector('.page.shop .secret-shopkeeper');
export function hush(){queued=null;clearTimeout(hideTimer);clearTimeout(flushTimer);bubble?.remove();bubble=null}
// A moment's delay lets a dialog the same action opens (the victory receipt, a purchase) claim the screen first.
export function say(kind){
 if(!LINES[kind])return;
 hush();queued=kind;flushTimer=setTimeout(flush,120);
}
function flush(){
 if(!queued)return;
 const open=document.querySelector('dialog[open]');
 // A dialog covers the shop: speak once it closes (another dialog may follow it straight away).
 if(open){open.addEventListener('close',()=>{if(!queued)return;clearTimeout(flushTimer);flushTimer=setTimeout(flush,350)},{once:true});return}
 // A toast (an achievement after a purchase, say) shows in the same top corner as his head: wait it out.
 const toast=document.querySelector('#toast.show');
 if(toast){const watch=new MutationObserver(()=>{if(toast.classList.contains('show'))return;watch.disconnect();if(!queued)return;clearTimeout(flushTimer);flushTimer=setTimeout(flush,300)});watch.observe(toast,{attributes:true,attributeFilter:['class']});return}
 // He is hidden (portrait, or a layout without him): the line is dropped, not saved for later.
 const keeper=keeperOf();if(!keeper?.getClientRects().length){queued=null;return}
 const kind=queued;queued=null;
 bubble=document.createElement('div');bubble.className='keeper-bubble';bubble.setAttribute('role','status');bubble.textContent=pick(kind);
 document.body.append(bubble);place();
 const el=bubble;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{opacity:0,transform:'translateY(6px) scale(.85)'},{opacity:1,transform:'none'}],{duration:180,easing:'steps(4,end)'});
 hideTimer=setTimeout(()=>{const out=el.animate([{opacity:1},{opacity:0}],{duration:200,easing:'steps(4,end)',fill:'forwards'});out.finished.catch(()=>{}).finally(()=>{el.remove();if(bubble===el)bubble=null})},SHOW_MS);
}

// Above his head: the art is 561 x 592 and his crown sits 4% from the top at 61% across. The image is
// object-fit: contain and anchored to the bottom centre, so the drawn box is worked out from the button.
export function place(){
 if(!bubble)return;
 const keeper=keeperOf();if(!keeper){hush();return}
 const box=keeper.getBoundingClientRect();if(!box.width||!box.height){bubble.hidden=true;return}
 bubble.hidden=false;
 const ratio=561/592,drawnW=Math.min(box.width,box.height*ratio),drawnH=drawnW/ratio,left=box.left+(box.width-drawnW)/2,top=box.bottom-drawnH;
 const tipX=left+drawnW*.61,tipY=top+drawnH*.04,width=bubble.offsetWidth,height=bubble.offsetHeight,tail=12;
 const x=Math.max(8,Math.min(innerWidth-8-width,tipX-width/2)),y=Math.max(6,tipY-height-tail);
 bubble.style.left=Math.round(x)+'px';bubble.style.top=Math.round(y)+'px';
 bubble.style.setProperty('--tail-x',Math.round(Math.max(14,Math.min(width-14,tipX-x)))+'px');
}

// Where the shopkeeper can be poked: his head and body, not the empty corners of his picture.
export function placeHitArea(keeper){
 const hit=keeper?.querySelector(':scope>.keeper-hit');if(!hit)return;
 const w=keeper.clientWidth,h=keeper.clientHeight;if(!w||!h)return;
 const ratio=561/592,drawnW=Math.min(w,h*ratio),drawnH=drawnW/ratio,left=(w-drawnW)/2,top=h-drawnH;
 Object.assign(hit.style,{left:Math.round(left+drawnW*.3)+'px',top:Math.round(top+drawnH*.04)+'px',width:Math.round(drawnW*.55)+'px',height:Math.round(drawnH*.6)+'px'});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hush()});
