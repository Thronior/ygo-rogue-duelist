"""Settings › Gameplay switch for the greyed-out Activate and its reason (user, 2026-11-14). 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Explain Unavailable Actions': {'de': 'Nicht verfügbare Aktionen erklären', 'es': 'Explicar acciones no disponibles', 'fr': 'Expliquer les actions indisponibles',
  'it': 'Spiega le azioni non disponibili', 'ja': '使えない操作を説明', 'ko': '사용할 수 없는 행동 설명', 'pt': 'Explicar ações indisponíveis', 'zh': '说明无法执行的操作'},
 'Show a greyed-out Activate on cards you can’t activate right now; tap it to see why.': {
  'de': 'Zeigt ein ausgegrautes „Aktivieren“ bei Karten, die du gerade nicht aktivieren kannst. Tippe darauf, um den Grund zu sehen.',
  'es': 'Muestra un «Activar» atenuado en las cartas que no puedes activar ahora; tócalo para ver por qué.',
  'fr': 'Affiche un « Activer » grisé sur les cartes que vous ne pouvez pas activer pour l’instant ; touchez-le pour savoir pourquoi.',
  'it': 'Mostra un «Attiva» in grigio sulle carte che non puoi attivare ora; toccalo per vedere il motivo.',
  'ja': '今は発動できないカードに灰色の「発動」を表示します。タップすると理由が分かります。',
  'ko': '지금 발동할 수 없는 카드에 회색 "발동"을 표시합니다. 누르면 이유를 볼 수 있습니다.',
  'pt': 'Mostra um “Ativar” acinzentado nos cards que você não pode ativar agora; toque nele para ver o motivo.',
  'zh': '对当前无法发动的卡显示灰色的“发动”，点击即可查看原因。'},
}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'mobile.js'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
