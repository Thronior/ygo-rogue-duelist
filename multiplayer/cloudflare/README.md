# Shadow Run online rooms

The public endpoint is configured in `android/web/multiplayer-config.json`. Players select a character, host or join with a five-character code, and can reconnect with that code on the same device. No player account, URL input, port forwarding, or TURN subscription is needed.

Every room has one hibernating WebSocket hub per room code. Rooms never poll: an idle socket costs nothing, a connect is one Worker request, and the runtime answers `ping` without waking the object.

- **Tag:** `TagHub` forwards frames and WebRTC signalling, and stores nothing. Both clients run the duel from one shared response log, so a player's own answer applies at once. The host keeps the journal and answers for the CPU. Play starts on the hub immediately and moves to a direct WebRTC channel when one opens. Frames are numbered and acknowledged, so a change of route or a dropped socket loses nothing. Either Android or the webapp can host.
- **Draft and Collector:** `MatchHub` orders each duel's responses, runs the turn clock and disconnect allowance from socket presence, and reports results to the registry, which still owns players, decks and match state. Registry changes reach clients as a nudge followed by one poll. With the hub open, polls are a 120 s safety net. Rooms made by clients before this change have no `hub` flag and keep the old polled path until `LEGACY_MULTIPLAYER` retires them.

Existing TURN secrets remain optional, not required.

## Owner deployment

Deploy `wrangler.jsonc` using Wrangler on Workers Free. `/health` reports `relayConfigured: true` and `relayTransport: websocket`. The two SQLite Durable Object classes implement room discovery and per-room relay. Hibernation keeps idle relay connections out of active compute billing. Free account limits still apply; no paid subscription is enabled automatically.

Seat tokens authenticate reconnects and relay sockets; knowing a room code cannot steal an occupied seat. Rooms expire after one day of inactivity. Creation/join rate limits, room capacity, signaling queues and packet sizes are bounded. Worker observability is disabled. No user passwords or Cloudflare keys are shipped with the game.

Checks: `node --test test.mjs`; `android/test_tag_peer.cjs --endpoint=<public HTTPS URL>` with and without `--relay`. Tests use isolated saves.

## Netcode deployment

The hubs add Durable Object migration `v7` (`TagHub`, `MatchHub`). Deploy this Worker before publishing clients: new clients need `/v3/*`, and old clients keep working through `/v2`. Tag rooms refuse mixed versions in the `hello` handshake (protocol 4), and Draft/Collector rooms refuse them at join. A Draft or Collector match already running when a player updates cannot move to the hub, so publish when few matches are live.

Tests: `npm test` here, then with a local `wrangler dev --port 8799`: `android/test_tag_peer.cjs` (with and without `--relay`) and `android/test_online_browser.cjs --mode=draft|tag|collector`. `android/test_tag_lockstep.mjs` needs no services.

## Online play versions

Current clients use `/v2/...` for tag rooms and the relay, `/v2/draft/...` and `/v2/collector/...`. Older clients call `/v1/...`, `/draft/...` and `/collector/...`. `LEGACY_MULTIPLAYER` in `wrangler.jsonc` decides whether those older clients may still play online: `allow`, or `block` (also the behaviour when the value is missing), which answers 426 "update to keep playing multiplayer" without touching a Durable Object. `/progress/` (device sync) and `/backup/` stay unversioned for every version, and the statistics and replay Workers are separate.

Release order when online play changes version: deploy this Worker with `allow`, publish the web, itch and Android clients, then set `block`, deploy again and check that `/health` reports `legacyClients: blocked` and `POST /v1/poll` returns 426. `tools/refresh_fallen_collectors.py` tries `/v2/collector/fallen` first and falls back to the legacy path on a Worker that predates it. Already-open old tabs keep retrying refused calls until they reload; each retry still counts as a Worker request but no longer reaches a Durable Object. The gate itself takes effect at once, but a busy Durable Object can keep running the previous code for a few minutes after a deploy (about five minutes for the room registry on 2026-10-26), so re-check `/v2/relay` before calling a deploy verified.
