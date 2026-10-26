# Shadow Run online rooms

The public endpoint is configured in `android/web/multiplayer-config.json`. Players select a character, host or join with a five-character code, and can reconnect with that code on the same device. No player account, URL input, port forwarding, or TURN subscription is needed.

The host device runs the authoritative duel. WebRTC attempts a direct connection first. If it cannot connect within eight seconds, both clients switch to an authenticated TLS WebSocket relay on this Worker. Relay traffic is forwarded transiently, never stored. Either Android or the webapp can host, including when the webapp is open in a desktop browser. The native Windows desktop edition is deprecated and no longer supported. Existing TURN secrets remain optional, not required.

## Owner deployment

Deploy `wrangler.jsonc` using Wrangler on Workers Free. `/health` reports `relayConfigured: true` and `relayTransport: websocket`. The two SQLite Durable Object classes implement room discovery and per-room relay. Hibernation keeps idle relay connections out of active compute billing. Free account limits still apply; no paid subscription is enabled automatically.

Seat tokens authenticate reconnects and relay sockets; knowing a room code cannot steal an occupied seat. Rooms expire after one day of inactivity. Creation/join rate limits, room capacity, signaling queues and packet sizes are bounded. Worker observability is disabled. No user passwords or Cloudflare keys are shipped with the game.

Checks: `node --test test.mjs`; `android/test_tag_peer.cjs --endpoint=<public HTTPS URL>` with and without `--relay`. Tests use isolated saves.

## Online play versions

Current clients use `/v2/...` for tag rooms and the relay, `/v2/draft/...` and `/v2/collector/...`. Older clients call `/v1/...`, `/draft/...` and `/collector/...`. `LEGACY_MULTIPLAYER` in `wrangler.jsonc` decides whether those older clients may still play online: `allow`, or `block` (also the behaviour when the value is missing), which answers 426 "update to keep playing multiplayer" without touching a Durable Object. `/progress/` (device sync) and `/backup/` stay unversioned for every version, and the statistics and replay Workers are separate.

Release order when online play changes version: deploy this Worker with `allow`, publish the web, itch and Android clients, then set `block`, deploy again and check that `/health` reports `legacyClients: blocked` and `POST /v1/poll` returns 426. `tools/refresh_fallen_collectors.py` tries `/v2/collector/fallen` first and falls back to the legacy path on a Worker that predates it. Already-open old tabs keep retrying refused calls until they reload; each retry still counts as a Worker request but no longer reaches a Durable Object. The gate itself takes effect at once, but a busy Durable Object can keep running the previous code for a few minutes after a deploy (about five minutes for the room registry on 2026-10-26), so re-check `/v2/relay` before calling a deploy verified.
