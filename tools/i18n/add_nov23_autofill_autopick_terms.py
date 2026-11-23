"""Auto-fill to minimum (the deck editor's grey count arrow previews the cards to add) and the Auto-Pick Single Choices
setting (user, 2026-11-23), in all 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Auto-Pick Single Choices': ('Einzige Wahl automatisch', 'Elección única automática', 'Choix unique automatique', 'Scelta unica automatica', '選択肢が1つなら自動選択', '단일 선택 자동', 'Escolha única automática', '唯一选项自动选择'),
 'When a prompt has only one possible card, it is picked for you.': (
  'Wenn nur eine Karte gewählt werden kann, wird sie für dich gewählt.',
  'Si solo hay una carta posible, se elige por ti.',
  'Quand une seule carte est possible, elle est choisie pour toi.',
  'Se è possibile scegliere una sola carta, viene scelta per te.',
  '選べるカードが1枚だけのときは自動で選びます。',
  '고를 수 있는 카드가 하나뿐이면 자동으로 고릅니다.',
  'Quando só há uma carta possível, ela é escolhida para você.',
  '只有一张卡可选时会自动为你选择。'),
 'Your deck needs {0} more cards': ('Deinem Deck fehlen noch {0} Karten', 'A tu baraja le faltan {0} cartas', 'Il manque {0} cartes à ton deck', 'Al tuo mazzo mancano {0} carte', 'デッキにあと{0}枚必要です', '덱에 카드가 {0}장 더 필요합니다', 'Seu deck precisa de mais {0} cartas', '你的卡组还需要{0}张卡'),
 'Your deck needs 1 more card': ('Deinem Deck fehlt noch 1 Karte', 'A tu baraja le falta 1 carta', 'Il manque 1 carte à ton deck', 'Al tuo mazzo manca 1 carta', 'デッキにあと1枚必要です', '덱에 카드가 1장 더 필요합니다', 'Seu deck precisa de mais 1 carta', '你的卡组还需要1张卡'),
 'These are the strongest cards in your collection that fit. You can still swap any of them afterwards.': (
  'Das sind die stärksten passenden Karten deiner Sammlung. Du kannst jede davon später noch austauschen.',
  'Son las cartas más fuertes de tu colección que encajan. Después puedes cambiar cualquiera.',
  'Voici les cartes les plus fortes de ta collection qui conviennent. Tu peux toujours en changer ensuite.',
  'Sono le carte più forti della tua collezione che ci stanno. Puoi sempre cambiarle dopo.',
  'コレクションの中で入れられる最も強いカードです。あとから自由に入れ替えられます。',
  '컬렉션에서 넣을 수 있는 가장 강한 카드입니다. 나중에 얼마든지 바꿀 수 있습니다.',
  'Estas são as cartas mais fortes da sua coleção que cabem. Você ainda pode trocar qualquer uma depois.',
  '这些是你收藏中可加入的最强卡片。之后仍可随意替换。'),
 'Keep building': ('Weiterbauen', 'Seguir construyendo', 'Continuer', 'Continua a costruire', '自分で組む', '직접 구성', 'Continuar montando', '继续组卡'),
 'Add these {0}': ('Diese {0} hinzufügen', 'Añadir estas {0}', 'Ajouter ces {0}', 'Aggiungi queste {0}', 'この{0}枚を追加', '이 {0}장 추가', 'Adicionar estas {0}', '加入这{0}张'),
 'Add this card': ('Diese Karte hinzufügen', 'Añadir esta carta', 'Ajouter cette carte', 'Aggiungi questa carta', 'このカードを追加', '이 카드 추가', 'Adicionar esta carta', '加入这张卡'),
 'No other card in your collection fits this deck.': (
  'Keine weitere Karte deiner Sammlung passt in dieses Deck.',
  'Ninguna otra carta de tu colección cabe en esta baraja.',
  'Aucune autre carte de ta collection ne peut aller dans ce deck.',
  'Nessun\'altra carta della tua collezione può entrare in questo mazzo.',
  'このデッキに入れられるカードがコレクションにありません。',
  '이 덱에 넣을 수 있는 다른 카드가 컬렉션에 없습니다.',
  'Nenhuma outra carta da sua coleção cabe neste deck.',
  '你的收藏中没有其他卡可以加入这副卡组。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
