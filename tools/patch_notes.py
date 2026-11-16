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
import shutil
from pathlib import Path
from urllib.parse import unquote

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
        quote, link = m.group(1), m.group(2)
        if link.startswith(('data:', '#')):
            return m.group(0)
        asset = _asset_path(link)
        if asset is None:
            problems.append(link)
            return 'url(data:,)'
        return f'url({quote}{asset}{quote})'
    text = re.sub(r'url\(\s*([\'"]?)([^\'")]+)\1\s*\)', url, text)

    def src(m):
        link = htmllib.unescape(m.group(2))
        if link.startswith('data:'):
            return m.group(0)
        asset = _asset_path(link)
        if asset is None:
            problems.append(link)
            return m.group(0)
        return f'src={m.group(1)}{asset}{m.group(1)}'
    text = re.sub(r'src=([\'"])([^\'"]+)\1', src, text)
    if drop_images:
        bad = {re.escape(p) for p in problems}
        if bad:
            text = re.sub(r'<img\b[^>]*src=([\'"])(?:%s)\1[^>]*>' % '|'.join(bad), '', text)
    return text


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
    out.write_text(f'<style>{styles}</style><div class="patch-notes-sheet">{body.strip()}</div>\n', encoding='utf8', newline='\n')
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
            shutil.copyfile(SOURCE / version / f'{lang}.html', OUT / version / f'{lang}.html')
    index = {'versions': [{'version': v, 'languages': langs} for _, v, langs in versions]}
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')
    return index


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    imp = sub.add_parser('import', help='turn a notes page into data/patch-notes/<version>/<lang>.html')
    imp.add_argument('page')
    imp.add_argument('--version', required=True)
    imp.add_argument('--lang', default='en')
    imp.add_argument('--drop-images', action='store_true', help='leave out images that are not game assets')
    sub.add_parser('build', help='copy every version into android/web/patch-notes/')
    args = parser.parse_args()
    if args.command == 'import':
        import_page(args.page, args.version, args.lang, args.drop_images)
    else:
        index = build()
        print(f'{len(index["versions"])} version(s) in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
