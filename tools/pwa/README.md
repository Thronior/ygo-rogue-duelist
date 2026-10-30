# YGO Rogue — installable webapp

> **Platform status:** The native Windows desktop edition is deprecated and is no longer maintained or distributed. The supported versions are the webapp and Android app. The webapp remains supported in desktop browsers; this is not the retired native desktop client.

This installable webapp shares campaign rules and assets with the Android game.

## Local preview

Serve the extracted web folder with an HTTP server that serves `.js` and `.mjs` as JavaScript and `.wasm` as `application/wasm`. Open its localhost URL. Opening `index.html` directly as a file will not work.

## Hosting and iPhone installation

Publish the contents of the web archive to an HTTPS static host. The archive has 4,216 files, all smaller than 25 MiB. For Cloudflare Pages, use Wrangler Direct Upload rather than the dashboard drag-and-drop uploader (this bundle is large):

```
npx wrangler pages deploy <extracted-web-folder> --project-name <your-project>
```

On iPhone, open the HTTPS link in Safari, use Share → Add to Home Screen, and enable Open as Web App. Launch the home-screen icon. Landscape is recommended; rotate manually if iOS does not honor the orientation preference.

In game Settings, choose **Install, offline play & save backups**, then **Download / update offline game**. Keep the app open until the download is complete. The complete uncompressed offline payload is about 212 MiB; downloads may use less bandwidth when the host compresses responses. Offline single-player play is supported. Multiplayer still needs the existing online service.

Saves, including the three run slots, stay in IndexedDB on this browser/origin. Updates preserve them. Use Export save backup and Import save backup to move progress or protect it before clearing browser data. Browser and Android saves are not automatically synchronized. Import existing saves from the deprecated native desktop edition through webapp Settings. Keep using the same public origin for future releases.

Offline files are stored once, keyed by content hash (`ygo-offline-files`), so an update downloads only files whose contents changed. A finished update waits until the player taps **Update ready · Restart** on the main menu (offered only when no other game window is open) or closes every game window. On every online start, `web-boot.js` first reads `live-version.json` (never cached, not stored offline); if the deployment is newer, it applies the update and reloads, so a normal refresh is enough. Offline starts skip the check, and a blocked update (another game tab open) boots the current copy and retries on the next refresh. The itch build does not use it, since each itch upload has its own URL. A failed download leaves the previous version in use and keeps the verified files for the retry. Downloaded files must match the build's hashes; a file from another deployment is not stored and loads online.

Saves come first. The worker keeps 64 MiB of browser storage free. If a download runs out of space, it removes what it added (and, if saves still lack room, the whole offline copy); an update then installs online-only and later updates skip downloading until the player downloads again from Settings. The first update to this worker deletes the per-version caches (`ygo-rogue-*`) that older workers left behind, reusing the active copy's unchanged files.

Publish the full build as one deployment; do not mix files from different versions.

## Validation

- Chrome: campaign startup, real WebAssembly duels, save export/import, offline installation, offline reload and duel, cached audio range responses.
- Windows WebKit 26.5: campaign startup, real WebAssembly duel, save export/import, offline installation. With the test server unavailable: offline reload and a completed duel without game-engine errors.
- Service-worker failure/update lifecycle: failed download keeps the previous version; a waiting update does not replace the active game; closing windows or the main-menu restart activates the next version; updates download only changed files; storage-quota failures leave room for saves; old per-version caches are migrated and removed.
- All 13,506 card scripts are preserved across four smaller files.
- Mobile landscape title/settings screenshots inspected.

Windows WebKit is not an actual iPhone. iOS home-screen installation, device memory pressure, audio playback and suspension/resume still need a physical-device test. Playwright's Windows WebKit offline-emulation switch failed internally; offline behavior was instead verified by making the server unavailable.

The build is not publicly hosted yet. The local preview URL works only on this PC. iPhone home-screen/offline testing requires an HTTPS deployment.

## Rebuild

Run `tools/build_android.py --sync-only` to update shared campaign/assets when needed. Then run `python tools/build_pwa.py --output <new-empty-output-folder>`. The builder creates that folder and an adjacent ZIP. Do not build over an existing output directory.
