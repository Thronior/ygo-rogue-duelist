# YGO Rogue — installable web preview (0.1.18)

This standalone web edition reuses the current mobile game. Native Windows, Android and iOS source releases are unchanged.

## Local preview

Serve the extracted web folder with an HTTP server that serves `.js` and `.mjs` as JavaScript and `.wasm` as `application/wasm`. Open its localhost URL. Opening `index.html` directly as a file will not work.

## Hosting and iPhone installation

Publish the contents of the web archive to an HTTPS static host. The archive has 4,216 files, all smaller than 25 MiB. For Cloudflare Pages, use Wrangler Direct Upload rather than the dashboard drag-and-drop uploader (this bundle is large):

```
npx wrangler pages deploy <extracted-web-folder> --project-name <your-project>
```

On iPhone, open the HTTPS link in Safari, use Share → Add to Home Screen, and enable Open as Web App. Launch the home-screen icon. Landscape is recommended; rotate manually if iOS does not honor the orientation preference.

In game Settings, choose **Install, offline play & save backups**, then **Download / update offline game**. Keep the app open until the download is complete. The complete uncompressed offline payload is about 212 MiB; downloads may use less bandwidth when the host compresses responses. Offline single-player play is supported. Multiplayer still needs the existing online service.

Saves, including the three run slots, stay in IndexedDB on this browser/origin. Updates preserve them. Use Export save backup and Import save backup to move progress or protect it before clearing browser data. Desktop/Android saves are not automatically synchronized. Keep using the same public origin for future releases.

Updates download a complete new cache and activate only after all game windows close. An incomplete download leaves the previous installed version available. Publish the full build as one deployment; do not mix files from different versions.

## Validation

- Chrome: campaign startup, real WebAssembly duels, save export/import, offline installation, offline reload and duel, cached audio range responses.
- Windows WebKit 26.5: campaign startup, real WebAssembly duel, save export/import, offline installation. With the test server unavailable: offline reload and a completed duel without game-engine errors.
- Service-worker failure/update lifecycle: failed download keeps the previous version; a waiting update does not replace the active game; closing windows allows the next version to activate.
- All 13,506 card scripts are preserved across four smaller files.
- Mobile landscape title/settings screenshots inspected.

Windows WebKit is not an actual iPhone. iOS home-screen installation, device memory pressure, audio playback and suspension/resume still need a physical-device test. Playwright's Windows WebKit offline-emulation switch failed internally; offline behavior was instead verified by making the server unavailable.

The build is not publicly hosted yet. The local preview URL works only on this PC. iPhone home-screen/offline testing requires an HTTPS deployment.

## Rebuild

Run `tools/build_android.py --sync-only` to update shared campaign/assets when needed. Then run `python tools/build_pwa.py --output <new-empty-output-folder>`. The builder creates that folder and an adjacent ZIP. Do not build over an existing output directory.
