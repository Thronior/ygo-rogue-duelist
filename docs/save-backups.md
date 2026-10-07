# Automatic device backups

Android and web save locally first. A single background uploader copies the complete saves directory (including Ultimate Collector ownership credentials), device statistics and saved CPU deck suggestions to the existing game Worker. Uploads begin after startup and save changes, with a 30-second minimum interval, unchanged-content suppression, timeouts and bounded retries. Online/foreground events retry pending changes. Local testing hosts do not upload automatically. Duel replays, unrelated browser data and the admin key are not uploaded.

Each installation has an SB recovery code and a separate random write credential. Clearing storage creates a new identity; the old backup remains available to the admin. The code alone grants no access. The service keeps the original snapshot, recent snapshots, and daily snapshots for 30 days. The latest backup does not expire. Requests are bounded to 16 MiB and rate-limited. Failed uploads do not block play. Settings reports the last confirmed upload; no backup is promised until one has succeeded.

## Admin recovery

Run `python tools/backup_admin.py --key-file <private DPAPI key file>`. It prints a loopback-only browser URL. Keep the private key outside the repository and game build. On Windows the local key is encrypted for the Windows user using DPAPI; on other admin systems use YGO_BACKUP_ADMIN_TOKEN. The matching server credential is Cloudflare secret BACKUP_ADMIN_TOKEN.

The browser lists recovery codes, platform, last backup, run/win counts, Collector names and snapshots. Search by code or Collector name, select a snapshot, and download a recovery JSON. Send the file privately to its owner: it contains Collector ownership credentials. The player imports it from Settings → Recover Save Data, confirms replacement, and the game reloads. Recovery does not copy the source device's backup-write credential, so a newly recovered installation cannot overwrite the original installation's cloud history.

Recover only the intended person's data. A Collector name is a search aid, not proof of ownership. If someone forgot their code, use Collector names and game details to locate and verify the correct backup. Restored Collectors still reconcile against the authoritative multiplayer server; recovery cannot revive a defeated Collector or roll back server results.

## Verification

Run `node android/test_device_backup.mjs` and `npm test` in multiplayer/cloudflare. Tests cover authorization, large/chunked saves, Collector credentials, historical snapshots, rate/deduplication behavior, retry and disposal, restore validation and rollback. Do not test by uploading actual player saves.
