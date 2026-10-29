# Android app

> **Platform status:** The native Windows desktop edition is deprecated and is no longer maintained or distributed. The supported versions are this Android app and the webapp; the webapp also works in desktop browsers. Existing saves from the deprecated native app can be imported through the webapp Settings.

Install `../releases/YGO-Rogue-Android.apk` on Android 10 or newer. Use a current Android System WebView. The APK includes every eligible card image, token, booster image, character, music track, campaign rule and duel script; no network connection or account is required.

This build uses the Project Ignis duel core through `ocgcore-wasm`, with a touch-friendly field layout. It does not embed the native EDOPro GUI.

The Python campaign modules are copied into the APK and run offline with Pyodide. Characters, draft packs, deck lists, shops, relic effects, achievements and progression use the shared campaign data. Relic effects run as Lua effects inside the duel core. The mobile opponent decision layer is in `web/duel.js`.

## Updating

Run `../Build Android and Web.cmd` to build the supported Android and web outputs. Reinstall the APK over the existing app to preserve saves. Keep `signing/private-experiment.jks`: replacing the signing key prevents in-place updates. This is a local test signing key, not a public-release credential.

`../tools/build_android.py --sync-only` refreshes the mobile assets without packaging. Build tools and the JDK live under `../dependencies/android` on D:. `web/build.json` records the shared-campaign checksum.

Saves are app-private and use Android AtomicFile. Duel responses are journaled and replayed on Continue. Android and browser progress are separate; there is no automatic cloud synchronization. Uninstalling the Android app deletes its private save.

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
