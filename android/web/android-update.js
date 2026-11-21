export function newerVersion(remote,local){
 const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v));
 const a=parse(remote),b=parse(local);if(!a||!b)return false;
 for(let i=1;i<4;i++){if(+a[i]!==+b[i])return +a[i]>+b[i];}return false;
}
const API='https://api.github.com/repos/Thronior/ygo-rogue-duelist/releases/latest';
const MANIFEST='https://github.com/Thronior/ygo-rogue-duelist/releases/latest/download/release-manifest.json';
// GitHub is slow or blocked in mainland China and its API allows 60 calls an hour per shared IP (Discord, 2026-11-21).
// gh-proxy.org relays the release manifest with CORS; Chinese players ask it first, everyone else only if the API fails.
// Each mirror must also be in index.html's connect-src.
// The native updater checks the APK's SHA-256 and signing key, so a mirror can't swap the game (UpdatePolicy.MIRRORS).
export const MANIFEST_MIRRORS=['https://gh-proxy.org/'];
const NONE='No Android update is available from the release service.';
async function fromApi(fetcher){
 const r=await fetcher(API,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Could not check for updates. Please try again later.');
 const release=await r.json();
 if(release.draft||release.prerelease||!release.assets?.some(a=>a.name==='YGO-Rogue-Android.apk'))throw Error(NONE);
 return release.tag_name;
}
async function fromMirror(fetcher,mirror){
 const r=await fetcher(`${mirror}${MANIFEST}?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Could not check for updates. Please try again later.');
 const manifest=await r.json();
 if(!/^\d+\.\d+\.\d+$/.test(manifest.version)||!manifest.files?.['YGO-Rogue-Android.apk'])throw Error(NONE);
 return `v${manifest.version}`;
}
export async function checkAndroidUpdate(fetcher=fetch,language='en'){
 const sources=[()=>fromApi(fetcher),...MANIFEST_MIRRORS.map(m=>()=>fromMirror(fetcher,m))];
 if(language==='zh')sources.push(sources.shift());
 const build=fetcher('build.json').then(r=>{if(!r.ok)throw Error('Could not read installed version.');return r.json()});
 build.catch(()=>{});
 let latest,first;
 for(const source of sources){try{latest=await source();break}catch(error){first??=error}}
 const installed=(await build).version;
 if(latest===undefined)throw first;
 return {installed,latest,available:newerVersion(latest,installed)};
}

export async function startupAndroidUpdate({native,online,language='en',check=checkAndroidUpdate,prompt}){
 if(!native?.openUpdate||online===false)return;
 try{const update=await check(undefined,language);if(update.available)await prompt(update.latest.replace(/^v/,''));}catch{/* Offline startup and unavailable update services must not interrupt play. */}
}
