"""In-game patch notes (user, 2026-11-16): the sheet the release image is made from, shown inside the game.

Each release's notes are written as one HTML page per language (the page the Discord PNG is rendered from, with a
<style> block and a <div id="card"> sheet). `import` turns a page into a small fragment, data/patch-notes/<version>/<lang>.html:
its CSS scoped to .patch-notes-sheet, file:/// asset links made relative (assets/...), so the game draws the sheet
with its own art and an update only downloads a few KB of text. Images that aren't game assets are refused, because
shipping them would add megabytes to every update; swap them for game art or pass --drop-images to leave them out.

`build` copies every fragment into android/web/patch-notes/ with index.json (newest version first);
tools/build_android.py runs it. The first version with notes is 0.2.36; every release adds all 9 languages.

  python tools/patch_notes.py import temp/patchnotes-0236.html --version 0.2.36 --lang en
  python tools/patch_notes.py import temp/patchnotes-0236-de.html --version 0.2.36 --lang de
  python tools/patch_notes.py build
"""
import argparse
import html as htmllib
import json
import re
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/patch-notes'
OUT = ROOT / 'android/web/patch-notes'
LANGS = ('en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh')
SCOPE = '.patch-notes-sheet'


def _blocks(css):
    """Top-level (prelude, body) pairs of a stylesheet."""
    out, i = [], 0
    while True:
        start = css.find('{', i)
        if start < 0:
            return out
        depth, j = 1, start + 1
        while depth and j < len(css):
            depth += {'{': 1, '}': -1}.get(css[j], 0)
            j += 1
        out.append((css[i:start].strip(), css[start + 1:j - 1]))
        i = j


def scope_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    rules = []
    for prelude, body in _blocks(css):
        if prelude.startswith('@font-face') or prelude.startswith('@keyframes'):
            rules.append(f'{prelude}{{{body}}}')
            continue
        if prelude.startswith('@media') or prelude.startswith('@supports'):
            rules.append(f'{prelude}{{{scope_css(body)}}}')
            continue
        selectors = []
        for sel in (s.strip() for s in prelude.split(',')):
            if sel in ('html', 'body', ':root') or not sel:
                continue
            if sel.startswith('#card'):
                selectors.append(SCOPE + sel[len('#card'):])
            elif sel == '*':
                selectors += [SCOPE, SCOPE + ' *']
            else:
                selectors.append(f'{SCOPE} {sel}')
        if selectors:
            rules.append(f'{",".join(selectors)}{{{body}}}')
    return '\n'.join(rules)


def _asset_path(url):
    """'assets/...' for a link to the game's art or fonts, else None."""
    path = unquote(url).replace('\\', '/')
    match = re.search(r'(?:^|/)(?:android/web/)?(assets/[^?#]+)$', path)
    return match.group(1) if match and (ROOT / 'android/web' / match.group(1)).exists() or match and (ROOT / match.group(1)).exists() else None


def rewrite_urls(text, drop_images, problems):
    def url(m):
        link = _link(m)
        if link.startswith(('data:', '#')):
            return m.group(0)
        asset = _asset_path(link)
        if asset is None:
            problems.append(link)
            return 'url(data:,)'
        return f"url('{quote(asset, safe='/')}')"
    # A quoted link may hold the other quote mark ("assets/relics/Berserker's Pact.png" was missed in v0.2.38).
    text = re.sub(r'''url\(\s*(?:"([^"]+)"|'([^']+)'|([^'")\s]+))\s*\)''', url, text)

    def src(m):
        link = htmllib.unescape(_link(m))
        if link.startswith('data:'):
            return m.group(0)
        asset = _asset_path(link)
        if asset is None:
            problems.append(link)
            return m.group(0)
        return f'src="{quote(asset, safe="/")}"'
    text = re.sub(r'''src=(?:"([^"]+)"|'([^']+)')''', src, text)
    if drop_images:
        bad = '|'.join(re.escape(p) for p in problems)
        if bad:
            text = re.sub(r'''<img\b[^>]*src=(?:"(?:%s)"|'(?:%s)')[^>]*>''' % (bad, bad), '', text)
    return text


def _link(m):
    return next(g for g in m.groups() if g is not None)


# Every class becomes pn<version>-<name>, e.g. pn0_2_38-ways, and the sheet's own rules are scoped to
# .patch-notes-sheet.pn0_2_38 (user, 2026-11-18). v0.2.38's sheet used .relics and .packs, the shop's global grid
# classes in mobile.css, so the game's 3-column relic grid took over those sections; and the window stacks every
# version, whose <style> blocks all apply to the whole page, so 0.2.36's .ways rule laid out 0.2.38's relics.
KEEP = ('patch-notes-sheet',)
CLASS_ATTR = re.compile(r'''class=(["'])([^"']*)\1''')


def tag(version):
    return 'pn' + version.replace('.', '_')


def _name(name, t):
    if name in KEEP or name == t or name.startswith(t + '-'):
        return name
    return f'{t}-' + re.sub(r'^pn(?:\d+_\d+_\d+)?-', '', name)


def prefix_css(css, version):
    t, rules = tag(version), []
    for prelude, body in _blocks(css):
        if prelude.startswith(('@font-face', '@keyframes')):
            rules.append(f'{prelude}{{{body}}}')
        elif prelude.startswith(('@media', '@supports')):
            rules.append(f'{prelude}{{{prefix_css(body, version)}}}')
        else:
            sel = re.sub(r'\.(-?[A-Za-z_][\w-]*)', lambda m: '.' + _name(m.group(1), t), prelude)
            sel = re.sub(r'\.patch-notes-sheet(?![\w.-])', f'.patch-notes-sheet.{t}', sel)
            rules.append(f'{sel}{{{body}}}')
    return '\n'.join(rules)


def prefix_fragment(text, version):
    """Scope a fragment to its version: no class the game or another version's sheet uses can reach it. Idempotent."""
    t = tag(version)
    text = re.sub(r'<style>(.*?)</style>', lambda m: f'<style>{prefix_css(m.group(1), version)}</style>', text, flags=re.S)

    def attr(m):
        names = [_name(n, t) for n in m.group(2).split()]
        if 'patch-notes-sheet' in names and t not in names:
            names.append(t)
        return f'class={m.group(1)}{" ".join(names)}{m.group(1)}'
    return CLASS_ATTR.sub(attr, text)


def stray_classes(text, version):
    """Classes in a fragment that are not scoped to its version."""
    t = tag(version)
    return [n for m in CLASS_ATTR.finditer(text) for n in m.group(2).split()
            if n not in KEEP and n != t and not n.startswith(t + '-')]


def card_inner(page):
    start = re.search(r'<div[^>]*\bid=["\']card["\'][^>]*>', page)
    if not start:
        raise SystemExit('No <div id="card"> sheet in the page.')
    depth, i = 1, start.end()
    for m in re.finditer(r'<(/?)div\b[^>]*>', page[i:]):
        depth += -1 if m.group(1) else 1
        if not depth:
            return page[i:i + m.start()]
    raise SystemExit('The <div id="card"> sheet is not closed.')


def import_page(path, version, lang, drop_images=False):
    if lang not in LANGS:
        raise SystemExit(f'Language must be one of {", ".join(LANGS)}.')
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise SystemExit('Version looks like 0.2.36.')
    page = Path(path).read_text(encoding='utf8')
    css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', page, flags=re.S))
    problems = []
    styles = rewrite_urls(scope_css(css), drop_images, problems)
    body = rewrite_urls(card_inner(page), drop_images, problems)
    body = re.sub(r'<script\b.*?</script>', '', body, flags=re.S)
    if problems and not drop_images:
        raise SystemExit('Not game assets (would ship as extra downloads):\n  ' + '\n  '.join(sorted(set(problems))) +
                         '\nUse game art instead, or pass --drop-images to leave them out.')
    out = SOURCE / version / f'{lang}.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    left = sorted(set(re.findall(r'''(?:file:|https?://)[^"')\s]*''', styles + body)))
    if left:
        raise SystemExit('Links left absolute (file:/// or http):\n  ' + '\n  '.join(left))
    fragment = prefix_fragment(f'<style>{styles}</style><div class="patch-notes-sheet">{body.strip()}</div>\n', version)
    out.write_text(fragment, encoding='utf8', newline='\n')
    print(f'{out.relative_to(ROOT)}: {out.stat().st_size:,} bytes' + (f', left out {len(set(problems))} image(s)' if problems else ''))


def build():
    versions = []
    for folder in SOURCE.glob('*') if SOURCE.exists() else []:
        if folder.is_dir() and re.fullmatch(r'\d+\.\d+\.\d+', folder.name):
            langs = [l for l in LANGS if (folder / f'{l}.html').exists()]
            if 'en' in langs:
                versions.append((tuple(map(int, folder.name.split('.'))), folder.name, langs))
                missing = [l for l in LANGS if l not in langs]
                if missing:
                    print(f'patch notes {folder.name}: no {", ".join(missing)} (English is shown instead)')
    versions.sort(reverse=True)
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for _, version, langs in versions:
        (OUT / version).mkdir()
        for lang in langs:
            text = prefix_fragment((SOURCE / version / f'{lang}.html').read_text(encoding='utf8'), version)
            (OUT / version / f'{lang}.html').write_text(text, encoding='utf8', newline='\n')
    index = {'versions': [{'version': v, 'languages': langs} for _, v, langs in versions]}
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')
    return index


MEASURE = '''<script>
addEventListener('load', async () => {
 await document.fonts.ready;
 await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })));
 const sheets = [...document.querySelectorAll('.patch-notes-sheet')].map(sheet => {
  const o = sheet.getBoundingClientRect(), els = [...sheet.querySelectorAll('*')].filter(e => e.tagName !== 'STYLE');
  return {size: [o.width, o.height], broken: [...sheet.querySelectorAll('img')].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')),
   boxes: els.map(e => { const r = e.getBoundingClientRect(); return [e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ').join('.') : ''),
    (e.textContent || '').trim().slice(0, 40), Math.round(r.left - o.left), Math.round(r.top - o.top), Math.round(r.width), Math.round(r.height)] })};
 });
 const pre = document.createElement('pre'); pre.id = 'measure'; pre.textContent = JSON.stringify(sheets); document.body.append(pre);
});
</script>'''


def _edge():
    for base in (os.environ.get('ProgramFiles(x86)'), os.environ.get('ProgramFiles'), os.environ.get('LOCALAPPDATA')):
        exe = Path(base or '') / 'Microsoft/Edge/Application/msedge.exe'
        if base and exe.exists():
            return exe
    return None


def _measure(edge, page, folder):
    path = folder / 'page.html'
    path.write_text(page, encoding='utf8')
    dom = subprocess.run([str(edge), '--headless=new', '--disable-gpu', f'--user-data-dir={folder / "profile"}', '--window-size=1600,3000',
                          '--allow-file-access-from-files', '--virtual-time-budget=8000', '--dump-dom', path.as_uri()],
                         capture_output=True, text=True, encoding='utf8', timeout=120).stdout
    found = re.search(r'<pre id="measure">(.*?)</pre>', dom, flags=re.S)
    if not found:
        raise RuntimeError('the sheet was not measured (Edge did not finish the page)')
    return json.loads(htmllib.unescape(found.group(1)))


def _compare(a, b):
    problems = [f'broken image {src}' for src in sorted(set(a['broken'] + b['broken']))]
    if len(a['boxes']) != len(b['boxes']):
        return problems + [f'{len(a["boxes"])} elements alone, {len(b["boxes"])} in the game']
    # The game's window may zoom the whole sheet (it fits 1400 px into the window): compare at the same scale.
    k = b['size'][0] / a['size'][0] if a['size'][0] else 1
    if abs(a['size'][1] * k - b['size'][1]) > 3:
        problems.append(f'sheet is {a["size"][0]:.0f}x{a["size"][1]:.0f} alone, {b["size"][0]:.0f}x{b["size"][1]:.0f} in the game')
    moved = [(x, y) for x, y in zip(a['boxes'], b['boxes']) if any(abs(p * k - q) > 3 for p, q in zip(x[2:], y[2:]))]
    for x, y in moved[:6]:
        problems.append(f'{x[0]} "{x[1]}" at {x[2:]} alone, {y[2:]} in the game')
    if len(moved) > 6:
        problems.append(f'...and {len(moved) - 6} more elements moved')
    return problems


def render_check(stack, edge, alone_cache):
    """Draw the window's stack of sheets [(name, fragment)] inside the game's CSS, and each sheet alone; list the differences."""
    base = (ROOT / 'android/web').as_uri() + '/'
    head = f'<!doctype html><html><head><meta charset="utf-8"><base href="{base}">'
    game = (f'{head}<link rel="stylesheet" href="mobile.css"><link rel="stylesheet" href="vector-backgrounds.css"></head><body>'
            f'<dialog id="modal" class="patch-notes-modal" open><div class="modal-head"><h2>Patch notes</h2><button>Close</button></div>'
            f'<div class="patch-notes" data-no-i18n>{"".join(f for _, f in stack)}</div></dialog>{MEASURE}</body></html>')
    problems = []
    with tempfile.TemporaryDirectory() as tmp:
        drawn = _measure(edge, game, Path(tmp))
        if len(drawn) != len(stack):
            return [f'{len(stack)} sheets in the window, {len(drawn)} drawn']
        for (name, fragment), b in zip(stack, drawn):
            if name not in alone_cache:
                alone_cache[name] = _measure(edge, f'{head}</head><body style="margin:0">{fragment}{MEASURE}</body></html>', Path(tmp))[0]
            problems += [f'{name}: {p}' for p in _compare(alone_cache[name], b)]
    return problems


def check(render=True, version=None):
    """Problems in the shipped fragments; empty when the patch notes are safe to release."""
    problems = []
    versions = sorted((f for f in SOURCE.glob('*') if f.is_dir() and re.fullmatch(r'\d+\.\d+\.\d+', f.name)),
                      key=lambda f: tuple(map(int, f.name.split('.'))), reverse=True)
    if not versions:
        return problems
    version = version or (ROOT / 'VERSION').read_text(encoding='utf8').strip()
    if versions[0].name != version:
        problems.append(f'no patch notes for {version} (data/patch-notes/{version}/), or an older version is newest')
    else:
        missing = [lang for lang in LANGS if not (versions[0] / f'{lang}.html').exists()]
        if missing:
            problems.append(f'{version}: no sheet for {", ".join(missing)}')
    shipped = {}
    for folder in versions:
        for page in sorted(folder.glob('*.html')):
            name = f'{folder.name}/{page.name}'
            text = shipped[name] = prefix_fragment(page.read_text(encoding='utf8'), folder.name)
            for link in re.findall(r'''(?:file:|https?://)[^"')\s]*''', text):
                problems.append(f'{name}: absolute link {link}')
            for link in re.findall(r'''(?:src="|url\(')([^"']+)''', text):
                if not link.startswith('data:') and not (ROOT / 'android/web' / unquote(link)).is_file():
                    problems.append(f'{name}: missing asset {link}')
            problems += [f'{name}: class {n} is not scoped to {tag(folder.name)}' for n in stray_classes(text, folder.name)]
    if not render:
        return problems
    edge = _edge()
    if not edge:
        return problems + ['Microsoft Edge was not found, so the sheets could not be drawn (pass --no-render to skip)']
    # The window stacks every version newest first, each in the player's language or English: draw that stack per language.
    alone = {}
    for lang in LANGS:
        stack = []
        for folder in versions:
            name = f'{folder.name}/{lang}.html' if f'{folder.name}/{lang}.html' in shipped else f'{folder.name}/en.html'
            if name in shipped:
                stack.append((name, shipped[name]))
        try:
            problems += [p for p in render_check(stack, edge, alone) if p not in problems]
        except Exception as error:
            problems.append(f'{lang}: could not draw the sheets ({error})')
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    imp = sub.add_parser('import', help='turn a notes page into data/patch-notes/<version>/<lang>.html')
    imp.add_argument('page')
    imp.add_argument('--version', required=True)
    imp.add_argument('--lang', default='en')
    imp.add_argument('--drop-images', action='store_true', help='leave out images that are not game assets')
    sub.add_parser('build', help='copy every version into android/web/patch-notes/')
    chk = sub.add_parser('check', help='refuse broken sheets before a release push')
    chk.add_argument('--no-render', action='store_true', help='skip drawing the newest sheets in headless Edge')
    chk.add_argument('--version', help='the version whose sheets are drawn (default: VERSION)')
    args = parser.parse_args()
    if args.command == 'check':
        problems = check(not args.no_render, args.version)
        if problems:
            raise SystemExit('Patch notes check FAILED:\n  ' + '\n  '.join(problems))
        print('Patch notes check passed.')
    elif args.command == 'import':
        import_page(args.page, args.version, args.lang, args.drop_images)
    else:
        index = build()
        print(f'{len(index["versions"])} version(s) in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
