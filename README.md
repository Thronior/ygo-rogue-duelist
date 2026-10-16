# Yu-Gi-Oh! Rogue Duelist

> **Platform status:** The native Windows desktop edition is deprecated and is no longer maintained or distributed. The supported versions are the webapp and Android app. Playing the webapp in a desktop browser remains supported. Existing saves from the deprecated native app can be imported through the webapp Settings.

## Play

- **Webapp:** [itch.io](https://thronior.itch.io/ygo-rogue)
- **Android:** install `releases/YGO-Rogue-Android.apk` on Android 10 or newer. See [android/README.md](android/README.md) for controls and save behavior.

The game is an unofficial fan project. Yu-Gi-Oh! cards, characters, artwork and music belong to their respective owners.

## Build and edit

The maintained outputs are the webapp and Android APK. Run `Build Android and Web.cmd` to build both; publishing is a separate step. For an asset/data synchronization without producing an APK, run:

```powershell
python/python.exe -B tools/build_android.py --sync-only
```

See [tools/BUILDING.md](tools/BUILDING.md), [data/EDITING.md](data/EDITING.md), and [multiplayer/cloudflare/README.md](multiplayer/cloudflare/README.md) for current development notes.

Do not use the retired native Windows launcher, client, installer, patcher or native build scripts. Shared campaign rules, card data, assets and runtime scripts remain in the project because the supported web and Android builds use them.
