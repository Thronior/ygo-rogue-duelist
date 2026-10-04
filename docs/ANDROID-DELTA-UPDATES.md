# Android delta updates

Build supported targets with `python tools/build_release.py` after updating VERSION.
Publish Android with `python tools/publish_android_release.py --notes <patch-notes.txt>`;
this uploads the APK, all patches listed in release-manifest.json, the manifest,
and the APK checksum. Publish the web output through the existing Pages workflow.
Do not use the old version-specific publisher scripts, which omit delta assets.

Before replacing the local release APK, the Android builder archives its exact
signed bytes in releases/delta-bases/<sha256>.apk. Keep that directory between
releases. The last three base APKs are retained. Finalization creates patches
against those exact APKs and skips patches exceeding 80% of the full download.
Only the current manifest's patches are published; stale files are ignored.

The first release containing the delta-aware updater is a full download for
existing installations. Later updates can use a patch from any retained exact
base, including players who skipped a release. Older or locally modified builds
fall back to the full APK. GitHub remains the release and download channel.

The patch reuses unchanged compressed ZIP entry bytes; literal records contain
changed entries, ZIP headers/directory, alignment bytes, and signing blocks.
It reconstructs the exact signed target APK without repacking or re-signing.
The client validates the patch asset URL/size/SHA-256, base APK SHA-256, bounded
record offsets and lengths, target APK SHA-256, package/version and signer.
Any unsupported/missing/broken patch falls back to the verified full download.
Cancellation stops work. Patch files are removed before installation; APK cleanup
and Android installation confirmation continue to work as before.

Run `python tools/test_android_delta.py` for generator/Java-reader compatibility,
added/deleted entries, cancellation, corrupt input, bounds, and partial-file cleanup.
A code-only signed-APK fixture measured 637,802 patch bytes against 307,911,601
full APK bytes. Savings vary with changed assets and compression settings.
