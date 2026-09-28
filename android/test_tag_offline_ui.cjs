const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');process.env.TEMP=process.env.TMP=path.resolve('temp');
const code=fs.readFileSync('android/web/tag-ui.js','utf8').replace("import {TagSession} from './tag-session.js';",'').replace('export class TagUI','class TagUI');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:924,height:416}});await page.goto('http://127.0.0.1:4197/mobile.css');
 await page.setContent('<link rel="stylesheet" href="/mobile.css"><main id="app"></main>');
 await page.addScriptTag({content:code+`;window.startUI=async()=>{const content=await fetch('/content.json').then(r=>r.json());window.ui=new TagUI({root:document.querySelector('#app'),content,profile:{unlocked:content.playable},backend:async()=>{},image:id=>'assets/cards/'+id+'.jpg',inspect:()=>{},dialog:(title,body)=>{window.dialogBody=body},onExit:()=>{}})};`});await page.evaluate(()=>startUI());
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete));await page.screenshot({path:path.resolve('temp/tag-offline-character-phone.png')});
 const roster=await page.locator('.portrait').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().bottom));assert(roster.every(y=>y<=416));assert(await page.locator('.starting-relic').isVisible());
 const views=JSON.parse(fs.readFileSync('temp/tag-ui-fixture.json','utf8'));
 for(const [name,size] of [['phone',{width:924,height:416}],['desktop',{width:1280,height:720}]]){
 await page.setViewportSize(size);await page.evaluate(view=>{ui.session={code:'TEST2',seat:view.seat,peer:{seat:view.seat},connected:true,request:async()=>{throw Error('Should not submit')}};ui.update(view)},views[0]);await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
 assert(await page.getByText('Your turn to shop',{exact:true}).isVisible());assert(await page.locator('.keeper').isVisible());await page.screenshot({path:path.resolve('temp/tag-offline-shop-'+name+'-final.png')});
 for(const selector of ['.shop-stock','.relics','.shop-reference-buttons','.tag-shop-status']){const b=await page.locator(selector).boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,selector)}
 }
 await page.evaluate(view=>ui.update(view),views[1]);assert(await page.getByText(/Waiting for /).isVisible());assert(await page.locator('[data-tag=buy]').isDisabled());
 for(const character of [37,38]){await page.evaluate(({view,character})=>{view.phase='draft';view.run.character=character;ui.tab='deck';ui.update(view)},{view:structuredClone(views[0]),character});assert.equal(await page.locator('[data-tag=card]').count(),0);assert(await page.locator('.tag-hidden-deck').isVisible());await page.locator('[data-tag=opponents]').click();assert(await page.locator('.tag-routes').isVisible())}
 await page.evaluate(view=>{view.phase='draft';view.run.selected=[0,1];view.run.opponent=view.run.routes[0];ui.localDraft=null;ui.draftKey=null;ui.update(view)},views[0]);assert(await page.locator('[data-tag=ready]').isDisabled());assert(await page.locator('.tag-deck-warning').isVisible());
 await page.evaluate(()=>ui.error(Error('Traceback (most recent call last):\nValueError: Your main deck needs 20 to 60 cards.')));assert.equal(await page.locator('.tag-status').innerText(),'Your main deck needs 20 to 60 cards.');
 console.log('PASS offline-style character/shop layouts at phone/desktop sizes, turn banner and disabled purchases, hidden fixed decks, invalid Ready prevention, concise errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
