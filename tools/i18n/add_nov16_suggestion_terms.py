"""Discord suggestions of 2026-11-16, all 8 languages: coin milestones past 8,000, card marks, the inspection window's
Add/Remove button, the close button and the patch notes window. Never overwrites an existing translation.

The new milestone labels reuse each language's own translation of the 8,000+ (6,000+ for Largest hit) label with the
number swapped, so separators and word order stay what the translators chose."""
import json
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TIERS = {'Damage dealt': (8000, [12000, 16000, 24000, 32000]), 'Effect damage dealt': (8000, [12000, 16000, 24000, 32000]),
         'LP recovered': (8000, [12000, 16000, 24000, 32000]), 'Largest damage hit': (6000, [8000, 10000])}
# Order: de, es, fr, it, ja, ko, pt, zh (LANGS).
TERMS = {
 'Patch notes': ('Patchnotes', 'Notas del parche', 'Notes de mise à jour', 'Note sulla patch', 'パッチノート', '패치 노트', 'Notas da atualização', '更新说明'),
 "What's new in v{0}": ('Neu in v{0}', 'Novedades de la v{0}', 'Nouveautés de la v{0}', 'Novità della v{0}', 'v{0}の新要素', 'v{0} 새로운 점', 'Novidades da v{0}', 'v{0} 更新内容'),
 'No patch notes yet. They start with the next update.': (
  'Noch keine Patchnotes. Sie beginnen mit dem nächsten Update.', 'Aún no hay notas del parche. Empiezan con la próxima actualización.',
  'Pas encore de notes de mise à jour. Elles commencent avec la prochaine mise à jour.', 'Ancora nessuna nota sulla patch. Iniziano con il prossimo aggiornamento.',
  'パッチノートはまだありません。次のアップデートから始まります。', '아직 패치 노트가 없습니다. 다음 업데이트부터 시작됩니다.',
  'Ainda não há notas da atualização. Elas começam na próxima atualização.', '暂无更新说明。将从下一次更新开始提供。'),
 'Close the game': ('Spiel schließen', 'Cerrar el juego', 'Fermer le jeu', 'Chiudi il gioco', 'ゲームを閉じる', '게임 닫기', 'Fechar o jogo', '关闭游戏'),
 'Your progress is saved. Close this tab or window to quit.': (
  'Dein Fortschritt ist gespeichert. Schließe diesen Tab oder dieses Fenster, um das Spiel zu beenden.',
  'Tu progreso está guardado. Cierra esta pestaña o ventana para salir.',
  'Votre progression est sauvegardée. Fermez cet onglet ou cette fenêtre pour quitter.',
  'I tuoi progressi sono salvati. Chiudi questa scheda o finestra per uscire.',
  '進行状況は保存されています。終了するにはこのタブかウィンドウを閉じてください。',
  '진행 상황이 저장되었습니다. 종료하려면 이 탭이나 창을 닫으세요.',
  'Seu progresso está salvo. Feche esta aba ou janela para sair.',
  '你的进度已保存。关闭此标签页或窗口即可退出。'),
 'Mark this card': ('Karte markieren', 'Marcar esta carta', 'Marquer cette carte', 'Segna questa carta', 'このカードに印をつける', '이 카드 표시', 'Marcar esta carta', '标记这张卡'),
 'Marked Yes': ('Markiert: Ja', 'Marcada: Sí', 'Marquée : Oui', 'Segnata: Sì', '印：はい', '표시: 예', 'Marcada: Sim', '已标记：是'),
 'Marked No': ('Markiert: Nein', 'Marcada: No', 'Marquée : Non', 'Segnata: No', '印：いいえ', '표시: 아니요', 'Marcada: Não', '已标记：否'),
 '{0} owned · {1} in deck': ('{0} im Besitz · {1} im Deck', '{0} en posesión · {1} en el deck', '{0} possédée(s) · {1} dans le deck',
  '{0} posseduta/e · {1} nel Deck', '所持 {0} · デッキに {1}', '보유 {0} · 덱에 {1}', '{0} possuído(s) · {1} no deck', '拥有 {0} · 卡组中 {1}'),
}
PATTERNS = {"What's new in v{0}", '{0} owned · {1} in deck'}


def renumber(text, old, new):
    """Swap `old` for `new` in `text`, written with the same thousands separator `text` uses for `old`."""
    head, tail = divmod(old, 1000)
    match = re.search(rf'{head}([.,   ]?){tail:03d}', text)
    if not match:
        raise ValueError(f'{old} not found in {text!r}')
    sep = match.group(1)
    digits = f'{new:,}'.replace(',', sep) if sep else str(new)
    return text[:match.start()] + digits + text[match.end():]


def main():
    tier_terms = {}
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for label, (base, steps) in TIERS.items():
            source = table[f'{label}: {base:,}+']
            for n in steps:
                en = f'{label}: {n:,}+'
                tier_terms[en] = 'coin reward condition'
                table.setdefault(en, renumber(source, base, n))
        for en, local in TERMS.items():
            table.setdefault(en, local[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en, ctx in tier_terms.items():
        if en not in known:
            catalog.append({'group': 'rules', 'en': en, 'kind': 'exact', 'ctx': ctx})
    for en in TERMS:
        if en not in known:
            catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if en in PATTERNS else 'exact', 'ctx': 'Discord suggestions 2026-11-16'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')


if __name__ == '__main__':
    main()
