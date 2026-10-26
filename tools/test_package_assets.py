"""Packaged images (tools/package_assets.py) must decode, keep their dimensions and frames, and look the same."""
import io, math, random, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from PIL import Image, ImageChops, ImageStat
from mobile_bundle import web_files
from package_assets import packaged_files, shrinkable, unused_textures


def flatten(im):
    im = im.convert('RGBA')
    return Image.alpha_composite(Image.new('RGBA', im.size, (20, 30, 40, 255)), im).convert('RGB')


def psnr(a, b):
    mse = sum(v ** 2 for v in ImageStat.Stat(ImageChops.difference(flatten(a), flatten(b))).rms) / 3
    return 99 if mse == 0 else 10 * math.log10(255 ** 2 / mse)


if __name__ == '__main__':
    web = ROOT / 'android/web'
    files = list(web_files(web))
    packaged = dict((relative.as_posix(), source) for relative, source in packaged_files(web, files))
    sources = {relative.as_posix(): path for path, relative in files}

    # Only unreferenced textures are dropped, and never their credit notices.
    dropped = set(sources) - set(packaged)
    assert dropped == unused_textures(web), sorted(dropped ^ unused_textures(web))[:5]
    assert all(name.startswith('textures/') and not name.endswith('.txt') for name in dropped)
    client = ''.join(p.read_text(encoding='utf8', errors='ignore') for p in [*web.glob('*.js'), *web.glob('*.css'), *web.glob('*.html')])
    assert not any(Path(name).name in client for name in dropped), 'a dropped texture is referenced'

    replaced = {name: data for name, data in packaged.items() if isinstance(data, bytes) and shrinkable(Path(name))}
    special = [name for name in replaced if name.endswith(('.gif', '.svg'))]
    random.seed(11)
    checked = special + random.sample(sorted(set(replaced) - set(special)), min(400, len(replaced) - len(special)))
    worst = 99
    for name in checked:
        original, data = sources[name].read_bytes(), replaced[name]
        assert len(data) < len(original), name
        if name.endswith('.svg'):
            assert data.startswith(b'<') and b'data:image/webp;base64,' in data, name
            continue
        a, b = Image.open(io.BytesIO(original)), Image.open(io.BytesIO(data))
        assert b.format == 'WEBP' and a.size == b.size, (name, a.size, b.size)
        assert getattr(a, 'n_frames', 1) == getattr(b, 'n_frames', 1), name
        score = psnr(a, b)
        worst = min(worst, score)
        assert score >= 28, (name, round(score, 1))
    before = sum(sources[name].stat().st_size for name in replaced)
    after = sum(len(data) for data in replaced.values())
    print(f'PASS packaged images: {len(replaced)} WebP ({before / 1e6:.1f} -> {after / 1e6:.1f} MB), '
          f'{len(checked)} checked (worst {worst:.1f} dB), {len(dropped)} unused textures left out')
