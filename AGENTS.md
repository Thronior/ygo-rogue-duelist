# Release policy

Only push to GitHub when publishing a requested release. Always commit and push the corresponding game source to the existing repository, preserve unrelated work, and verify the push. Keep ordinary edits local.

Do not upload future releases to Google Drive. Android updates use the existing GitHub release channel; publish the webapp normally.

The native Windows desktop version is permanently deprecated by the user. Never update, build, export, publish, or restore its installers, patcher or launchers. Supported release targets are Android APK and the webapp only. Do not export Xcode/iOS projects. Preserve saves/profile.json and shared campaign code, assets, runtime data and build dependencies, even where legacy filenames say desktop. Desktop progress migration is supported through the webapp Settings importer.

When publishing itch.io updates, hide the previous ZIP and select the new ZIP as playable. Retain old uploads for recovery. The user has authorized this for all future releases.

# Report review cutoff
Only review Discord, behaviour flags and replays submitted after 2026-10-13T14:09:41Z. See REPORT-REVIEW-CUTOFF.json. Refresh this cutoff after each successfully published release.

# Aggregate statistics release migration
Before the next statistics Worker deployment, run `node tools/snapshot_global_stats.mjs before D:/<release-output>/stats-before.json` immediately before deployment. Stop deployment if the snapshot fails. Keep the existing STATS Durable Object namespace, class and `global-v1` object identity. The v2 Worker transactionally preserves the exact cutover totals in `migration:aggregate-v2` and continues those totals without re-adding them on restart. Deploy the Worker before new clients, then run the same script with `verify` and the snapshot path. Do not publish clients if verification fails. Older client uploads receive 426 rather than mixing cumulative totals with increments. No statistics snapshot or deployment has been performed yet for this local change.
