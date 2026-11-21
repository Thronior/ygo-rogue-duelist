"""Discord fixes of 2026-11-21, in all 8 languages. Never overwrites an existing translation.
Relic prompts name their relic (Deds, #feedback): the small line over a relic's prompt (mobile.js relicTag).
Dimension Jar is the original print (masterkast39, #feedback, 2026-11-20): data/pre-errata.json keeps the English
"monsters" text, and its FLIP now banishes monsters only. German and French official texts already say monsters; the
other official texts say "cards" (the later errata), so the pre-errata text gets the monster wording everywhere."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 # Over a relic's prompt, before its name. Shadow relics keep their own name in player text (2026-11-19 rename).
 'Relic effect': ('Relikteffekt', 'Efecto de reliquia', 'Effet de relique', 'Effetto reliquia', 'レリックの効果', '유물 효과', 'Efeito de relíquia', '遗物效果'),
 'Shadow relic effect': ('Schattenrelikt-Effekt', 'Efecto de reliquia de las sombras', "Effet de relique de l'ombre", "Effetto reliquia dell'ombra", '影のレリックの効果', '그림자 유물 효과', 'Efeito de relíquia das sombras', '暗影遗物效果'),
 # Dimension Jar (73414375), pre-errata card text.
 "FLIP: Both players can remove from play up to 3 monsters from their opponent's Graveyard.": (
  'FLIPP: Beide Spieler können jeweils bis zu 3 Monster aus dem Friedhof ihrer Gegner aus dem Spiel entfernen.',
  'VOLTEO: Ambos jugadores pueden retirar del juego hasta 3 monstruos del Cementerio de su adversario.',
  "FLIP: Chaque joueur peut retirer du jeu jusqu'à 3 monstres du Cimetière de son adversaire.",
  'SCOPRI: Entrambi i giocatori possono rimuovere dal gioco fino a 3 mostri dal Cimitero del loro avversario.',
  '①：このカードがリバースした場合に発動する。\nお互いはそれぞれ相手の墓地からモンスターを３体まで除外できる。',
  '리버스: 양쪽 플레이어는 상대의 묘지의 몬스터를 3장까지 게임에서 제외할 수 있다.',
  'VIRE: Ambos os jogadores podem remover de jogo até 3 monstros do Cemitério do seu adversário.',
  '反转：双方均可以从对方墓地中选至多3只怪兽从游戏中除外。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
