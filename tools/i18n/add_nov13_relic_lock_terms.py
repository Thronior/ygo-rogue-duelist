"""Shop relic lock button (user, 2026-11-13): labels and tooltips in all 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Lock relic': {'de': 'Relikt sperren', 'es': 'Bloquear reliquia', 'fr': 'Verrouiller la relique', 'it': 'Blocca reliquia',
                'ja': 'レリックをロック', 'ko': '유물 잠금', 'pt': 'Travar relíquia', 'zh': '锁定遗物'},
 'Unlock relic': {'de': 'Relikt entsperren', 'es': 'Desbloquear reliquia', 'fr': 'Déverrouiller la relique', 'it': 'Sblocca reliquia',
                  'ja': 'レリックのロックを解除', 'ko': '유물 잠금 해제', 'pt': 'Destravar relíquia', 'zh': '解锁遗物'},
 'Lock: keep this relic after rerolls and in the next shop': {
  'de': 'Sperren: Dieses Relikt bleibt nach dem Aktualisieren und im nächsten Shop.',
  'es': 'Bloquear: esta reliquia se queda tras renovar la tienda y en la siguiente tienda.',
  'fr': 'Verrouiller : cette relique reste après une relance et dans la boutique suivante.',
  'it': 'Blocca: questa reliquia resta se cambi il negozio e nel negozio successivo.',
  'ja': 'ロック：リロール後も次のショップでもこのレリックが残る',
  'ko': '잠금: 새로고침 후와 다음 상점에서도 이 유물이 남습니다',
  'pt': 'Travar: esta relíquia fica após atualizar a loja e na próxima loja.',
  'zh': '锁定：刷新后和下一个商店中都会保留此遗物'},
 'Locked: stays after rerolls and in the next shop': {
  'de': 'Gesperrt: bleibt nach dem Aktualisieren und im nächsten Shop.',
  'es': 'Bloqueada: se queda tras renovar la tienda y en la siguiente tienda.',
  'fr': 'Verrouillée : reste après une relance et dans la boutique suivante.',
  'it': 'Bloccata: resta se cambi il negozio e nel negozio successivo.',
  'ja': 'ロック中：リロール後も次のショップでも残る',
  'ko': '잠김: 새로고침 후와 다음 상점에서도 남습니다',
  'pt': 'Travada: fica após atualizar a loja e na próxima loja.',
  'zh': '已锁定：刷新后和下一个商店中都会保留'},
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
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'mobile.js relic lock'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')

if __name__ == '__main__':
    main()
