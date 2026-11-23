"""Watch CPU duel "My decks" tab and naming custom decks in the deck editor (user, 2026-11-22, Discord: Nori).
All 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'My decks': ('Meine Decks', 'Mis decks', 'Mes Decks', 'I miei Deck', 'マイデッキ', '내 덱', 'Meus Decks', '我的卡组'),
 'Played by': ('Gespielt von', 'Jugado por', 'Joué par', 'Giocato da', '使用者', '사용자', 'Jogado por', '使用者'),
 'Use campaign deck': ('Kampagnendeck verwenden', 'Usar deck de campaña', 'Utiliser le Deck de campagne', 'Usa il Deck della campagna', 'キャンペーンのデッキを使う', '캠페인 덱 사용', 'Usar Deck da campanha', '使用战役卡组'),
 'No saved decks yet. Build one in the Deck editor.': (
  'Noch keine gespeicherten Decks. Baue eines im Deck-Editor.',
  'Aún no hay decks guardados. Crea uno en el Editor de decks.',
  "Aucun Deck enregistré pour l'instant. Construis-en un dans l'Éditeur de deck.",
  "Nessun Deck salvato. Creane uno nell'editor dei Deck.",
  '保存されたデッキはまだありません。デッキエディターで作成してください。',
  '저장된 덱이 아직 없습니다. 덱 에디터에서 만들어 보세요.',
  'Ainda não há Decks salvos. Monte um no editor de Decks.',
  '还没有保存的卡组。请在卡组编辑器中构筑一个。'),
 'Rename': ('Umbenennen', 'Renombrar', 'Renommer', 'Rinomina', '名前を変更', '이름 변경', 'Renomear', '重命名'),
 'Name your deck': ('Benenne dein Deck', 'Ponle nombre a tu deck', 'Nomme ton Deck', 'Dai un nome al tuo Deck', 'デッキに名前を付ける', '덱 이름 정하기', 'Dê um nome ao seu Deck', '为卡组命名'),
 'Deck name': ('Deckname', 'Nombre del deck', 'Nom du Deck', 'Nome del Deck', 'デッキ名', '덱 이름', 'Nome do Deck', '卡组名称'),
 'Create': ('Erstellen', 'Crear', 'Créer', 'Crea', '作成', '만들기', 'Criar', '创建'),
 'Save': ('Speichern', 'Guardar', 'Enregistrer', 'Salva', '保存', '저장', 'Salvar', '保存'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
