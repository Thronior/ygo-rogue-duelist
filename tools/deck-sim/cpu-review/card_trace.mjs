#!/usr/bin/env node
// Plays one deck against the active opponent decks with the game CPU on both sides and writes a readable trace
// per duel: every idle decision (options with the CPU's activation scores, and the choice), chain windows, card
// selections, positions and battle commands. Read-only: nothing in the game changes. Dev tool, never bundled.
// Usage: card_trace.mjs <deck: pasted decklist .txt | .ydk | deck .json> <outDir> [--games 50] [--tiers 2,3]
//        [--watch "Card A|Card B"] [--decks active-decks.json]
// Seeds depend only on the game number, so two runs of the same deck and opponents replay the same duels until
// a CPU decision differs: compare runs with compare_runs.py.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
const webUrl = f => new URL(`../../../android/web/${f}`, import.meta.url).href;
const {MobileDuel, M, I, B, L} = await import(webUrl('duel.js'));
const {smartContext} = await import(webUrl('smart_policy.js'));
const {shuffleCPUDeck} = await import(webUrl('cpu-deck-model.js'));
const {decklistToYdk, parseYdk, cardCatalog} = await import(new URL('../sim_core.mjs', import.meta.url).href);

const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const GAMES = Number(flag('--games', 50)), TIERS = flag('--tiers', '2,3').split(',').map(Number);
const extraWatch = flag('--watch', ''), decksFile = flag('--decks', null);
const [deckFile, outDir] = args;
if (!deckFile || !outDir) { console.error('Usage: card_trace.mjs <deck .txt|.ydk|.json> <outDir> [--games 50] [--tiers 2,3] [--watch "A|B"] [--decks active.json]'); process.exit(1); }

const web = path.join(ROOT, 'android', 'web'), rj = n => JSON.parse(fs.readFileSync(path.join(web, n), 'utf8'));
const meta = rj('content.json');
const cards = new Map([...meta.cards, ...meta.tokenCards].map(c => [Number(c.id), c]));
const name = id => cards.get(Number(id))?.name || `#${id}`;
const PASSIVES = '-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';

// The deck: a deck .json ({main, extra}), or text (.ydk or a pasted decklist); Fusions go to the Extra Deck.
const raw = fs.readFileSync(deckFile, 'utf8');
const deck = deckFile.endsWith('.json') ? JSON.parse(raw) : parseYdk(decklistToYdk(raw) ?? raw, path.basename(deckFile), cardCatalog());
// Opponents: the game's active T1-T3 decks (tools/deck-sim/list_active_decks.py), or a saved list of them.
const active = decksFile ? JSON.parse(fs.readFileSync(decksFile, 'utf8'))
  : JSON.parse(execFileSync(path.join(ROOT, 'python', 'python.exe'), ['-B', path.join(HERE, '..', 'list_active_decks.py')], {cwd: ROOT, maxBuffer: 64 << 20, encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf8'}}));
const opponents = active.decks.filter(d => TIERS.includes(d.tier));
// Watched cards: every card in the deck, plus --watch.
const WATCH = new Set([...deck.main, ...deck.extra].map(name).concat(extraWatch.split('|').filter(Boolean)));
fs.mkdirSync(outDir, {recursive: true});
console.log(`${path.basename(deckFile)}: ${deck.main.length} Main / ${deck.extra.length} Extra vs ${opponents.length} T${TIERS.join('/T')} decks, ${GAMES} duels`);

const engine = await new MobileDuel([...meta.cards, ...meta.tokenCards]).init([rj('engine-data.json'), rj('scripts.json')]);
const big = (k, v) => typeof v === 'bigint' ? String(v) : v;
const at = c => c ? (c.code ? name(c.code) : name(engine.query(c.controller, c.location)?.[c.sequence]?.code)) : 'direct';
const show = c => { if (!c) return null; const up = (c.position & 5) !== 0, atk = c.attack ?? c.atk, def = c.defense ?? c.def;
  return `${up ? '' : '(set)'}${name(c.code)}${(c.position & 1 || c.position & 4) && atk !== undefined ? ` ${atk}/${def}` : ''}${(c.position & 8 || c.position & 4) && !(c.position & 1) ? ' DEF' : ''}`; };
const showS = c => c ? `${(c.position & 5) ? '' : '(set)'}${name(c.code)}` : null;
const board = p => `M[${engine.query(p, L.MZONE).map(show).filter(Boolean).join(' | ')}] S[${engine.query(p, L.SZONE).map(showS).filter(Boolean).join(' | ')}]`;
const summary = {deck: path.basename(deckFile), tiers: TIERS, games: [], cardUse: {}};
const bump = (card, key) => { if (!WATCH.has(card)) return; (summary.cardUse[card] ??= {})[key] = (summary.cardUse[card][key] || 0) + 1; };
// Wrap the engine's own message handler, never replace it: duel.js tracks attacks and chains there.
const original = engine.onMessage;

for (let g = 0; g < GAMES; g++) {
  const opp = opponents[(g * 7) % opponents.length], seat = g % 2, seed = ((g + 1) * 2654435761) >>> 0;
  const seats = seat === 0 ? [deck, opp] : [opp, deck];
  const lines = [];
  engine.onMessage = m => {
    original?.call(engine, m);
    const me = (m.controller ?? m.player) === seat ? 'ME ' : 'OPP';
    if (m.type === M.CHAINING) lines.push(`    > ${me} chains ${name(m.code)}`);
    else if (m.type === M.SUMMONING || m.type === M.SPSUMMONING || m.type === M.FLIPSUMMONING) lines.push(`    > ${me} ${M[m.type].toLowerCase()} ${name(m.code)}`);
    else if (m.type === M.ATTACK) lines.push(`    > attack declared`);
    else if (m.type === M.DAMAGE) lines.push(`    > damage to ${m.player === seat ? 'ME' : 'OPP'} ${m.amount}`);
    else if (m.type === M.NEW_PHASE) lines.push(`  -- phase ${m.phase}`);
  };
  let s = engine.start(shuffleCPUDeck(seats[0].main, seed, 0), shuffleCPUDeck(seats[1].main, seed, 1), 8000, 8000, 5, seed, seats[0].extra || [], seats[1].extra || [], PASSIVES);
  let decisions = 0, lastTurn = -1;
  while (!s.finished && decisions < 10000 && s.turn <= 80) {
    if (s.turn !== lastTurn) { lastTurn = s.turn; lines.push(`\n=== Turn ${s.turn} (${(s.turn % 2 === 1) === (seat === 0) ? 'ME' : 'OPP'}) LP me ${s.lp[seat]} opp ${s.lp[1 - seat]}`); }
    const m = engine.pending, resp = engine.auto();
    if (m.player === seat) {
      const hand = engine.query(seat, L.HAND).filter(Boolean).map(c => name(c.code));
      if (m.type === M.SELECT_IDLECMD) {
        // Activation scores: null = no CPU rule (duel.js falls back to generic guesses), negative = the rule says no.
        let ctx = null; try { ctx = smartContext(engine, seat, L, m); } catch {}
        const opts = [];
        for (const [b, label] of [['activates', 'act'], ['summons', 'sum'], ['special_summons', 'ss'], ['monster_sets', 'mset'], ['spell_sets', 'sset'], ['pos_changes', 'pos']])
          for (const c of m[b] || []) { let sc = ''; if (b === 'activates') { try { sc = `(${ctx ? ctx.activation(c, false) : '?'})`; } catch { sc = '(err)'; } } opts.push(`${label}:${name(c.code)}${sc}`); }
        const bucket = {[I.SELECT_ACTIVATE]: 'activates', [I.SELECT_SUMMON]: 'summons', [I.SELECT_SPECIAL_SUMMON]: 'special_summons', [I.SELECT_MONSTER_SET]: 'monster_sets', [I.SELECT_SPELL_SET]: 'spell_sets', [I.SELECT_POS_CHANGE]: 'pos_changes'}[resp.action];
        const chosen = bucket && Number.isInteger(resp.index) ? `${bucket}:${name(m[bucket][resp.index].code)}` : resp.action === I.SELECT_BATTLE ? 'to Battle' : resp.action === I.SELECT_END ? 'END TURN' : String(resp.action);
        if (bucket) bump(name(m[bucket][resp.index].code), bucket);
        for (const o of new Set(opts.map(o => o.split(':')[1].replace(/\(.*\)$/, '')))) bump(o, 'offeredIdle');
        lines.push(`  [IDLE ph${s.phase}] hand: ${hand.join(', ')}\n     me : ${board(seat)}\n     opp: ${board(1 - seat)}\n     options: ${[...new Set(opts)].join(', ')}\n     => ${chosen}`);
      } else if (m.type === M.SELECT_CHAIN) {
        const list = (m.chains || m.selects || []).map(c => name(c.code)); let ctx = null; try { ctx = smartContext(engine, seat, L, m); } catch {}
        const scored = (m.chains || m.selects || []).map(c => `${name(c.code)}(${ctx ? ctx.activation(c, true) : '?'})`);
        const pick = Number.isInteger(resp.index) && resp.index >= 0 ? list[resp.index] : 'pass';
        if (list.some(n => WATCH.has(n))) {
          const battle = engine.attackCard ? ` atk ${at(engine.attackCard)}(${engine.attackCard.controller === seat ? 'me' : 'opp'})->${at(engine.attackTarget)}` : '';
          const stack = (engine.activeChain || []).length ? ` stack: ${engine.activeChain.map(l => `${l.player === seat ? 'me' : 'opp'}:${name(l.code)}`).join(' > ')}` : '';
          lines.push(`  [CHAIN ph${s.phase}${engine.inDamageStep ? ' DMG' : ''}${battle}${stack}] can: ${scored.join(', ')} => ${pick}\n     me : ${board(seat)}\n     opp: ${board(1 - seat)}`);
          for (const n of new Set(list)) bump(n, 'chainOffered'); if (pick !== 'pass') bump(pick, 'chainUsed');
        }
      } else if (m.type === M.SELECT_CARD || m.type === M.SELECT_TRIBUTE || m.type === M.SELECT_UNSELECT_CARD) {
        const list = (m.cards || m.selects || []).map(c => `${name(c.code)}${c.controller !== undefined && c.controller !== seat ? '(opp)' : ''}`);
        const idx = resp.indicies || resp.indices || (Number.isInteger(resp.index) ? [resp.index] : []);
        lines.push(`  [${M[m.type]} src=${name(engine.effect?.code)}] from: ${list.join(', ')} => ${(idx || []).map(i => list[i]).join(', ')}`);
      } else if (m.type === M.SELECT_POSITION) lines.push(`  [POSITION ${name(m.code)}] => ${resp.position ?? JSON.stringify(resp)}`);
      else if (m.type === M.SELECT_EFFECTYN || m.type === M.SELECT_YESNO) lines.push(`  [${M[m.type]} ${name(m.code ?? engine.effect?.code)}] => ${JSON.stringify(resp, big)}`);
      else if (m.type === M.SELECT_OPTION) lines.push(`  [OPTION src=${name(engine.effect?.code)}] ${JSON.stringify(m.options, big)} => ${JSON.stringify(resp, big)}`);
      else if (m.type === M.SELECT_BATTLECMD) {
        const atks = (m.attacks || []).map(c => name(c.code)), acts = (m.activates || []).map(c => name(c.code));
        if (atks.length || acts.length) lines.push(`  [BATTLE] attackers: ${atks.join(', ')} acts: ${acts.join(', ')} => ${resp.action === B.SELECT_BATTLE ? `attack with ${atks[resp.index]}` : resp.action === B.SELECT_ACTIVATE ? `activate ${acts[resp.index]}` : 'no attack'}\n     me : ${board(seat)}\n     opp: ${board(1 - seat)}`);
      }
    }
    s = engine.respond(resp); decisions++;
  }
  const result = !s.finished ? 'cap' : s.finished.player === seat ? 'WIN' : 'LOSS';
  summary.games.push({g, opp: `${opp.character} T${opp.tier}`, seat, result, turns: s.turn});
  fs.writeFileSync(path.join(outDir, `game${String(g).padStart(2, '0')}-${result}-${opp.character.replace(/\W+/g, '_')}-T${opp.tier}.txt`), `${opp.character} T${opp.tier}, my seat ${seat}, ${result} on turn ${s.turn}\n` + lines.join('\n'));
  engine.destroy();
  console.log(`game ${g}: ${result} vs ${opp.character} T${opp.tier} (turn ${s.turn})`);
}
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(`\n${summary.games.filter(x => x.result === 'WIN').length}/${GAMES} wins. Card use (offered vs used) is in ${path.join(outDir, 'summary.json')}`);
