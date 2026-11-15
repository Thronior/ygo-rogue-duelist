"""Draft Duels "No relics" rooms (android/web/draft-ui.js, draft-character-select.js and the rooms Worker DraftRegistry,
user 2026-11-15), all 8 languages. Never overwrites an existing translation, so running it again changes nothing."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
HOSTING = 'Hosting only: the Draft Screen offers packs alone and every duel is played without relics.'
HELP = 'The host can tick No relics: the Draft Screen then offers character packs only, and every duel is played without relics.'
JOIN = 'This room is played without relics. Update or refresh the game to join it.'
# de, es, fr, it, ja, ko, pt, zh
TERMS = {
 'No relics': ('Keine Relikte', 'Sin reliquias', 'Sans reliques', 'Senza reliquie', 'レリックなし', '유물 없음', 'Sem relíquias', '无遗物'),
 HOSTING: ('Nur beim Hosten: Der Draft-Bildschirm bietet nur Packs an, und jedes Duell wird ohne Relikte gespielt.',
  'Solo al crear la sala: la pantalla de draft ofrece solo sobres y todos los duelos se juegan sin reliquias.',
  "Uniquement pour l'hôte : l'écran de draft ne propose que des boosters et chaque duel se joue sans reliques.",
  'Solo per chi ospita: la schermata del draft offre solo buste e ogni duello si gioca senza reliquie.',
  'ホスト時のみ：ドラフト画面ではパックだけが提示され、すべてのデュエルがレリックなしで行われます。',
  '방을 만들 때만 적용: 드래프트 화면에 팩만 나오고 모든 듀얼을 유물 없이 진행합니다.',
  'Só ao criar a sala: a tela de draft oferece apenas pacotes e todos os duelos são jogados sem relíquias.',
  '仅限房主：轮抽界面只提供补充包，每场决斗都不使用遗物。'),
 'Every duel in this room is played without relics.': ('Jedes Duell in diesem Raum wird ohne Relikte gespielt.',
  'Todos los duelos de esta sala se juegan sin reliquias.', 'Chaque duel de ce salon se joue sans reliques.',
  'Ogni duello in questa stanza si gioca senza reliquie.', 'このルームのデュエルはすべてレリックなしで行われます。',
  '이 방의 모든 듀얼은 유물 없이 진행됩니다.', 'Todos os duelos desta sala são jogados sem relíquias.', '此房间的每场决斗都不使用遗物。'),
 HELP: ('Der Host kann „Keine Relikte“ ankreuzen: Dann bietet der Draft-Bildschirm nur Charakter-Packs an, und jedes Duell wird ohne Relikte gespielt.',
  'El anfitrión puede marcar Sin reliquias: la pantalla de draft ofrece entonces solo sobres de personaje y todos los duelos se juegan sin reliquias.',
  "L'hôte peut cocher Sans reliques : l'écran de draft ne propose alors que des boosters de personnage et chaque duel se joue sans reliques.",
  'Chi ospita può spuntare Senza reliquie: la schermata del draft offre allora solo buste personaggio e ogni duello si gioca senza reliquie.',
  'ホストは「レリックなし」を選べます。その場合、ドラフト画面ではキャラクターパックだけが提示され、すべてのデュエルがレリックなしで行われます。',
  '방장은 유물 없음을 선택할 수 있습니다. 그러면 드래프트 화면에 캐릭터 팩만 나오고 모든 듀얼을 유물 없이 진행합니다.',
  'O anfitrião pode marcar Sem relíquias: a tela de draft passa a oferecer apenas pacotes de personagem e todos os duelos são jogados sem relíquias.',
  '房主可以勾选“无遗物”：轮抽界面将只提供角色补充包，每场决斗都不使用遗物。'),
 'Choose one character pack.': ('Wähle ein Charakter-Pack.', 'Elige un sobre de personaje.', 'Choisissez un booster de personnage.',
  'Scegli una busta personaggio.', 'キャラクターパックを1つ選んでください。', '캐릭터 팩을 1개 고르세요.', 'Escolha um pacote de personagem.', '请选择一个角色补充包。'),
 'Choose a pack that is still available.': ('Wähle ein Pack, das noch verfügbar ist.', 'Elige un sobre que siga disponible.',
  'Choisissez un booster encore disponible.', 'Scegli una busta ancora disponibile.', 'まだ残っているパックを選んでください。',
  '아직 남아 있는 팩을 고르세요.', 'Escolha um pacote ainda disponível.', '请选择仍可选的补充包。'),
 JOIN: ('In diesem Raum wird ohne Relikte gespielt. Aktualisiere das Spiel oder lade es neu, um beizutreten.',
  'Esta sala se juega sin reliquias. Actualiza o recarga el juego para unirte.',
  'Ce salon se joue sans reliques. Mettez à jour ou actualisez le jeu pour le rejoindre.',
  'Questa stanza si gioca senza reliquie. Aggiorna o ricarica il gioco per entrare.',
  'このルームはレリックなしで行われます。参加するにはゲームを更新するか再読み込みしてください。',
  '이 방은 유물 없이 진행됩니다. 참가하려면 게임을 업데이트하거나 새로 고치세요.',
  'Esta sala é jogada sem relíquias. Atualize ou recarregue o jogo para entrar.',
  '此房间不使用遗物。请更新或刷新游戏后再加入。'),
}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'draft-ui.js No relics rooms (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))

if __name__ == '__main__':
    main()
