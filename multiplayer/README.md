## Current online service

The game now uses the deployed Cloudflare room service automatically. Players only choose Host or Join and share the five-character code. Direct WebRTC is attempted first; a secure WebSocket relay handles blocked connections without a TURN subscription. Same-device reconnect keeps the seat and saved run. See [Cloudflare deployment](cloudflare/README.md).

The self-hosted STUN/TURN instructions below are optional alternatives, not steps required for players.

# Tag networking — development status

This is an in-progress feature, not an exported multiplayer release. Main-menu entry, tag campaign screens, four-seat EDOPro core, mobile duel rendering, and native desktop protocol input are implemented. A complete automated duel/shop/reconnect cycle passed, including a card set through the actual native desktop interface. Forced TURN relay transport passed over UDP and TCP. The complete duel, shopping, ownership and reconnect integration test also passed with TCP relay forced throughout. Physical-phone full-duel/shop/reconnect tests passed in both hosting directions, including exact recovery after reloading the Android host mid-duel. Public internet validation remains outstanding; this is not yet a release certification.

## Reconnection behavior

- Join the same five-character room code on the same device/app installation to reclaim the original seat. Each device saves its own private seat token; knowing the room code alone does not allow a third player to take a reserved seat.
- Both guest and host can reconnect, including at the same time. Repeated presses share one connection attempt.
- Disconnect pauses new player commands and the host AI. There is no duel turn timer or disconnect forfeit. Resume waits for the data channel and both clients' compatibility handshake.
- The host saves campaign state and a deterministic duel response journal. The journal restores the current hand, field, life points, active teammate, and outstanding choice after an app reload.
- The guest saves unacknowledged requests before sending them. A rejoin resends the original request ID. The host's saved receipts prevent a purchase, action, or final winning response from being applied twice.
- Leave is explicit and releases the seat/room. A temporary disconnect does not call Leave.
- Codes expire after 24 hours with no contact from either player. This cleans up discovery records, not a gameplay forfeit. The host run remains in its local save; resuming an expired code is not yet supported.
- Clearing app/browser storage removes that device's reconnect credentials. Moving to another device using only the code is not supported.

## Self-hosted signaling service

Run from the game folder (all default files stay on D:):

```powershell
.\python\python.exe -B multiplayer/signaling.py --host 127.0.0.1 --port 8765
```

The service stores reserved room codes/tokens in `multiplayer/data/rooms.json`. `--state` can select another private writable path. Keep this file outside any web root. Atomic replacement preserves records across service restarts. SDP/ICE connection messages and game state are never written to this registry.

Expose the localhost service through an HTTPS reverse proxy for internet clients. Both players must use the same signaling URL. Plain HTTP is accepted only for localhost development. The service handles discovery and connection negotiation; duel traffic goes over the peer data channel.

Configure your own STUN/TURN endpoints in the signaling process environment:

```text
TAG_STUN_URL=stun:YOUR_HOST:3478
TAG_TURN_URL=turn:YOUR_HOST:3478?transport=udp,turns:YOUR_HOST:5349?transport=tcp
TAG_TURN_SECRET=YOUR_PRIVATE_SHARED_SECRET
```

Use coturn with matching `use-auth-secret`, `static-auth-secret`, a realm, listening ports, and TLS certificates. The service issues expiring HMAC credentials rather than embedding the secret in the game. The client's normal ICE policy permits direct connections and relay candidates; `relayOnly` exists for validation. Configure the relay's public address and firewall ports for its deployment. Reference: [coturn configuration](https://github.com/coturn/coturn/blob/master/examples/etc/turnserver.conf).

No public internet service has been deployed. Forced local relay tests passed; actual cross-network testing is still required. The phone test app installed successfully, but its first connection was attempted over mobile data before a relay was configured. After the phone was unlocked and on Wi-Fi, full-duel/shop/reconnect tests passed in both hosting directions. Reloading the Android host mid-duel also restored the exact pending game state.

## Verification

Run from the game folder:

```powershell
.\python\python.exe -B tools/test_tag_signaling.py
.\python\python.exe -B tools/test_tag_campaign.py
.\runtime\ai\node.exe android/test_tag_session.mjs
.\runtime\ai\node.exe android/test_tag_duel.mjs
.\runtime\ai\node.exe android/test_tag_peer.cjs
```

The browser test requires the local Playwright dependency referenced in its source and Chrome. It opens two isolated headless browser contexts, verifies a real direct WebRTC data channel, reconnects the guest, reconnects the host, reconnects both together, and rejects a third player. Browser temporary data is directed to the game's D: temp folder. The core test uses real WASM EDOPro and verifies exact state restoration after nine turns.

## Included Windows relay

`Shadow-Run-Relay.exe` is built from `turn/` using pinned Pion TURN v5 dependencies (`go.mod` and `go.sum`). It supports UDP, TCP and optional TLS listeners with expiring HMAC credentials matching the signaling service. Source API reference: https://github.com/pion/turn/tree/master/examples/turn-server

For an isolated local test, open a shell in the game folder:

```powershell
$env:TAG_TURN_SECRET='replace-with-at-least-32-random-characters'
.\multiplayer\Shadow-Run-Relay.exe -local-test
```

In a second shell, use the SAME secret, then run the test:

```powershell
$env:TAG_TURN_SECRET='replace-with-at-least-32-random-characters'
$env:TAG_TURN_URL='turn:127.0.0.1:3478?transport=tcp'
.\runtime\ai\node.exe android/test_tag_peer.cjs --relay
```

For a public server use `-bind 0.0.0.0 -public-ip YOUR_PUBLIC_IP`, omit `-local-test`, and optionally supply `-cert fullchain.pem -key privkey.pem` for TLS port 5349. Permit TCP/UDP 3478, TCP 5349 if using TLS, and UDP 49160–49259 on that server/router. Point TAG_TURN_URL at the reachable host rather than localhost. Keep the secret private. Place signaling behind an HTTPS reverse proxy; a room code cannot substitute for a reachable signaling URL and relay. No firewall/router settings are changed by the build or tests.

The relay defaults to loopback, requires a secret, rejects expired credentials, and denies private/loopback relay targets unless explicitly in local-test mode. Public-host operators should add deployment-specific bandwidth and connection limits.

## Full-flow integration test

Start `tools/tag_test_server.py`; it prints a temporary desktop RPC token and uses isolated D: saves. Run `android/test_tag_integration.cjs TOKEN`. The `--relay` flag forces relay candidates and asserts that TURN was selected; configure the test server's TURN environment first. `--inspect-native` pauses at the first desktop input to verify a real native click before completing the duel automatically. `--phone` uses the isolated Android test app through CDP port 9223 and requires the phone to remain unlocked.

Audio is suppressed by the browser test harness. Desktop runtime music/sound have been muted at the user's request; the previous configuration is saved in `temp/tag-audio-settings-before-mute.conf`. No normal APK or installer was exported during this test work.

The physical phone subsequently passed a complete TCP-TURN-forced duel/shop/reconnect test. That relay listener was forwarded over USB for isolated testing, not deployed on the public internet. Both direct Wi-Fi hosting directions and Android host reload recovery have passed.

## Player-facing room setup
Players select a character, choose Host or Join, and share only a five-character code. The host sees two portrait slots and starts the run after the second player connects. Rejoining the same code restores an existing run instead of returning it to the lobby.

Configure `android/web/multiplayer-config.json` with one public HTTPS `signalingUrl` before exporting. This file is included in Android, iOS and the desktop web client; players never type a URL. An existing saved HTTPS room endpoint is a migration fallback. `?tagtest=1` enables the local test service only for test sessions. With no configured service, Host/Join show an unavailable message rather than claiming to create an unreachable room. This repository does not yet have a deployed public room service.
