# Shadow Run online rooms

The public endpoint is configured in `android/web/multiplayer-config.json`. Players select a character, host or join with a five-character code, and can reconnect with that code on the same device. No player account, URL input, port forwarding, or TURN subscription is needed.

The host device runs the authoritative duel. WebRTC attempts a direct connection first. If it cannot connect within eight seconds, both clients switch to an authenticated TLS WebSocket relay on this Worker. Relay traffic is forwarded transiently, never stored. Either Android or desktop can host. Existing TURN secrets remain optional, not required.

## Owner deployment

Deploy `wrangler.jsonc` using Wrangler on Workers Free. `/health` reports `relayConfigured: true` and `relayTransport: websocket`. The two SQLite Durable Object classes implement room discovery and per-room relay. Hibernation keeps idle relay connections out of active compute billing. Free account limits still apply; no paid subscription is enabled automatically.

Seat tokens authenticate reconnects and relay sockets; knowing a room code cannot steal an occupied seat. Rooms expire after one day of inactivity. Creation/join rate limits, room capacity, signaling queues and packet sizes are bounded. Worker observability is disabled. No user passwords or Cloudflare keys are shipped with the game.

Checks: `node --test test.mjs`; `android/test_tag_peer.cjs --endpoint=<public HTTPS URL>` with and without `--relay`; full `android/test_tag_integration.cjs` using the configured endpoint. Tests use isolated saves.
