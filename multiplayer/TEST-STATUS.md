# Crossplay verification — 2026-09-23

## Passed
- Shared campaign tests: independent decks, distinct opponents, shared relics and currency, host-first purchases, ownership and duplicate-request protection.
- Signaling persistence, original-seat recovery and stale-generation rejection.
- Real EDOPro WASM four-seat play, hidden enemy cards, response ownership and exact journal replay.
- Session restore, pause, durable guest outbox, duplicate purchase/winning-response handling and compatibility rejection.
- Actual Chrome WebRTC transport and guest, host and simultaneous reconnects.
- The same transport tests forced through the included Pion TURN relay, separately using UDP and TCP.
- Full desktop-host/browser-mobile-guest duel, shared shop, inventory/gold assertions, shop reconnect and next deck editor.
- The same full campaign flow with TCP TURN forced; selected candidate route asserted as relay.
- Full browser-mobile-host/native-desktop-guest campaign flow also passed over forced TCP TURN, including purchases and reconnect.
- A Set command entered through the actual native desktop EDOPro window reached the shared engine and continued play.

## Hardware / deployment limits
- Separate `com.shadowrun.crossplaytest` installed successfully on the authorized phone. Normal app and saves were not replaced.
- First device attempt used a mobile-data address and no TURN server; signaling worked but direct ICE failed.
- After unlocking and connecting to Wi-Fi, the physical phone passed the complete duel/shop/reconnect flow both as guest and as host. A physical Android-host reload mid-duel restored the exact engine snapshot and continued through the shop.
- Physical Android guest passed the complete duel/shop/reconnect flow with TCP TURN forced; the selected route was asserted as relay. The relay listener was reached through USB port forwarding, so this does not claim public WAN reachability.
- Fixed and verified the phone room-entry layout so Join remains reachable while the on-screen keyboard is open.
- No public HTTPS signaling endpoint or public TURN relay has been deployed. Local forced-relay tests do not establish cross-network reachability.
- Native embedding in the desktop browser shell, resize behavior and modal layering still need visual verification. The native window's card input and rendering were checked independently.
- Long-run progression, every relic combination and tag-specific endgame options need additional coverage. This is not a release certification.

## User settings and artifacts
- Desktop runtime sound/music muted at the user's request; previous config in `temp/tag-audio-settings-before-mute.conf`.
- Test browser/phone audio suppressed independently. System/meeting volume unchanged.
- Source bundles synchronized; no normal APK or desktop installer exported.
- Portable relay: `multiplayer/Shadow-Run-Relay.exe`; reproducible source and pinned dependencies in `multiplayer/turn/`.
- All generated files, toolchain downloads, caches and build output are on D:.

Menu update: Tag Duels now uses Yu-Jo Friendship (81332143) on desktop and mobile; mobile uses the existing card image with a CSS art crop and Spell frame.

## Cellular hardware test — 2026-09-23
- Confirmed phone default route uses cellular (`rmnet_data3`), with only room signaling on USB reverse port 8765. No TURN or game-data port forwarded over USB.
- With STUN configured, actual Android guest / desktop host completed a full four-seat duel, host purchase, guest skip, shared-gold and separate-card assertions, same-code reconnect and next draft.
- Android host / desktop guest passed the same full flow, including five consecutive shop reconnects. Desktop host / Android guest then repeated the full flow with five successful shop reconnects too.
- The initial attempt completed the duel but stalled on reconnect (RTC connected, host session paused). Two Android WebView pages were present. After restarting the isolated test app, three full campaign runs and eleven total reconnects passed. The initial cause is not proven fixed; bounded peer-event diagnostics and a `--repeat-reconnect` option were added to the test harness.
- These results establish real direct cellular game-data connectivity for the tested networks. Public room lookup and public relay fallback remain unverified: room signaling was reached through USB, and no public signaling/TURN deployment was made.
- Testing remained muted. Normal app saves and release packages were not changed.

## Simplified multiplayer entry
- Shared desktop/mobile UI now has character selection with Host and Join; Join opens a code-only screen, Host opens a two-slot portrait lobby with room code and live connected-player count.
- Host-only Start run uses a persisted campaign lobby phase. Returning to an existing active run does not reset it to the lobby.
- Removed URL input. A bundled multiplayer-config.json supplies the signaling address, with an existing HTTPS preference as migration fallback. Public service deployment remains outstanding; missing configuration produces a clear unavailable message.
- Browser layout and room-flow tests passed at 924x416, including six complete character rows, invalid code handling, 1/2 and 2/2 occupancy, portraits, host-only start and synchronized draft.
- Full native-desktop-host / mobile-browser-guest campaign test passed: duel, shop purchases, inventory ownership, shared gold, same-code reconnect and next draft. Campaign and session regression checks passed.
- Source only: no APK, iOS archive or setup rebuilt for this UI change.

## Embedded desktop and hosted room service preparation
- Real Edge HWND is now a child of the main Tk game window; title/resize insets are clipped, native EDOPro uses that exact parent, and toolbar offset follows viewport size.
- Real Windows checks passed at 1280x720, 1024x768 and 1600x720, including Menu cleanup and reopening twice. Screenshot: temp/tag-embedded-desktop.png.
- Cloudflare Worker / SQLite Durable Object room-service implementation prepared. Registry unit tests, Wrangler deployment dry-run and real WebRTC direct/guest/host/simultaneous reconnect tests against local workerd passed. Public deployment and managed TURN still await account authorization/configuration.
