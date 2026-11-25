"""Deck editor pass (user, 2026-11-25): "+ New Deck" in My decks and a clear Save button. All 8 languages, matching each
language's existing "My decks" wording. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'New Deck': ('Neues Deck', 'Nuevo deck', 'Nouveau Deck', 'Nuovo Deck', '新しいデッキ', '새 덱', 'Novo Deck', '新建卡组'),
 'Save deck': ('Deck speichern', 'Guardar deck', 'Enregistrer le Deck', 'Salva Deck', 'デッキを保存', '덱 저장', 'Salvar Deck', '保存卡组'),
 'Saved ✓': ('Gespeichert ✓', 'Guardado ✓', 'Enregistré ✓', 'Salvato ✓', '保存しました ✓', '저장됨 ✓', 'Salvo ✓', '已保存 ✓'),
 'Deck saved. Find it in My decks.': (
  'Deck gespeichert. Du findest es unter Meine Decks.',
  'Deck guardado. Lo encontrarás en Mis decks.',
  'Deck enregistré. Retrouve-le dans Mes Decks.',
  'Deck salvato. Lo trovi in I miei Deck.',
  'デッキを保存しました。マイデッキにあります。',
  '덱을 저장했습니다. 내 덱에서 찾을 수 있습니다.',
  'Deck salvo. Ele está em Meus Decks.',
  '卡组已保存。可在“我的卡组”中找到。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
