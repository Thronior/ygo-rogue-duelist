"""Related Cards tab in the card details window (Discord, 2026-11-14): its strings in all 8 languages.
Existing translations are never overwritten."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Related Cards': ['Verwandte Karten', 'Cartas relacionadas', 'Cartes liées', 'Carte correlate', '関連カード', '관련 카드', 'Cards relacionados', '相关卡片'],
 'Mentions this card': ['Nennen diese Karte', 'Mencionan esta carta', 'Mentionnent cette carte', 'Citano questa carta', 'このカードを記述', '이 카드를 언급', 'Mencionam este card', '提及此卡'],
 'Mentioned by this card': ['Von dieser Karte genannt', 'Mencionadas por esta carta', 'Mentionnées par cette carte', 'Citate da questa carta', 'このカードが記述', '이 카드가 언급', 'Mencionados por este card', '此卡提及'],
 'No other card names this card, and its text names no other card.': [
  'Keine andere Karte nennt diese Karte, und ihr Text nennt keine andere Karte.',
  'Ninguna otra carta menciona esta carta y su texto no menciona ninguna otra.',
  'Aucune autre carte ne mentionne cette carte, et son texte ne mentionne aucune autre carte.',
  'Nessun’altra carta cita questa carta e il suo testo non cita altre carte.',
  'このカードを記述するカードはなく、このカードのテキストも他のカードを記述していません。',
  '이 카드를 언급하는 카드가 없고, 이 카드의 텍스트도 다른 카드를 언급하지 않습니다.',
  'Nenhum outro card menciona este card, e o texto dele não menciona outro card.',
  '没有其他卡片提及此卡，此卡的效果文本也未提及其他卡片。'],
 'Not owned': ['Nicht im Besitz', 'No la tienes', 'Non possédée', 'Non posseduta', '未所持', '미보유', 'Não possui', '未拥有'],
 'Add to deck': ['Zum Deck hinzufügen', 'Añadir al deck', 'Ajouter au deck', 'Aggiungi al Deck', 'デッキに入れる', '덱에 추가', 'Adicionar ao deck', '加入卡组'],
 'Remove from deck': ['Aus dem Deck nehmen', 'Quitar del deck', 'Retirer du deck', 'Togli dal Deck', 'デッキから外す', '덱에서 제거', 'Remover do deck', '移出卡组'],
}
PATTERNS = {
 '{0} owned': ['{0} im Besitz', '{0} en posesión', '{0} possédée(s)', '{0} posseduta/e', '所持 {0}', '보유 {0}', '{0} possuído(s)', '拥有 {0}'],
 '{0} in deck': ['{0} im Deck', '{0} en el deck', '{0} dans le deck', '{0} nel Deck', 'デッキ内 {0}', '덱에 {0}', '{0} no deck', '卡组中 {0}'],
 'Add {0} to deck': ['{0} zum Deck hinzufügen', 'Añadir {0} al deck', 'Ajouter {0} au deck', 'Aggiungi {0} al Deck', '{0}をデッキに入れる', '{0}을(를) 덱에 추가', 'Adicionar {0} ao deck', '将{0}加入卡组'],
 'Remove {0} from deck': ['{0} aus dem Deck nehmen', 'Quitar {0} del deck', 'Retirer {0} du deck', 'Togli {0} dal Deck', '{0}をデッキから外す', '{0}을(를) 덱에서 제거', 'Remover {0} do deck', '将{0}移出卡组'],
}

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    rows = {**TERMS, **PATTERNS}
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for key, text in rows.items():
            if key not in table: table[key] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    new = [{'group': 'ui', 'en': k, 'kind': 'pattern' if k in PATTERNS else 'exact', 'ctx': 'related-cards.js'} for k in rows if k not in known]
    if new: dump(path, catalog + new)

if __name__ == '__main__':
    main()
