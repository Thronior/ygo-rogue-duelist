// Tag's Absolute Random pack (Discord, Onre64, 2026-11-22): after a victory the free Random Pack opens over the reward
// window, and a pulled card's window opened underneath the pack, out of sight. The card window must show on top, close
// back to the pack, and leave the reward window as it was. Also the DNA Rewrite window closing once the teammate chose.
// Start the web server first: PORT=4298 python -B tools/serve_qa.py ; then node android/test_tag_random_pack_inspect.cjs [--web=...]
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const web=process.argv.find(a=>a.startsWith('--web='))?.slice(6)||'http://127.0.0.1:4298';
const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tag-random-')),'views.json');
execFileSync(path.resolve('python/python.exe'),['-B','-c',`
import sys,json,uuid
sys.path.insert(0,'.')
import storage
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1,2,3];p['character_levels']={'0':2}
s=TagCampaign([0,2],[p,p],level=0,seed=5)
def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
for seat in (0,1):command(seat,'auto')
s.shared['artifacts']=s.shared['artifacts']+['absolute_random'];s.sync()
r=s.players[0]['routes']
command(1,'ready',{'opponent':r[1],'selected':s.players[1]['selected']})
command(0,'ready',{'opponent':r[0],'selected':s.players[0]['selected']})
s.finish(0,7000,[]);s.shared['artifacts']=s.shared['artifacts']+['dna_rewrite'];s.sync()
views={'shop':s.view(1)}
command(0,'choose-monster-type','Dragon');views['typed']=s.view(1)
open(sys.argv[1],'w',encoding='utf8').write(json.dumps(views))
`,out],{stdio:'inherit'});
const views=JSON.parse(fs.readFileSync(out,'utf8'));
assert(views.shop.run.free_packs?.[0]?.cards?.length===9,'Absolute Random gave a free Random Pack');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('ygo-preload-visuals','sounds');HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});
 for(let attempt=0;;attempt++){await page.goto(web+'/?tagtest=1');try{await page.waitForFunction(()=>window.shadowTest,null,{timeout:90000});break}catch(error){if(attempt>=3)throw error}}
 await page.evaluate(()=>{document.querySelector('#modal')?.close();const b=document.createElement('button');b.dataset.do='tag';document.body.append(b);b.click();b.remove()});await page.waitForFunction(()=>window.tagTest?.ui);
 // The view as the guest's device gets it: the pack's cards are built from the shared seeds first (TagSession.ensureRandom).
 await page.evaluate(async view=>{const ui=tagTest.ui;localStorage.setItem('tag-starting-packs:TEST2:'+view.seat+':'+view.run.started_at,'1');
  const built=await shadowTest.command('draft-random-cards',{players:view.randomBoosters});ui.randomCards.add(built.cards);
  window.sent=[];ui.session={code:'TEST2',seat:view.seat,peer:{seat:view.seat},connected:true,randomLoad:Promise.resolve(),request:async(a,v)=>{sent.push(a);return null},stats:()=>null};
  ui.tab='opponents';ui.update(view)},views.shop);
 const theatre=page.locator('dialog.pack-theatre[open]');await theatre.waitFor();
 assert(await page.evaluate(()=>document.querySelector('#modal').open),'the reward window is open under the pack');
 const rewards=await page.evaluate(()=>document.querySelector('#modal').innerHTML);
 await theatre.locator('.pack-open').click();await theatre.locator('.pack-skip').click();
 const pulled=theatre.locator('[data-inspect]').nth(2);await pulled.waitFor();const id=Number(await pulled.getAttribute('data-inspect'));
 assert(id>=191000000,'a randomized card');
 await pulled.click();
 // On top: the point at the card window's centre belongs to #modal, not to the pack opening.
 const top=await page.evaluate(()=>{const m=document.querySelector('#modal'),r=m.getBoundingClientRect();return {title:m.querySelector('h2')?.textContent,hit:document.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,60))?.closest('dialog')?.id||''}});
 assert.equal(top.hit,'modal','the card window shows above the pack');
 assert.equal(top.title,await page.evaluate(id=>tagTest.ui.content.cards.find(c=>c.id===id)?.name,id),'it is the pulled card');
 await page.locator('#modal [data-do="close"]').click();
 assert(await page.evaluate(()=>document.querySelector('dialog.pack-theatre').open),'closing the card returns to the pack');
 const back=await page.evaluate(()=>{const t=document.querySelector('dialog.pack-theatre'),r=t.querySelector('[data-inspect]').getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('dialog')===t});
 assert(back,'and the pack is on top again');
 assert.equal(await page.evaluate(()=>document.querySelector('#modal').innerHTML),rewards,'the reward window is untouched');
 await theatre.locator('.pack-next').click();await page.waitForFunction(()=>!document.querySelector('dialog.pack-theatre'));
 assert(await page.evaluate(()=>document.querySelector('#modal').open),'the reward window is still open');
 assert.deepEqual(await page.evaluate(()=>sent),['free-packs-seen']);
 // DNA Rewrite: offered to this partner, closed by itself once the teammate's choice arrives.
 await page.evaluate(view=>{document.querySelector('#modal').close();view.run.free_packs=[];delete view.run.reward_slots;tagTest.ui.update(view)},structuredClone(views.shop));
 await page.waitForFunction(()=>document.querySelector('#modal').open&&document.querySelector('#modal [data-do="choose-monster-type"]'));
 await page.evaluate(view=>{view.run.free_packs=[];delete view.run.reward_slots;tagTest.ui.update(view)},structuredClone(views.typed));
 await page.waitForFunction(()=>!document.querySelector('#modal').open,null,{timeout:5000});
 assert.deepEqual(await page.evaluate(()=>sent),['free-packs-seen'],'nothing more was sent');
 assert.deepEqual(errors,[]);
 console.log('Tag random pack inspect OK');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
