"""Tag loop rule (user, 2026-11-13): looping needs the final 1v1 to be played; skipping ends the run. 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Play it to unlock the next loop.': {
  'de': 'Spielt es, um den nächsten Zyklus freizuschalten.', 'es': 'Jugadlo para desbloquear la siguiente vuelta.',
  'fr': 'Jouez-le pour débloquer la boucle suivante.', 'it': 'Giocatelo per sbloccare il ciclo successivo.',
  'ja': 'プレイすると次のループが解放されます。', 'ko': '플레이하면 다음 루프가 열립니다.',
  'pt': 'Joguem para desbloquear o próximo ciclo.', 'zh': '进行这场对决即可解锁下一轮。'},
 'Skip — end the run': {'de': 'Überspringen – Durchlauf beenden', 'es': 'Saltar: terminar la partida', 'fr': 'Passer — terminer la partie',
  'it': 'Salta — termina la partita', 'ja': 'スキップ — ランを終了', 'ko': '건너뛰기 — 런 종료', 'pt': 'Pular — encerrar a partida', 'zh': '跳过 — 结束本局'},
 'The final 1v1 was skipped, so the run ends here.': {
  'de': 'Das letzte 1-gegen-1 wurde übersprungen, deshalb endet der Durchlauf hier.',
  'es': 'Os saltasteis el 1 contra 1 final, así que la partida termina aquí.',
  'fr': 'Le 1 contre 1 final a été passé, la partie se termine donc ici.',
  'it': "L'1 contro 1 finale è stato saltato, quindi la partita finisce qui.",
  'ja': '最後の1対1をスキップしたため、ランはここで終了します。',
  'ko': '마지막 1대1을 건너뛰어 런이 여기서 끝납니다.',
  'pt': 'O 1x1 final foi pulado, então a partida termina aqui.',
  'zh': '已跳过最后的 1v1，本局到此结束。'},
 'Play the final 1v1 to unlock the next loop.': {
  'de': 'Spielt das letzte 1-gegen-1, um den nächsten Zyklus freizuschalten.', 'es': 'Jugad el 1 contra 1 final para desbloquear la siguiente vuelta.',
  'fr': 'Jouez le 1 contre 1 final pour débloquer la boucle suivante.', 'it': "Giocate l'1 contro 1 finale per sbloccare il ciclo successivo.",
  'ja': '次のループを解放するには最後の1対1をプレイしてください。', 'ko': '다음 루프를 열려면 마지막 1대1을 플레이하세요.',
  'pt': 'Joguem o 1x1 final para desbloquear o próximo ciclo.', 'zh': '进行最后的 1v1 即可解锁下一轮。'},
}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for old in ('Play it to unlock the next loop: keep your decks, relics and coins and face nine new duels together. Skipping ends the run here.', 'Play it to unlock the next loop. Win or lose, you keep the LP, decks, relics and coins you have now and face nine new duels together. Skipping ends the run here.'):table.pop(old, None)
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    catalog = [r for r in catalog if not r.get('en', '').startswith('Play it to unlock the next loop') or r.get('en') == 'Play it to unlock the next loop.']
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'tag-ui.js loop rule'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
