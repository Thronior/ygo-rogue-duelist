// Draws a randomized card (randomizer.py) on a canvas, with no new image files (2026-11-15). Card scans have the
// name, stars, text and stats printed on them, so the picture is put together from existing scans: a "donor"
// card of the same frame gives the frame (Spells/Traps: of the same sub-type, so the [Spell Card / Equip] line
// and icon come with it), the name card's name is written over the donor's, the art card's illustration goes in
// the art box, another card of the rolled Attribute lends its orb, and the donor's star is repeated for the Level.
// Positions are fractions of the card, so 288x420 game scans and 610x889 full scans both work.
const ART = [0.1148, 0.1822, 0.8803, 0.707];  // reaches the bottom border on every scan (some art boxes sit lower)
const NAME = [0.062, 0.043, 0.828, 0.1068];
const ORB = [0.8915, 0.0745, 0.0445];            // centre x, centre y, radius (fraction of width)
const STAR = [0.8615, 0.144, 0.0328, 0.0235];    // rightmost star: centre x, centre y, half width, half height
const STAR_STEP = 0.0656;
const STAR_ROW = [0.07, 0.118, 0.93, 0.168];
const TEXT = [0.072, 0.752, 0.928, 0.905];       // monster text area, above the ATK/DEF line
const TEXT_ST = [0.072, 0.752, 0.928, 0.94];
const STATS = [0.42, 0.911, 0.924, 0.942];

// Which real card lends each part. Stable choices (first match in the pool) so a card always looks the same.
export function donorsFor(card, pool) {
  const r = card.randomized, t = card.data.type;
  const isMon = c => c.data && c.data.type & 1;
  const frameOf = c => c.data.type & 0x40 ? 'fusion' : c.data.type & 0x80 ? 'ritual' : c.data.type & 0x20 ? 'effect' : 'normal';
  let frame;
  if (t & 1) {
    const want = r.frame === 'normal' ? 'normal' : r.frame === 'fusion' ? 'fusion' : r.frame === 'ritual' ? 'ritual' : 'effect';
    // Best: a card of the same frame, Level and Attribute, so its stars and orb are already right.
    const ok = c => isMon(c) && frameOf(c) === want && !(c.data.type & (0x4000 | 0x200 | 0x400000)) && c.id < 100000000;
    frame = pool.find(c => ok(c) && c.level === card.level && c.attribute === card.attribute)
      || pool.find(c => ok(c) && c.level === card.level) || pool.find(c => ok(c) && c.level >= 1);
  } else {
    const kind = t & 2 ? 'Spell Card' : 'Trap Card';
    frame = pool.find(c => c.type === kind && c.race === r.sub && c.id < 100000000);
  }
  const orb = t & 1 && frame.attribute !== card.attribute ? pool.find(c => isMon(c) && c.attribute === card.attribute) : null;
  return {frame: frame.id, art: r.art_from, orb: orb?.id, keepStars: t & 1 && frame.level === card.level};
}

function median(ctx, x, y, w, h) {
  const d = ctx.getImageData(x, y, w, h).data, ch = [[], [], []];
  for (let i = 0; i < d.length; i += 16) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
  return ch.map(v => v.sort((a, b) => a - b)[v.length >> 1]);
}
function fill(ctx, W, H, [x0, y0, x1, y1]) {
  const [r, g, b] = median(ctx, x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H);
}
function fitText(ctx, text, x, y, maxWidth) {
  const w = ctx.measureText(text).width;
  ctx.save(); ctx.translate(x, y); if (w > maxWidth) ctx.scale(maxWidth / w, 1); ctx.fillText(text, 0, 0); ctx.restore();
}
function wrap(ctx, text, width) {
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

// images: {frame, art, orb} as loaded <img>/ImageBitmap. fonts: CSS font families for name and text.
export function drawRandomizedCard(canvas, card, images, fonts = {name: 'Spectral SC', text: 'Spectral'}) {
  const {frame, art, orb, keepStars} = images, W = frame.width, H = frame.height;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const r = card.randomized, isMon = card.data.type & 1;
  ctx.drawImage(frame, 0, 0, W, H);

  // Name: paint over the donor's name with the box colour, then write the new one (squeezed if long).
  fill(ctx, W, H, NAME);
  ctx.font = `600 ${Math.round(H * 0.046)}px "${fonts.name}"`;
  ctx.fillStyle = isMon ? '#16110c' : '#fdfbf4';
  ctx.textBaseline = 'alphabetic';
  if (!isMon) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = H * 0.004; }
  fitText(ctx, card.name, NAME[0] * W + W * 0.012, H * 0.0915, (NAME[2] - NAME[0]) * W - W * 0.03);
  ctx.shadowBlur = 0;

  if (isMon) {
    // Attribute orb from a card with that Attribute.
    if (orb && orb !== frame) {
      const [cx, cy, rr] = ORB, sx = orb.width / W, sy = orb.height / H;
      ctx.save(); ctx.beginPath(); ctx.arc(cx * W, cy * H, rr * W, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(orb, (cx - rr) * orb.width, cy * orb.height - rr * W * sy, rr * 2 * orb.width, rr * 2 * W * sy, (cx - rr) * W, cy * H - rr * W, rr * 2 * W, rr * 2 * W);
      ctx.restore();
    }
    // Stars: the donor's are right when its Level matches; otherwise keep one star, clear the row, redraw.
    if (!keepStars) {
    const [sx, sy, hw, hh] = STAR, star = document.createElement('canvas');
    star.width = Math.ceil(hw * 2 * W); star.height = Math.ceil(hh * 2 * H);
    star.getContext('2d').drawImage(canvas, (sx - hw) * W, (sy - hh) * H, star.width, star.height, 0, 0, star.width, star.height);
    fill(ctx, W, H, STAR_ROW);
    for (let i = 0; i < card.level; i++) ctx.drawImage(star, (sx - hw - i * STAR_STEP) * W, (sy - hh) * H);
    }
  }

  // Art from the art card, cut a little inside its box so none of that card's border comes along.
  const [ax0, ay0, ax1, ay1] = ART, inset = 0.006, insetBottom = 0.014;
  ctx.drawImage(art, (ax0 + inset) * art.width, (ay0 + inset) * art.height, (ax1 - ax0 - 2 * inset) * art.width, (ay1 - ay0 - inset - insetBottom) * art.height,
    ax0 * W, ay0 * H, (ax1 - ax0) * W, (ay1 - ay0) * H);
  // Rainbow frame around the art (user, 2026-11-17), so randomized cards stand out in a deck at a glance.
  {
    const lw = W * 0.014, rainbow = ctx.createLinearGradient(ax0 * W, ay0 * H, ax1 * W, ay1 * H);
    ['#ff3b3b', '#ff9f1c', '#ffe03a', '#4ade50', '#2ec4f0', '#5b6cff', '#c04bff'].forEach((c, i, a) => rainbow.addColorStop(i / (a.length - 1), c));
    // And a 20% rainbow wash over the art itself (user, 2026-11-25). Drawn once into the picture, so the hand, field,
    // card window, deck editor, collection and shop all show it at no cost per frame.
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = rainbow;
    ctx.fillRect(ax0 * W, ay0 * H, (ax1 - ax0) * W, (ay1 - ay0) * H);
    ctx.globalAlpha = 1; ctx.strokeStyle = rainbow; ctx.lineWidth = lw;
    ctx.strokeRect(ax0 * W + lw / 2, ay0 * H + lw / 2, (ax1 - ax0) * W - lw, (ay1 - ay0) * H - lw);
    ctx.restore();
  }

  // Text box: type line for monsters, then the text, shrunk until it fits.
  const box = isMon ? TEXT : TEXT_ST;
  fill(ctx, W, H, box);
  // A faint rainbow over the text box (user, 2026-11-18): the effect is randomized, not the real card's.
  {
    const [bx0, by0, bx1, by1] = box, tint = ctx.createLinearGradient(bx0 * W, by0 * H, bx1 * W, by1 * H);
    ['#ff3b3b', '#ff9f1c', '#ffe03a', '#4ade50', '#2ec4f0', '#5b6cff', '#c04bff'].forEach((c, i, a) => tint.addColorStop(i / (a.length - 1), c));
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = tint;
    ctx.fillRect(bx0 * W, by0 * H, (bx1 - bx0) * W, (by1 - by0) * H);
    ctx.restore();
  }
  ctx.fillStyle = '#16110c';
  let top = box[1] * H + H * 0.004;
  if (isMon) {
    ctx.font = `600 ${Math.round(H * 0.0215)}px "${fonts.name}"`;
    ctx.fillText(r.type_line, box[0] * W + W * 0.006, top + H * 0.019);
    top += H * 0.026;
  }
  const width = (box[2] - box[0]) * W - W * 0.014, room = box[3] * H - top - H * 0.004;
  for (let size = H * 0.0215; size > H * 0.008; size *= 0.94) {
    ctx.font = `${r.flavor ? 'italic ' : ''}500 ${size}px "${fonts.text}"`;
    const lines = wrap(ctx, card.desc, width), lh = size * 1.12;
    if (lines.length * lh <= room) { lines.forEach((l, i) => ctx.fillText(l, box[0] * W + W * 0.007, top + size + i * lh)); break; }
  }
  if (isMon) {
    fill(ctx, W, H, STATS);
    ctx.fillStyle = '#16110c';
    // The text font: its digits line up (the small-caps name font draws old-style zeros).
    ctx.font = `600 ${Math.round(H * 0.025)}px "${fonts.text}"`;
    ctx.textAlign = 'right';
    const atk = card.atk < 0 ? '?' : card.atk, def = card.defense < 0 ? '?' : card.defense;
    ctx.fillText(`ATK/${String(atk).padStart(5, ' ')}  DEF/${String(def).padStart(5, ' ')}`, STATS[2] * W - W * 0.008, STATS[3] * H - H * 0.007);
    ctx.textAlign = 'left';
  }
  // A small marker so nobody mistakes a randomized "Dark Magician" for the real card.
  const mx = ART[2] * W - W * 0.05, my = ART[1] * H + W * 0.05, mr = W * 0.032;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr);
  ['#ff5a7a', '#ffd25a', '#5affb4', '#5ab4ff', '#c45aff'].forEach((c, i) => g.addColorStop(i / 4, c));
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = W * 0.005; ctx.strokeStyle = '#1b1020'; ctx.stroke();
  ctx.fillStyle = '#1b1020'; ctx.font = `700 ${Math.round(mr * 1.35)}px "${fonts.name}"`; ctx.textAlign = 'center';
  ctx.fillText('?', mx, my + mr * 0.48); ctx.textAlign = 'left';
  rainbowFrame(ctx, W, H);
  return canvas;
}

// One thin rainbow frame round the whole card (user, 2026-11-15), so a randomized card is recognisable at a glance in
// the hand, on the field and in every list. It runs once round the edge, over the scan's own outer border.
const RAINBOW = ['#ff4d6d', '#ff9f43', '#ffe14d', '#4dff88', '#4dc3ff', '#7a5cff', '#e04dff', '#ff4d6d'];
export function rainbowFrame(ctx, W, H) {
  // About 3% of the card's width: still a narrow frame, but it reads at shop and hand sizes (1.8% was too faint).
  const width = Math.max(3, Math.round(W * 0.03));
  let g;
  if (ctx.createConicGradient) g = ctx.createConicGradient(-Math.PI / 2, W / 2, H / 2);
  else g = ctx.createLinearGradient(0, 0, W, H);   // older WebViews: the same colours across the card
  RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
  ctx.save();
  ctx.lineWidth = width; ctx.strokeStyle = g;
  ctx.strokeRect(width / 2, width / 2, W - width, H - width);
  // A hairline of dark on the inside keeps the colours crisp against light frames (Normal and Ritual monsters).
  ctx.lineWidth = Math.max(1, width * 0.18); ctx.strokeStyle = 'rgba(20,12,30,.55)';
  ctx.strokeRect(width + ctx.lineWidth / 2, width + ctx.lineWidth / 2, W - 2 * width - ctx.lineWidth, H - 2 * width - ctx.lineWidth);
  ctx.restore();
}
