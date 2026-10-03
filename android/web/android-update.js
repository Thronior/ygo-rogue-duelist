export function newerVersion(remote,local){
 const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v));
 const a=parse(remote),b=parse(local);if(!a||!b)return false;
 for(let i=1;i<4;i++){if(+a[i]!==+b[i])return +a[i]>+b[i];}return false;
}
export async function checkAndroidUpdate(fetcher=fetch){
 const [build,release]=await Promise.all([
  fetcher('build.json').then(r=>{if(!r.ok)throw Error('Could not read installed version.');return r.json()}),
  fetcher('https://api.github.com/repos/Thronior/ygo-rogue-duelist/releases/latest',{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('Could not check for updates. Please try again later.');return r.json()})
 ]);
 const asset=release.assets?.find(a=>a.name==='YGO-Rogue-Android.apk');
 if(release.draft||release.prerelease||!asset)throw Error('No Android update is available from the release service.');
 return {installed:build.version,latest:release.tag_name,available:newerVersion(release.tag_name,build.version)};
}

export async function startupAndroidUpdate({native,online,check=checkAndroidUpdate,prompt}){
 if(!native?.openUpdate||online===false)return;
 try{const update=await check();if(update.available)await prompt(update.latest.replace(/^v/,''));}catch{/* Offline startup and unavailable update services must not interrupt play. */}
}
