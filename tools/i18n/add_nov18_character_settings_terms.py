"""Character settings (saved card marks per character), the card window's mark button and Final Countdown's turns left
(2026-11-18), all 8 languages. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Character settings': ('Charaktereinstellungen', 'Ajustes del personaje', 'Paramètres du personnage', 'Impostazioni personaggio',
  'キャラクター設定', '캐릭터 설정', 'Configurações do personagem', '角色设置'),
 'Character': ('Charakter', 'Personaje', 'Personnage', 'Personaggio', 'キャラクター', '캐릭터', 'Personagem', '角色'),
 '{0} · Settings': ('{0} · Einstellungen', '{0} · Ajustes', '{0} · Paramètres', '{0} · Impostazioni', '{0} · 設定', '{0} · 설정',
  '{0} · Configurações', '{0} · 设置'),
 '{0} · Card marks': ('{0} · Kartenmarkierungen', '{0} · Marcas de cartas', '{0} · Marques de cartes', '{0} · Segni delle carte',
  '{0} · カードの印', '{0} · 카드 표시', '{0} · Marcas de cards', '{0} · 卡片标记'),
 'Save marks from runs': ('Markierungen aus Durchläufen speichern', 'Guardar las marcas de las partidas', 'Garder les marques des parties',
  'Salva i segni delle partite', 'ランの印を保存', '런의 표시 저장', 'Salvar as marcas das jornadas', '保存冒险中的标记'),
 "★ and ✕ you set during a run are also saved for this character's next runs.": (
  '★ und ✕, die du in einem Durchlauf setzt, werden auch für die nächsten Durchläufe dieses Charakters gespeichert.',
  'Las ★ y ✕ que pongas en una partida también se guardan para las próximas partidas de este personaje.',
  "Les ★ et ✕ posés pendant une partie sont aussi gardés pour les prochaines parties de ce personnage.",
  'I ★ e ✕ messi durante una partita vengono salvati anche per le prossime partite di questo personaggio.',
  'ラン中につけた★と✕は、このキャラクターの次のランにも保存されます。',
  '런 중에 단 ★와 ✕는 이 캐릭터의 다음 런에도 저장됩니다.',
  'As ★ e ✕ marcadas numa jornada também ficam salvas para as próximas jornadas deste personagem.',
  '冒险中设置的★和✕也会保存到这个角色之后的冒险。'),
 'Saved card marks': ('Gespeicherte Kartenmarkierungen', 'Marcas de cartas guardadas', 'Marques de cartes enregistrées',
  'Segni delle carte salvati', '保存したカードの印', '저장된 카드 표시', 'Marcas de cards salvas', '已保存的卡片标记'),
 'Every new run with this character starts with these marks. You can still change them during the run.': (
  'Jeder neue Durchlauf mit diesem Charakter beginnt mit diesen Markierungen. Du kannst sie im Durchlauf weiter ändern.',
  'Cada partida nueva con este personaje empieza con estas marcas. Puedes cambiarlas durante la partida.',
  'Chaque nouvelle partie avec ce personnage commence avec ces marques. Vous pouvez toujours les changer en cours de partie.',
  'Ogni nuova partita con questo personaggio inizia con questi segni. Puoi comunque cambiarli durante la partita.',
  'このキャラクターの新しいランはこの印で始まります。ラン中にも変更できます。',
  '이 캐릭터의 새 런은 이 표시로 시작합니다. 런 중에도 바꿀 수 있습니다.',
  'Toda jornada nova com este personagem começa com estas marcas. Você ainda pode mudá-las durante a jornada.',
  '这个角色的每次新冒险都会带着这些标记开始。冒险中仍可修改。'),
 'Edit card marks': ('Kartenmarkierungen bearbeiten', 'Editar marcas de cartas', 'Modifier les marques', 'Modifica i segni',
  'カードの印を編集', '카드 표시 편집', 'Editar marcas de cards', '编辑卡片标记'),
 'Clear': ('Leeren', 'Borrar', 'Effacer', 'Cancella', 'クリア', '지우기', 'Limpar', '清除'),
 'Tap a card to cycle ☆ → ★ → ✕.': ('Tippe auf eine Karte: ☆ → ★ → ✕.', 'Toca una carta para alternar ☆ → ★ → ✕.',
  'Touchez une carte pour passer de ☆ à ★ puis ✕.', 'Tocca una carta per passare da ☆ a ★ a ✕.',
  'カードをタップで ☆ → ★ → ✕ と切り替え。', '카드를 탭하면 ☆ → ★ → ✕ 순으로 바뀝니다.',
  'Toque num card para alternar ☆ → ★ → ✕.', '点击卡片切换 ☆ → ★ → ✕。'),
 'Search cards': ('Karten suchen', 'Buscar cartas', 'Rechercher des cartes', 'Cerca carte', 'カードを検索', '카드 검색',
  'Buscar cards', '搜索卡片'),
 'All cards': ('Alle Karten', 'Todas las cartas', 'Toutes les cartes', 'Tutte le carte', 'すべてのカード', '모든 카드',
  'Todos os cards', '所有卡片'),
 'Marked': ('Markiert', 'Marcadas', 'Marquées', 'Segnate', '印つき', '표시됨', 'Marcadas', '已标记'),
 '★ only': ('Nur ★', 'Solo ★', '★ seulement', 'Solo ★', '★のみ', '★만', 'Só ★', '仅★'),
 '✕ only': ('Nur ✕', 'Solo ✕', '✕ seulement', 'Solo ✕', '✕のみ', '✕만', 'Só ✕', '仅✕'),
 'No cards match.': ('Keine passenden Karten.', 'Ninguna carta coincide.', 'Aucune carte ne correspond.', 'Nessuna carta corrisponde.',
  '一致するカードがありません。', '일치하는 카드가 없습니다.', 'Nenhum card corresponde.', '没有符合的卡片。'),
 'Previous page': ('Vorherige Seite', 'Página anterior', 'Page précédente', 'Pagina precedente', '前のページ', '이전 페이지',
  'Página anterior', '上一页'),
 'Next page': ('Nächste Seite', 'Página siguiente', 'Page suivante', 'Pagina successiva', '次のページ', '다음 페이지',
  'Próxima página', '下一页'),
 '{0} / {1} · {2} cards': ('{0} / {1} · {2} Karten', '{0} / {1} · {2} cartas', '{0} / {1} · {2} cartes', '{0} / {1} · {2} carte',
  '{0} / {1} · {2}枚', '{0} / {1} · {2}장', '{0} / {1} · {2} cards', '{0} / {1} · {2}张'),
 'No character in this duel.': ('Kein Charakter in diesem Duell.', 'No hay personaje en este duelo.', 'Aucun personnage dans ce duel.',
  'Nessun personaggio in questo duello.', 'このデュエルにはキャラクターがいません。', '이 듀얼에는 캐릭터가 없습니다.',
  'Nenhum personagem neste duelo.', '这场决斗没有角色。'),
 'Final Countdown (yours): {0} turns left': ('Letzter Countdown (deiner): noch {0} Spielzüge',
  'Cuenta Atrás Final (tuya): quedan {0} turnos', 'Compte à Rebours Final (le vôtre) : {0} tours restants',
  'Conto alla Rovescia (tuo): mancano {0} turni', '終焉のカウントダウン（自分）：残り{0}ターン', '종언의 카운트 다운 (자신): {0}턴 남음',
  'Contagem Final (seu): faltam {0} turnos', '终焉的倒计时（自己）：还剩{0}回合'),
 'Final Countdown (opponent): {0} turns left': ('Letzter Countdown (Gegner): noch {0} Spielzüge',
  'Cuenta Atrás Final (rival): quedan {0} turnos', "Compte à Rebours Final (adversaire) : {0} tours restants",
  'Conto alla Rovescia (avversario): mancano {0} turni', '終焉のカウントダウン（相手）：残り{0}ターン', '종언의 카운트 다운 (상대): {0}턴 남음',
  'Contagem Final (oponente): faltam {0} turnos', '终焉的倒计时（对方）：还剩{0}回合'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'Character settings / Final Countdown (2026-11-18)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
