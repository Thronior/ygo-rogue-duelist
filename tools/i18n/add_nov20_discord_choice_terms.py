"""Discord decisions of 2026-11-20 (user, in the Discord-input session), in all 8 languages. Never overwrites an
existing translation.
Undying Legion keeps Restless Dead's Standby Phase revive, with no empty-field condition and in Attack Position (Uby).
Tag trade requests: the Teammate’s cards tab and Requested labels (Nemu).
The ? (Randomized only) icon in the card search window."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Zombie monsters you control gain 1,200 ATK. Once per turn, at the start of your Standby Phase, if you have a free Monster Zone, Special Summon 1 random Zombie monster from your GY in Attack Position. Once per turn, if a Zombie monster you control is destroyed by battle, Special Summon it from your GY at the end of the Battle Phase. All LP you gain are halved.': (
  'Alle Zombie-Monster, die du kontrollierst, erhalten 1200 ATK. Einmal pro Spielzug, zu Beginn deiner Standby Phase, falls du eine freie Monsterzone hast: Beschwöre 1 zufälliges Zombie-Monster von deinem Friedhof als Spezialbeschwörung in die Angriffsposition. Einmal pro Spielzug, falls ein Zombie-Monster, das du kontrollierst, durch Kampf zerstört wird: Beschwöre es am Ende der Battle Phase als Spezialbeschwörung von deinem Friedhof. Alle LP, die du erhältst, werden halbiert.',
  'Los monstruos Zombi que controles ganan 1200 ATK. Una vez por turno, al principio de tu Standby Phase, si tienes una Zona de Monstruos libre, Invoca de Modo Especial, desde tu Cementerio y en Posición de Ataque, 1 monstruo Zombi aleatorio. Una vez por turno, si un monstruo Zombi que controlas es destruido en batalla, Invócalo de Modo Especial desde tu Cementerio al final de la Battle Phase. Todos los LP que ganas se reducen a la mitad.',
  "Les monstres Zombie que vous contrôlez gagnent 1200 ATK. Une fois par tour, au début de votre Standby Phase, si vous avez une Zone Monstre libre, Invoquez Spécialement 1 monstre Zombie aléatoire depuis votre Cimetière en Position d'Attaque. Une fois par tour, si un monstre Zombie que vous contrôlez est détruit au combat, Invoquez-le Spécialement depuis votre Cimetière à la fin de la Battle Phase. Tous les LP que vous gagnez sont divisés par deux.",
  "I mostri Zombie che controlli guadagnano 1200 ATK. Una volta per turno, all'inizio della tua Standby Phase, se hai una Zona Mostri libera, Evoca Specialmente 1 mostro Zombie casuale dal tuo Cimitero in Posizione di Attacco. Una volta per turno, se un mostro Zombie che controlli viene distrutto in battaglia, Evocalo Specialmente dal tuo Cimitero alla fine della Battle Phase. Tutti i LP che guadagni sono dimezzati.",
  '自分フィールドのアンデット族モンスターの攻撃力は1,200アップする。1ターンに1度、自分スタンバイフェイズ開始時に、自分のモンスターゾーンに空きがある場合、自分の墓地のアンデット族モンスター1体をランダムに選び、攻撃表示で特殊召喚する。1ターンに1度、自分フィールドのアンデット族モンスターが戦闘で破壊された場合、バトルフェイズ終了時にそのモンスターを墓地から特殊召喚する。自分が回復するLPはすべて半分になる。',
  '자신 필드의 언데드족 몬스터의 공격력은 1,200 올린다. 1턴에 1번, 자신 스탠바이 페이즈 개시시에, 자신의 몬스터 존에 빈 곳이 있을 경우, 자신 묘지에서 무작위 언데드족 몬스터 1장을 공격 표시로 특수 소환한다. 1턴에 1번, 자신 필드의 언데드족 몬스터가 전투로 파괴되었을 경우, 배틀 페이즈 종료시에 그 몬스터를 자신 묘지에서 특수 소환한다. 자신이 회복하는 LP는 모두 절반이 된다.',
  'Os monstros Zumbi que você controla ganham 1200 de ATK. Uma vez por turno, no começo da sua Fase de Apoio, se você tiver uma Zona de Monstros livre: Invoque por Invocação-Especial 1 monstro Zumbi aleatório do seu Cemitério em Posição de Ataque. Uma vez por turno, se um monstro Zumbi que você controla for destruído em batalha, Invoque-o por Invocação-Especial do seu Cemitério no final da Fase de Batalha. Todos os PV que você ganhar são reduzidos à metade.',
  '①：自己场上的不死族怪兽的攻击力上升1,200。②：1回合1次，自己准备阶段开始时，自己的怪兽区域有空位的场合，从自己墓地随机把1只不死族怪兽攻击表示特殊召唤。③：1回合1次，自己场上的不死族怪兽被战斗破坏的场合，在战斗阶段结束时把那只怪兽从自己墓地特殊召唤。④：自己回复的基本分全部减半。'),
 # Tag trade requests (Nemu on Discord, user 2026-11-20).
 'Teammate’s cards': ('Karten des Teamkameraden', 'Cartas del compañero', 'Cartes du coéquipier', 'Carte del compagno di squadra', 'チームメイトのカード', '팀원의 카드', 'Cards do parceiro', '队友的卡片'),
 'In their deck': ('In seinem Deck', 'En su deck', 'Dans son deck', 'Nel suo Deck', '相手のデッキ内', '팀원 덱에 있음', 'No deck dele', '在对方卡组中'),
 'Requested': ('Angefragt', 'Pedida', 'Demandée', 'Richiesta', 'リクエスト済み', '요청됨', 'Pedido', '已请求'),
 'cards requested': ('Karten angefragt', 'cartas pedidas', 'cartes demandées', 'carte richieste', '枚をリクエスト中', '장 요청함', 'cards pedidos', '张卡已请求'),
 'Tap to request · Hold to inspect': ('Tippe zum Anfragen · Halten zum Ansehen', 'Toca para pedir · Mantén pulsado para inspeccionar', 'Touchez pour demander · Maintenez pour examiner', 'Tocca per richiedere · Tieni premuto per esaminare', 'タップでリクエスト · 長押しで詳細', '탭하여 요청 · 길게 눌러 자세히 보기', 'Toque para pedir · Segure para inspecionar', '点按请求 · 长按查看'),
 'Your teammate has already sent their cards.': ('Dein Teamkamerad hat seine Karten bereits gesendet.', 'Tu compañero ya ha enviado sus cartas.', 'Votre coéquipier a déjà envoyé ses cartes.', 'Il tuo compagno di squadra ha già inviato le sue carte.', 'チームメイトはすでにカードを送信しました。', '팀원이 이미 카드를 보냈습니다.', 'Seu parceiro já enviou os cards dele.', '你的队友已经发送了卡片。'),
 "Choose valid, distinct copies from your teammate's collection.": ('Wähle gültige, unterschiedliche Exemplare aus der Sammlung deines Teamkameraden.', 'Elige copias válidas y distintas de la colección de tu compañero.', 'Choisissez des exemplaires valides et distincts dans la collection de votre coéquipier.', 'Scegli copie valide e distinte dalla collezione del tuo compagno di squadra.', 'チームメイトのコレクションから有効で異なるカードを選んでください。', '팀원의 컬렉션에서 올바르고 서로 다른 카드를 고르세요.', 'Escolha cópias válidas e distintas da coleção do seu parceiro.', '请从队友的收藏中选择有效且不重复的副本。'),
 # ? icon in the card search window (user, 2026-11-20): its title; it replaced the Deck status option of the same name.
 'Randomized only': ('Nur zufällig erzeugte Karten', 'Solo cartas aleatorizadas', 'Cartes aléatoires uniquement', 'Solo carte generate a caso', 'ランダム生成カードのみ', '무작위로 생성된 카드만', 'Só cartas aleatorizadas', '仅随机生成卡'),
}
CTX = {
 'Zombie monsters you control gain 1,200 ATK. Once per turn, at the start of your Standby Phase, if you have a free Monster Zone, Special Summon 1 random Zombie monster from your GY in Attack Position. Once per turn, if a Zombie monster you control is destroyed by battle, Special Summon it from your GY at the end of the Battle Phase. All LP you gain are halved.': ('relic', 'relic effect (undying_legion)'),
 'Teammate’s cards': ('ui', 'tag-ui.js'), 'In their deck': ('ui', 'tag-ui.js'), 'Requested': ('ui', 'tag-ui.js'), 'cards requested': ('ui', 'tag-ui.js'),
 'Tap to request · Hold to inspect': ('ui', 'tag-ui.js'), 'Your teammate has already sent their cards.': ('python', 'tag_campaign.py, tag-ui.js'),
 "Choose valid, distinct copies from your teammate's collection.": ('python', 'tag_campaign.py'),
 'Randomized only': ('ui', 'card-search.js'),
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
        group, ctx = CTX[en]
        if en not in known: catalog.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
