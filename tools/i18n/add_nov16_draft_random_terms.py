"""Random Pack in Draft Duels and the Ultimate Collector ban on randomized cards (2026-11-16), all 8 languages.
Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Randomized cards are banned in Ultimate Collector: they stay behind.': ('ui', (
  'Zufällig erzeugte Karten sind in Ultimate Collector verboten: Sie bleiben zurück.',
  'Las cartas aleatorias están prohibidas en Ultimate Collector: se quedan atrás.',
  'Les cartes aléatoires sont interdites dans Ultimate Collector : elles restent en arrière.',
  'Le carte casuali sono vietate in Ultimate Collector: restano indietro.',
  'ランダムカードはUltimate Collectorでは禁止です：持ち込めません。',
  '무작위로 생성된 카드는 Ultimate Collector에서 금지됩니다: 가져갈 수 없습니다.',
  'Cartas aleatórias são proibidas no Ultimate Collector: elas ficam para trás.',
  '随机生成卡在 Ultimate Collector 中被禁止：它们不会被带入。')),
 'Randomizer saves cannot enter Ultimate Collector.': ('python', (
  'Randomizer-Spielstände können Ultimate Collector nicht betreten.',
  'Las partidas de Randomizer no pueden entrar en Ultimate Collector.',
  "Les sauvegardes Randomizer ne peuvent pas entrer dans Ultimate Collector.",
  'I salvataggi Randomizer non possono entrare in Ultimate Collector.',
  'RandomizerのセーブはUltimate Collectorに参加できません。',
  'Randomizer 저장 데이터는 Ultimate Collector에 들어갈 수 없습니다.',
  'Salvamentos do Randomizer não podem entrar no Ultimate Collector.',
  'Randomizer 存档无法进入 Ultimate Collector。')),
 'This room offers Random Packs. Update or refresh the game to join it.': ('ui', (
  'Dieser Raum bietet Zufallsbooster an. Aktualisiere das Spiel oder lade es neu, um beizutreten.',
  'Esta sala ofrece Sobres aleatorios. Actualiza o recarga el juego para unirte.',
  'Ce salon propose des Boosters aléatoires. Mettez à jour ou actualisez le jeu pour le rejoindre.',
  'Questa stanza offre Buste casuali. Aggiorna o ricarica il gioco per entrare.',
  'このルームにはランダムパックがあります。参加するにはゲームを更新するか再読み込みしてください。',
  '이 방에는 무작위 팩이 나옵니다. 참가하려면 게임을 업데이트하거나 새로고침하세요.',
  'Esta sala oferece Pacotes aleatórios. Atualize ou recarregue o jogo para entrar.',
  '此房间会提供随机补充包。请更新或刷新游戏后加入。')),
 'Unknown randomized card:': ('ui', (
  'Unbekannte zufällig erzeugte Karte:', 'Carta aleatoria desconocida:', 'Carte aléatoire inconnue :', 'Carta casuale sconosciuta:',
  '不明なランダムカード：', '알 수 없는 무작위 카드:', 'Carta aleatória desconhecida:', '未知的随机生成卡：')),
}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, (_, local) in TERMS.items(): table.setdefault(en, local[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en, (group, _) in TERMS.items():
        if en not in known:
            catalog.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': 'Draft Random Pack / Collector ban 2026-11-16'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__': main()
