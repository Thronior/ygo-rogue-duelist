"""Collects English prose from the campaign's Python modules (messages, descriptions, labels) for translation.

f-strings become patterns with {0}, {1}... placeholders. Usage: python tools/i18n/extract_py_strings.py <out.json>
"""
import ast, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Developer tools, tests and build scripts never reach the player.
SKIP = re.compile(r'^(test_|build_|tools|setup|catalog|simulate)')


def prose(text):
    s = re.sub(r'\{\d+\}', '', text).strip()
    if len(s) < 3 or not re.search(r'[A-Za-z]', s):
        return False
    if re.search(r'https?:|\.(png|jpe?g|json|lua|ydk|cdb|py|js)\b|^[./]', s):
        return False
    if re.fullmatch(r'[a-z0-9_\-.:]+', s):  # keys and identifiers
        return False
    if re.fullmatch(r'[A-Z0-9_]+', s):
        return False
    # A player-facing phrase has a space (two words) or starts with a capital letter.
    return ' ' in s or s[0].isupper()


def literal(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value, 'exact'
    if isinstance(node, ast.JoinedStr):
        parts, n = [], 0
        for v in node.values:
            if isinstance(v, ast.Constant):
                parts.append(str(v.value))
            else:
                parts.append('{%d}' % n)
                n += 1
        return ''.join(parts), 'pattern' if n else 'exact'
    return None


found = {}
for path in sorted(ROOT.glob('*.py')):
    if SKIP.match(path.name):
        continue
    tree = ast.parse(path.read_text(encoding='utf8'))
    docstrings = {id(n.body[0].value) for n in ast.walk(tree)
                  if isinstance(n, (ast.Module, ast.FunctionDef, ast.ClassDef)) and n.body
                  and isinstance(n.body[0], ast.Expr) and isinstance(getattr(n.body[0], 'value', None), ast.Constant)}
    for node in ast.walk(tree):
        if id(node) in docstrings:
            continue
        got = literal(node)
        if not got:
            continue
        text, kind = got
        text = re.sub(r'\s+', ' ', text).strip()
        if prose(text):
            row = found.setdefault(text, {'text': text, 'kind': kind, 'files': set()})
            row['files'].add(path.name)
rows = sorted(({'text': r['text'], 'kind': r['kind'], 'files': sorted(r['files'])} for r in found.values()), key=lambda r: r['text'])
Path(sys.argv[1]).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf8')
print(len(rows), 'strings', sum(r['kind'] == 'pattern' for r in rows), 'patterns')
