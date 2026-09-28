# Local source repository

This repository tracks the shared game source, assets, Android/web client,
multiplayer services, tests, and required vendored web engine files.
Supported releases are Android APK and the webapp only; see AGENTS.md.

Saves, signing keys, private service credentials, downloaded toolchains, build
outputs, and caches are deliberately ignored. They remain on disk. Git is not
a backup of these files; preserve saves and signing credentials separately.

The existing repositories under `edopro-source` and `tools/core` remain
independent and are excluded here, as is the installed Irrlicht source tree.
Their changes must be versioned separately. A clone of this repository alone
does not include those trees or the installed build toolchains.

Generated web assets and campaign bundles are recreated by the supported build
scripts. Vendored engine and Pyodide files are retained because builds rely on
them. The private GitHub remote is `https://github.com/Thronior/ygo-rogue-duelist`.
