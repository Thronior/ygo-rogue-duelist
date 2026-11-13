"""Tag loop offer after the final duel (user, 2026-11-12): texts in all 8 languages, never overwriting a translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Start loop {0}?': ('Zyklus {0} starten?', '¿Empezar la vuelta {0}?', 'Lancer la boucle {0} ?', 'Iniziare il ciclo {0}?', '{0}周目を始めますか？', '루프 {0}을(를) 시작할까요?', 'Começar o ciclo {0}?', '开始第{0}周目？'),
 'Keep your decks, relics and coins and face nine new duels. Both players must agree.': (
  'Behaltet eure Decks, Relikte und Münzen und stellt euch neun neuen Duellen. Beide Spieler müssen zustimmen.',
  'Conservad vuestras barajas, reliquias y monedas y enfrentaos a nueve duelos nuevos. Ambos jugadores deben estar de acuerdo.',
  'Gardez vos decks, reliques et pièces et affrontez neuf nouveaux duels. Les deux joueurs doivent être d’accord.',
  'Tenete mazzi, reliquie e monete e affrontate nove nuovi duelli. Entrambi i giocatori devono essere d’accordo.',
  'デッキ・レリック・コインを引き継いで、新たな9回のデュエルに挑みます。両方のプレイヤーの同意が必要です。',
  '덱, 유물, 코인을 그대로 유지하고 새로운 듀얼 9번에 도전합니다. 두 플레이어 모두 동의해야 합니다.',
  'Mantenham seus decks, relíquias e moedas e enfrentem nove novos duelos. Os dois jogadores precisam concordar.',
  '保留卡组、遗物和金币，迎接九场新的决斗。双方玩家都必须同意。'),
 'You are ready. Waiting for your partner…': ('Du bist bereit. Warte auf deinen Partner …', 'Estás listo. Esperando a tu compañero…', 'Vous êtes prêt. En attente de votre partenaire…', 'Sei pronto. In attesa del tuo compagno…', '準備完了。パートナーを待っています…', '준비 완료. 파트너를 기다리는 중…', 'Você está pronto. Aguardando seu parceiro…', '你已准备就绪。正在等待搭档…'),
 'Your partner wants to keep going!': ('Dein Partner will weitermachen!', '¡Tu compañero quiere seguir!', 'Votre partenaire veut continuer !', 'Il tuo compagno vuole continuare!', 'パートナーは続けたがっています！', '파트너가 계속하고 싶어 합니다!', 'Seu parceiro quer continuar!', '你的搭档想继续！'),
 'Or exit to end the run here.': ('Oder beende den Run hier mit „Verlassen“.', 'O sal para terminar la partida aquí.', 'Ou quittez pour terminer la partie ici.', 'Oppure esci per terminare la partita qui.', '終了する場合は「退出」を選んでください。', '여기서 런을 끝내려면 나가기를 누르세요.', 'Ou saia para encerrar a partida aqui.', '或者退出，在此结束本局。'),
 'Start next loop': ('Nächsten Zyklus starten', 'Empezar la siguiente vuelta', 'Lancer la boucle suivante', 'Inizia il ciclo successivo', '次の周回を始める', '다음 루프 시작', 'Começar o próximo ciclo', '开始下一周目'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'tag-ui.js loop offer (2026-11-12)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__':
    main()
