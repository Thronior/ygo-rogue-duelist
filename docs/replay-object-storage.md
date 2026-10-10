# Replay object storage deployment

The worker accepts an optional private R2 binding named `REPLAY_FILES`. Create a Standard R2 bucket, then add an `r2_buckets` entry to multiplayer/replays/wrangler.jsonc with binding REPLAY_FILES and the actual bucket name before deploying. No bucket or paid service is provisioned by this source change.

New payloads go to R2; small searchable metadata stays in Durable Objects. Existing reports remain readable from the original storage. An authenticated download moves a legacy payload to R2 only after the upload succeeds. Never remove the R2 binding after object-backed reports exist: redeploy code retaining the binding for rollback.

Content-hash IDs stay unchanged, and per-bucket serialization prevents concurrent duplicate requests from both writing. A failed metadata write may leave an orphan object; a retry safely overwrites that same key. Listings and admin authentication keep the existing API contract. This does not eliminate the metadata writes or lift an already-exhausted Durable Object quota.
