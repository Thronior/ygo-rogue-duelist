const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');process.env.TEMP=process.env.TMP=path.resolve('temp');
const code=fs.readFileSync('android/web/tag-ui.js','utf8').replace("import {TagSession} from './tag-session.js';",'').replace('export class TagUI','class TagUI');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const desktop of [true,false]){
 const page=await browser.newPage({viewport:{width:924,height:416}});
 await page.route('http://shadow.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><main id="app"></main>'}));await page.goto('http://shadow.test/'+(desktop?'?desktop=test':''));
 await page.addStyleTag({content:fs.readFileSync('android/web/mobile.css','utf8')});
 await page.addScriptTag({content:`class TagSession{constructor(){this.peer={seat:1};this.seat=1}async join(code){window.submitted=code;this.code=code;return {code}}}\n${code}\nwindow.ui=new TagUI({root:document.querySelector('#app'),content:{playable:[0],characters:[{name:'Yugi',sprite:'none',starting_relic:'none',cards:[],random_packs:true}],artifactInfo:{},artifacts:{},cards:[],packs:[]},profile:{unlocked:[0]},backend:()=>{},image:()=>'',inspect:()=>{},dialog:()=>{},onExit:()=>{}});ui.endpoint=async()=> 'https://example.test';`});
 await page.locator('[data-tag=join]').click();assert.equal(await page.locator('#tag-code').getAttribute('readonly')!==null,desktop);
 if(!desktop){assert.equal(await page.locator('.tag-code-keyboard').count(),0);await page.locator('#tag-code').fill('AB234');assert.equal(await page.evaluate(()=>ui.joinCode),'AB234');await page.close();continue}
 for(const size of [{width:924,height:416},{width:1280,height:720},{width:1024,height:768}]){
 await page.setViewportSize(size);await page.locator('[data-tag=code-clear]').click();
 for(const key of 'AB234Z')await page.locator(`[data-key="${key}"]`).click();assert.equal(await page.locator('#tag-code').inputValue(),'AB234');
 await page.locator('[data-tag=code-delete]').click();await page.locator('[data-key="5"]').click();assert.equal(await page.locator('#tag-code').inputValue(),'AB235');
 const box=await page.locator('.tag-code-keyboard').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height);
 const join=await page.locator('[data-tag=join-room]').boundingBox();assert(join.y+join.height<=size.height);
 }
 await page.locator('[data-tag=join-room]').click();assert.equal(await page.evaluate(()=>window.submitted),'AB235');await page.close();
 }
 console.log('PASS desktop mouse-only code entry, five-character limit, Backspace/Clear, Join receives entered code, fits 924x416/1280x720/1024x768; mobile retains normal input.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
