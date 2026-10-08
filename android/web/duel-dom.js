// Retain the board DOM between snapshots. The previous template describes only
// renderer-owned nodes; animation overlays and LP meters are owned by their effects.
const states=new WeakMap();
export function clearDuelDOM(container){states.delete(container)}
const key=node=>{
 if(node.nodeType!==1)return '#'+node.nodeType;
 for(const attr of ['id','data-zone','data-pile','data-hand','data-phase','data-stat'])if(node.hasAttribute(attr))return node.tagName+':'+attr+':'+node.getAttribute(attr);
 return node.tagName+':'+(node.getAttribute('class')||'').split(' ')[0];
};
export function renderDuelDOM(container,html){
 const template=document.createElement('template');template.innerHTML=html;
 const next=template.content.firstElementChild;
 let state=states.get(container);
 const stats={created:0,removed:0,attributes:0,text:0};
 const refs=new WeakMap();
 function create(v){
  const live=v.cloneNode(false);refs.set(v,live);stats.created++;
  for(const child of v.childNodes)live.append(create(child));
  return live;
 }
 function update(old,v,live){
  refs.set(v,live);
  if(v.nodeType!==1){if(old.nodeValue!==v.nodeValue){live.nodeValue=v.nodeValue;stats.text++}return;}
  // Move cues insert their own card image. It is temporary presentation, not a
  // template node: remove it before reconciling, even when the zone is now empty.
  // Otherwise the extra image covers stat labels and survives card removal.
  if(v.hasAttribute('data-zone')){
   const owned=new Set([...old.childNodes].map(n=>state.refs.get(n)));
   for(const image of [...live.children].filter(n=>n.tagName==='IMG')){
    if(!owned.has(image)){image.remove();stats.removed++;}
   }
   for(const name of ['empty','defense'])live.classList.toggle(name,v.classList.contains(name));
  }
  const attrs=new Set([...old.attributes,...v.attributes].map(a=>a.name));
  for(const name of attrs){
   const before=old.getAttribute(name),after=v.getAttribute(name);if(before===after)continue;
   if(name==='class'){
    const a=new Set((before||'').split(/\s+/).filter(Boolean)),b=new Set((after||'').split(/\s+/).filter(Boolean));
    for(const x of a)if(!b.has(x))live.classList.remove(x);
    for(const x of b)if(!a.has(x))live.classList.add(x);
   }else if(name==='style'){
    for(const property of old.style)if(!v.style.getPropertyValue(property))live.style.removeProperty(property);
    for(const property of v.style)if(old.style.getPropertyValue(property)!==v.style.getPropertyValue(property))live.style.setProperty(property,v.style.getPropertyValue(property),v.style.getPropertyPriority(property));
   }else if(after===null)live.removeAttribute(name);else live.setAttribute(name,after);
   stats.attributes++;
  }
  // Card taps replace this preview outside the board reconciler. Never merge
  // its old detached children with the freshly rendered card details.
  if(v.classList.contains('inspection')){if(live.innerHTML!==v.innerHTML)live.innerHTML=v.innerHTML;return;}
  const buckets=new Map();
  for(const child of old.childNodes){const k=key(child);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(child)}
  let previous=null;
  for(const child of v.childNodes){
   const prior=buckets.get(key(child))?.shift();let element=prior&&state.refs.get(prior);
   // Counter painters set textContent, replacing the text node but not its label.
   if(prior&&child.nodeType===3&&element?.parentNode!==live)element=[...live.childNodes].find(n=>n.nodeType===3);
   if(!element||element.parentNode!==live){
    // Move cues can replace zone art themselves before the settled snapshot.
    if(prior&&child.nodeName==='IMG')for(const image of [...live.children].filter(n=>n.tagName==='IMG'))image.remove();
    element=create(child);
   }else update(prior,child,element);
   // Ignore effect-owned siblings while preserving the template's ordering.
   if(!element.parentNode)live.insertBefore(element,previous?previous.nextSibling:live.firstChild);
   else if(previous&&previous.compareDocumentPosition(element)&Node.DOCUMENT_POSITION_PRECEDING)live.insertBefore(element,previous.nextSibling);
   previous=element;
  }
  for(const bucket of buckets.values())for(const prior of bucket){const element=state.refs.get(prior);if(element?.parentNode===live){element.remove();stats.removed++}}
 }
 if(!state||state.root.parentNode!==container){
  const root=create(next);container.replaceChildren(root);state={root};
 }else update(state.tree,next,state.root);
 state.tree=next;state.refs=refs;states.set(container,state);
 return stats;
}
