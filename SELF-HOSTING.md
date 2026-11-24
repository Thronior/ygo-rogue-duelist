# Hosting your own servers

The game's online features run on three [Cloudflare Workers](https://developers.cloudflare.com/workers/):

| Worker | Folder | What it does |
|---|---|---|
| `shadow-run-rooms` | `multiplayer/cloudflare/` | Tag and Draft rooms, Ultimate Collector, cloud saves, linking devices |
| `ygo-rogue-replays` | `multiplayer/replays/` | Duel replays and behaviour reports ("Flag behaviour") |
| `ygo-rogue-stats` | `multiplayer/global-stats/` | Anonymous global statistics |

**The official servers only serve the official releases.** Each official build signs its build ID with a private key that
never leaves the maintainer's PC, and the official Workers check that signature
(`multiplayer/shared/official-build.mjs`). A fork or a modified build can't sign its own ID, so the official servers answer
it with *"Online play needs the latest official version of the game. Modified versions need their own servers."*

If you make your own version of the game, run your own copies of the Workers. It takes a few minutes, and Cloudflare's free
plan covers a small player base.

## 1. Deploy the Workers

You need a Cloudflare account and [Node.js](https://nodejs.org/). For each of the three folders:

1. In `wrangler.jsonc`, remove `BUILD_PUBLIC_KEY` (then your Worker accepts every build), or set your own key (step 3).
   Change the Worker `name` if you like; your address becomes `https://<name>.<your-subdomain>.workers.dev`.
2. Deploy from that folder:

   ```sh
   npx wrangler deploy
   ```

Optional settings (all in `wrangler.jsonc` or as `npx wrangler secret put <NAME>`):

- `DAILY_REQUEST_CAP`: requests a day before the Worker refuses calls until 00:00 UTC. On Workers Paid nothing else caps
  the bill. Remove it (and the `METER` binding) on the free plan, which has its own daily limit.
- Rooms: `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` (Cloudflare Calls TURN, for players behind strict networks);
  `ADMIN_TOKEN` (the room tool) and `BACKUP_ADMIN_TOKEN` (cloud save listings) if you want those tools.
- Replays: `REPLAY_ADMIN_TOKEN`, needed to download the replays and reports players send you.

## 2. Point your build at them

All three addresses live in **one file**, `android/web/multiplayer-config.json`:

```json
{
  "signalingUrl": "https://your-rooms.your-subdomain.workers.dev",
  "replaysUrl": "https://your-replays.your-subdomain.workers.dev",
  "statsUrl": "https://your-stats.your-subdomain.workers.dev"
}
```

Then rebuild, which writes the page's security policy and `android/web/official-build.js` from that file:

```sh
python tools/build_android.py --sync-only
```

If you merge updates from the original repository later, keep your own `multiplayer-config.json`.

## 3. Optional: only your builds on your servers

To keep other builds off your servers the same way, create your own key pair:

```sh
node tools/sign_build.mjs --new-key
```

The private key goes to `android/signing/` (git-ignored; back it up and never publish it). Put the printed public key in
`BUILD_PUBLIC_KEY` of your three Workers and deploy them again. Every build made on your PC is then signed, and
`node tools/sign_build.mjs --verify` checks a build before you publish it.

Also give your version a distinct version number (for example `0.2.46-yourname` in `VERSION`), so players of different
versions never meet in the same Tag or Draft room.
