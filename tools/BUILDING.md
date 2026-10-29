# Supported builds

The native Windows desktop edition is deprecated and no longer maintained. Only Android APK and the webapp are supported. The webapp works in desktop browsers; that does not use the retired native desktop client. Xcode exports are also retired.

Set VERSION, then run `Build Android and Web.cmd`, or use `python/python.exe -B tools/build_android.py` and `python/python.exe -B tools/build_pwa.py --output releases/web-VERSION`. The web output must be a new directory. Publishing is a separate step. The script uses the project's own `python/python.exe` when it exists, otherwise an installed Python 3 (`py` or `python`) with Pillow; with an installed Python, run the commands with `python` instead of `python/python.exe`.

Release check (every version): the main menu footer must show `v<VERSION>` at the bottom-left. It reads the build-generated `android/web/replay-version.js`, which `tools/build_android.py` refreshes from `VERSION`; never hard-code the label. Verify the displayed version in both the Android release candidate and the web release candidate before publishing.

## What packaging changes

Both builds pass `android/web` through `tools/package_assets.py`. Source files are never changed, only the packaged copies:

- **Images become WebP under their original names.** `cards/12345.jpg` in the APK or web build contains WebP data. Browsers and the Android WebView detect the format from the file contents, so no code or data paths change. A file is replaced only when that saves at least 10%. Small and palette PNGs (pixel art) are encoded losslessly. Encoded files are cached in `temp/build/packaged-assets`; to re-encode everything, change the `VERSION` constant in `tools/package_assets.py` (not the project's `VERSION` file).
- **Only the card scripts and engine data a duel can reach are packaged.** That means every card ID in the game content, decks, collector and draft catalogs, campaign code and client code, plus cards those cards' scripts mention. The source `android/web/scripts.json` and `engine-data.json` stay complete for tools and simulations.
- **EDOPro textures that no client file mentions by name are left out.** Their credit notices are kept.

`tools/test_package_assets.py` and `android/test_packaged_engine.mjs` check that packaged images decode and look the same, and that duels play identically with the packaged scripts. The first Android delta update after this change is large, because almost every image changed once.

Keep shared campaign code, assets, runtime scripts/data, Python, Node and Android dependencies. Preserve saves for import into the webapp. Never restore the old desktop installers or patcher.
