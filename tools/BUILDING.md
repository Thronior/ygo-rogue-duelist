# Supported builds

The native Windows desktop edition is deprecated and no longer maintained. Only Android APK and the webapp are supported. The webapp works in desktop browsers; that does not use the retired native desktop client. Xcode exports are also retired.

Set VERSION, then run `Build Android and Web.cmd`, or use `python/python.exe -B tools/build_android.py` and `python/python.exe -B tools/build_pwa.py --output releases/web-VERSION`. The web output must be a new directory. Publishing is a separate step.

Keep shared campaign code, assets, runtime scripts/data, Python, Node and Android dependencies. Preserve saves for import into the webapp. Never restore the old desktop installers or patcher.
