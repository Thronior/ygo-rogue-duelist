"""Previous / Next in the card window and the full-size card art (2026-11-14): the buttons' screen-reader labels, the
navigation bar's label and the art view's labels. "Previous" and "Next" are already translated. All 8 languages.
Existing translations are never overwritten."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Card navigation': ['Kartennavigation', 'Navegación de cartas', 'Navigation entre les cartes', 'Navigazione tra le carte', 'カードの切り替え', '카드 탐색', 'Navegação de cartas', '卡片切换'],
 'Previous card': ['Vorherige Karte', 'Carta anterior', 'Carte précédente', 'Carta precedente', '前のカード', '이전 카드', 'Carta anterior', '上一张卡'],
 'Next card': ['Nächste Karte', 'Carta siguiente', 'Carte suivante', 'Carta successiva', '次のカード', '다음 카드', 'Próxima carta', '下一张卡'],
 'Show full-size art': ['Bild in voller Größe zeigen', 'Ver la imagen a tamaño completo', 'Afficher l’illustration en grand', 'Mostra l’immagine a schermo intero', 'イラストを拡大表示', '일러스트 크게 보기', 'Ver a arte em tamanho grande', '查看大图'],
 'Full-size card art': ['Kartenbild in voller Größe', 'Imagen de la carta a tamaño completo', 'Illustration de la carte en grand', 'Immagine della carta a schermo intero', 'カードのイラスト（拡大）', '카드 일러스트 (크게 보기)', 'Arte da carta em tamanho grande', '卡片大图'],
}

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for key, text in TERMS.items():
            if key not in table: table[key] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    new = [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'card-nav.js'} for k in TERMS if k not in known]
    if new: dump(path, catalog + new)

if __name__ == '__main__':
    main()
