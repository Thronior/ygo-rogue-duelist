"""Shrink files as they are packed into the APK and web build. Source files are never changed.

- Images are re-encoded as WebP under their original names. Browsers and the Android WebView
  detect an image's format from its data, so no code or data paths change. A file is only
  replaced when that saves at least 10%. Small or palette PNGs (pixel art) use lossless WebP.
- scripts.json and engine-data.json keep only the cards a duel can reach: every card ID in the
  game content, decks, collector and draft catalogs, campaign code, client code, and any card
  those cards' scripts mention (plus alias art), repeated until nothing new is found.
- EDOPro textures that no client file references are left out.

Encoded images are cached in temp/build/packaged-assets, keyed by the source bytes.
"""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import base64, hashlib, io, json, os, re

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'temp/build/packaged-assets'
VERSION = 'webp-1'  # bump to re-encode every image
IMAGE_TYPES = {'.jpg', '.jpeg', '.png', '.gif'}
MIN_SAVING = 0.10
LOSSLESS_MAX = 128
CARD_ID = re.compile(r'(?<![A-Za-z0-9_.])c?(\d{4,9})(?![0-9])')  # also matches c12345.lua


def _quality(relative):
    return 85 if relative.parts[:2] == ('assets', 'cards') else 82


def _encode_image(data, suffix, quality):
    from PIL import Image
    with Image.open(io.BytesIO(data)) as im:
        frames = getattr(im, 'n_frames', 1)
        out = io.BytesIO()
        if suffix == '.gif' and frames > 1:
            durations, images = [], []
            for i in range(frames):
                im.seek(i); durations.append(im.info.get('duration', 100)); images.append(im.convert('RGBA'))
            images[0].save(out, 'WEBP', save_all=True, append_images=images[1:], duration=durations, loop=im.info.get('loop', 0), quality=quality, method=4)
            return out.getvalue()
        im.load()
        alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        lossless = suffix == '.png' and (max(im.size) <= LOSSLESS_MAX or im.mode == 'P')
        im.convert('RGBA' if alpha else 'RGB').save(out, 'WEBP', quality=100 if lossless else quality, lossless=lossless, method=4)
        return out.getvalue()


def _encode_svg(data, quality):
    """SVGs that only wrap embedded PNG/JPEG images get those images re-encoded as WebP."""
    text = data.decode('utf8')
    def swap(match):
        raw = base64.b64decode(match.group(2))
        webp = _encode_image(raw, '.' + match.group(1).replace('jpeg', 'jpg'), quality)
        return 'data:image/webp;base64,' + base64.b64encode(webp).decode() if len(webp) < len(raw) else match.group(0)
    return re.sub(r'data:image/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)', swap, text).encode('utf8')


def _cached(job):
    source, relative = job
    data = Path(source).read_bytes()
    suffix = Path(relative).suffix.lower()
    quality = _quality(Path(relative))
    key = hashlib.sha256(data + f'|{VERSION}|{suffix}|{quality}'.encode()).hexdigest()
    cached = CACHE / key
    if cached.exists():
        result = cached.read_bytes()
    else:
        try:
            result = _encode_svg(data, quality) if suffix == '.svg' else _encode_image(data, suffix, quality)
        except Exception:
            result = b''
        CACHE.mkdir(parents=True, exist_ok=True)
        tmp = cached.with_name(f'{key}.{os.getpid()}.tmp'); tmp.write_bytes(result); os.replace(tmp, cached)
    return relative, (result if result and len(result) <= len(data) * (1 - MIN_SAVING) else None)


def shrinkable(relative):
    relative = Path(relative)
    if relative.parts[0] not in ('assets', 'textures'):
        return False
    suffix = relative.suffix.lower()
    return suffix in IMAGE_TYPES or (suffix == '.svg' and relative.parts[:2] == ('assets', 'relics'))


def shrink_images(files, workers=None):
    """files: [(source path, relative path)]. Returns {relative posix path: WebP bytes} for files worth replacing."""
    jobs = [(str(source), relative.as_posix()) for source, relative in files if shrinkable(relative)]
    if not jobs:
        return {}
    with ProcessPoolExecutor(workers or max(1, (os.cpu_count() or 2) - 1)) as pool:
        return {relative: data for relative, data in pool.map(_cached, jobs, chunksize=16) if data}


def _numbers(text):
    return {int(n) for n in CARD_ID.findall(text)}


def duel_card_ids(web, engine_data, scripts):
    """Every card a duel can reach, starting from everything the game and its catalogs mention."""
    web = Path(web)
    seeds = set()
    for path in [web / 'content.json', web / 'campaign-files.json', *web.glob('*.js'),
                 *(ROOT / 'data/decks').glob('*.ydk'), *(ROOT / 'multiplayer/cloudflare').glob('*.json')]:
        if path.is_file():
            seeds |= _numbers(path.read_text(encoding='utf8', errors='ignore'))
    known = {int(k) for k in engine_data}
    keep, queue = set(), [n for n in seeds if n in known]
    while queue:
        code = queue.pop()
        if code in keep:
            continue
        keep.add(code)
        row = engine_data.get(str(code)) or {}
        found = {int(row['alias'])} if row.get('alias') else set()
        found |= _numbers(scripts.get(f'c{code}.lua', ''))
        queue.extend(n for n in found if n in known and n not in keep)
    return keep


def pruned_engine_files(web):
    """Return (scripts, engine_data, kept card IDs) restricted to cards a duel can reach."""
    web = Path(web)
    scripts = json.loads((web / 'scripts.json').read_text(encoding='utf8'))
    engine_data = json.loads((web / 'engine-data.json').read_text(encoding='utf8'))
    keep = duel_card_ids(web, engine_data, scripts)
    card_script = re.compile(r'c(\d+)\.lua')
    pruned_scripts = {name: text for name, text in scripts.items()
                      if not (m := card_script.fullmatch(name)) or int(m.group(1)) in keep}
    pruned_data = {code: row for code, row in engine_data.items() if int(code) in keep}
    return pruned_scripts, pruned_data, keep


def unused_textures(web):
    """EDOPro textures no client page, script or stylesheet mentions by file name."""
    web = Path(web)
    sources = ''.join(p.read_text(encoding='utf8', errors='ignore') for p in [*web.glob('*.js'), *web.glob('*.css'), *web.glob('*.html')]
                      if p.name not in ('scripts.json', 'engine-data.json'))
    return {p.relative_to(web).as_posix() for p in (web / 'textures').glob('*')
            if p.is_file() and p.suffix.lower() != '.txt' and p.name not in sources}  # keep credit notices


def packaged_files(web, files):
    """Apply every packaging reduction. files: [(source, relative)] from mobile_bundle.web_files.
    Returns [(relative, source path or bytes)] in the original order, minus dropped files."""
    web = Path(web)
    drop = unused_textures(web)
    files = [(source, relative) for source, relative in files if relative.as_posix() not in drop]
    images = shrink_images(files)
    scripts, engine_data, _ = pruned_engine_files(web)
    replaced = {'scripts.json': json.dumps(scripts, ensure_ascii=False).encode('utf8'),
                'engine-data.json': json.dumps(engine_data, ensure_ascii=False).encode('utf8'), **images}
    return [(relative, replaced.get(relative.as_posix(), source)) for source, relative in files]
