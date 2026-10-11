# Release policy

Only push to GitHub when publishing a requested release. Always commit and push the corresponding game source to the existing repository, preserve unrelated work, and verify the push. Keep ordinary edits local.

Do not upload future releases to Google Drive. Android updates use the existing GitHub release channel; publish the webapp normally.

The native Windows desktop version is permanently deprecated by the user. Never update, build, export, publish, or restore its installers, patcher or launchers. Supported release targets are Android APK and the webapp only. Do not export Xcode/iOS projects. Preserve saves/profile.json and shared campaign code, assets, runtime data and build dependencies, even where legacy filenames say desktop. Desktop progress migration is supported through the webapp Settings importer.

When publishing itch.io updates, hide the previous ZIP and select the new ZIP as playable. Retain old uploads for recovery. The user has authorized this for all future releases.

# Report review cutoff
Only review Discord, behaviour flags and replays submitted after 2026-10-11T22:24:16Z. See REPORT-REVIEW-CUTOFF.json. Refresh this cutoff after each successfully published release.
