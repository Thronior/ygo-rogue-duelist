# Android private experiment

Install `../releases/YGO-Rogue-Android.apk` on Android 10 or newer. Use a current Android System WebView. The APK includes every eligible card image, token, booster image, character, music track, campaign rule and duel script; no network connection or account is required.

This build uses the real Project Ignis duel core through `ocgcore-wasm`, with a touch UI patterned after the classic desktop/Tag Force field. It does **not** embed the native EDOPro Android GUI. The desktop still uses the customized native EDOPro client. Native Android GUI integration needs an Android build of the customized client and its campaign-result bridge; the existing online client cannot report this campaign's rewards and results automatically.

The Python campaign modules are copied unchanged into the APK and run offline with Pyodide. Characters, draft packs, deck lists, shops, relic effects, achievements and saved progression therefore come from the same source as desktop. Relic effects run as Lua effects inside the duel core. The mobile opponent decision layer is in `web/duel.js`; it is separate from the desktop C++ opponent.

## Updating

Run `../Build Desktop and Android.cmd`. It rebuilds the native desktop client when its sources change, then synchronizes the campaign/data/art and produces a signed APK. Reinstall that APK over the existing app to preserve saves. Keep `signing/private-experiment.jks`: replacing the signing key prevents in-place updates. This is a local test signing key, not a public-release credential.

`../tools/build_android.py --sync-only` refreshes the mobile assets without packaging. Build tools and the JDK live under `../dependencies/android` on D:. `web/build.json` records the shared-campaign checksum.

Saves are app-private and use Android AtomicFile plus the desktop checksummed JSON/backup format. Duel responses are journaled and replayed on Continue. Desktop and Android progress are separate; there is no cloud synchronization. Uninstalling the Android app deletes its private save.

## Controls

- Tap your card, then its floating action button. Tap a glowing zone to place it.
- Phase buttons sit between the monster rows. Effect and target choices appear over the field.
- Tap a card to update the left preview; Inspect opens its complete text.
- Both players have five monster zones, five Spell/Trap zones, Field Spell, Main Deck, Extra Deck, Graveyard and Banished piles. Opponent hand/set cards remain hidden.
- Tap a visible pile to browse it. The opponent's deck and Extra Deck are private.
- Save / Menu pauses the duel. Continue resumes it, including after closing the app.
- Testing code: Settings → Testing → `heartofthecards`.

## Sources and licenses

- [Project Ignis EDOPro](https://github.com/edo9300/edopro) and [Android GUI source](https://github.com/edo9300/edopro-android).
- [ocgcore-wasm](https://github.com/n1xx1/ocgcore-wasm), version 0.1.2; MIT wrapper with Project Ignis core licensing.
- [Pyodide](https://pyodide.org/), version 0.27.7; Mozilla Public License 2.0 runtime.
- Card/character/game images and music remain copyrighted by their original owners. See `../assets/CREDITS.md` and the runtime texture/sound credits. Private, unofficial fan experiment.
