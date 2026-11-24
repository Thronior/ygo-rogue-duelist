"""Plant support (user, 2026-11-24, Discord thread "Plant support"): the Photosynthesis, Spring Growth and Pollinator relics,
the fused Eternal Garden and its Dandelion Token. Name and text in all 8 languages, plus the catalog rows. The Moth Token
keeps its names from tools/i18n/add_nov23_moth_lv_terms.py. The ten real Plant cards take their official texts from
tools/add_nov24_plant_cards.py. Never overwrites an existing translation."""
import json, re, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TOKEN = {t['id']: t for t in json.loads((ROOT / 'data/custom-tokens.json').read_text(encoding='utf8'))}[190000058]

PHOTO, PHOTO_TEXT = 'Photosynthesis', 'Once per turn, during your Standby Phase: Gain 300 LP for each face-up Plant monster you control.'
GROWTH, GROWTH_TEXT = 'Spring Growth', 'Once per turn, during your Standby Phase: Each face-up Plant monster you control gains 200 ATK.'
POLLEN = 'Pollinator'
POLLEN_TEXT = ('Once per turn, during your End Phase, if you control a face-up Plant monster: Special Summon 1 "Moth Token" '
               '(Insect/EARTH/Level 1/ATK 300/DEF 300) in Defense Position.')
LOADOUT = 'Overgrown Garden'  # Weevil Underwood's Plant loadout, replacing Insect Evolution
GARDEN = 'Eternal Garden'
GARDEN_TEXT = ('Plant monsters you control gain 800 ATK. Each time a face-up Plant monster you control is destroyed: Gain LP equal to '
               'the ATK it had on the field, then Special Summon 1 "Dandelion Token" (Plant/EARTH/Level 3/ATK 1000/DEF 1000).')
TERMS = {
 PHOTO: ('Photosynthese', 'Fotosíntesis', 'Photosynthèse', 'Fotosintesi', '光合成', '광합성', 'Fotossíntese', '光合作用'),
 PHOTO_TEXT: (
  'Einmal pro Spielzug, während deiner Standby Phase: Erhalte 300 LP für jedes offene Pflanze-Monster, das du kontrollierst.',
  'Una vez por turno, durante tu Standby Phase: Ganas 300 LP por cada monstruo Planta boca arriba que controles.',
  'Une fois par tour, durant votre Standby Phase : Gagnez 300 LP pour chaque monstre Plante face recto que vous contrôlez.',
  'Una volta per turno, durante la tua Standby Phase: Guadagni 300 LP per ogni mostro Pianta scoperto che controlli.',
  '1ターンに1度、自分スタンバイフェイズに発動する。自分フィールドの表側表示の植物族モンスターの数×300LP回復する。',
  '1턴에 1번, 자신 스탠바이 페이즈에 발동한다. 자신 필드의 앞면 표시 식물족 몬스터의 수 × 300 LP를 회복한다.',
  'Uma vez por turno, durante sua Fase de Apoio: Ganhe 300 LP para cada monstro Planta com a face para cima que você controla.',
  '1回合1次，自己准备阶段发动。自己回复自己场上的表侧表示植物族怪兽数量×300基本分。'),
 GROWTH: ('Frühlingswachstum', 'Crecimiento Primaveral', 'Croissance Printanière', 'Crescita Primaverile', '春の芽吹き', '봄의 성장', 'Crescimento Primaveril', '春季生长'),
 GROWTH_TEXT: (
  'Einmal pro Spielzug, während deiner Standby Phase: Jedes offene Pflanze-Monster, das du kontrollierst, erhält 200 ATK.',
  'Una vez por turno, durante tu Standby Phase: Cada monstruo Planta boca arriba que controles gana 200 ATK.',
  'Une fois par tour, durant votre Standby Phase : Chaque monstre Plante face recto que vous contrôlez gagne 200 ATK.',
  'Una volta per turno, durante la tua Standby Phase: Ogni mostro Pianta scoperto che controlli guadagna 200 ATK.',
  '1ターンに1度、自分スタンバイフェイズに発動する。自分フィールドの表側表示の植物族モンスターの攻撃力は200アップする。',
  '1턴에 1번, 자신 스탠바이 페이즈에 발동한다. 자신 필드의 앞면 표시 식물족 몬스터의 공격력은 200 올린다.',
  'Uma vez por turno, durante sua Fase de Apoio: Cada monstro Planta com a face para cima que você controla ganha 200 de ATK.',
  '1回合1次，自己准备阶段发动。自己场上的表侧表示的植物族怪兽的攻击力上升200。'),
 POLLEN: ('Bestäuber', 'Polinizador', 'Pollinisateur', 'Impollinatore', 'ポリネーター', '폴리네이터', 'Polinizador', '传粉者'),
 POLLEN_TEXT: (
  'Einmal pro Spielzug, während deiner End Phase, falls du ein offenes Pflanze-Monster kontrollierst: Beschwöre 1 „Motten-Spielmarke“ (Insekt/ERDE/Stufe 1/ATK 300/DEF 300) in Verteidigungsposition als Spezialbeschwörung.',
  'Una vez por turno, durante tu End Phase, si controlas un monstruo Planta boca arriba: Invoca de Modo Especial 1 "Ficha Moth" (Insecto/TIERRA/Nivel 1/ATK 300/DEF 300) en Posición de Defensa.',
  'Une fois par tour, durant votre End Phase, si vous contrôlez un monstre Plante face recto : Invoquez Spécialement 1 "Jeton Papillon" (Insecte/TERRE/Niveau 1/ATK 300/DEF 300) en Position de Défense.',
  'Una volta per turno, durante la tua End Phase, se controlli un mostro Pianta scoperto: Evoca Specialmente 1 "Segna-Falena" (Insetto/TERRA/Livello 1/ATK 300/DEF 300) in Posizione di Difesa.',
  '1ターンに1度、自分エンドフェイズに、自分フィールドに表側表示の植物族モンスターが存在する場合、「モストークン」（昆虫族・地・星１・攻／守３００）１体を守備表示で特殊召喚する。',
  '1턴에 1번, 자신 엔드 페이즈에, 자신 필드에 앞면 표시 식물족 몬스터가 존재할 경우, "모스 토큰"(곤충족 / 땅 / 레벨 1 / 공 300 / 수 300) 1장을 수비 표시로 특수 소환한다.',
  'Uma vez por turno, durante sua Fase Final, se você controlar um monstro Planta com a face para cima: Invoque por Invocação-Especial 1 "Ficha de Moth" (Inseto/TERRA/Nível 1/ATK 300/DEF 300) em Posição de Defesa.',
  '1回合1次，自己结束阶段，自己场上有表侧表示的植物族怪兽存在的场合，把1只「飞蛾衍生物」（昆虫族·地·1星·攻/守300）守备表示特殊召唤。'),
 GARDEN: ('Ewiger Garten', 'Jardín Eterno', 'Jardin Éternel', 'Giardino Eterno', 'エターナル・ガーデン', '이터널 가든', 'Jardim Eterno', '永恒花园'),
 GARDEN_TEXT: (
  'Alle Pflanze-Monster, die du kontrollierst, erhalten 800 ATK. Jedes Mal, wenn ein offenes Pflanze-Monster, das du kontrollierst, zerstört wird: Erhalte LP in Höhe der ATK, die es auf dem Spielfeld hatte, und beschwöre danach 1 „Löwenzahn-Spielmarke“ (Pflanze/ERDE/Stufe 3/ATK 1000/DEF 1000) als Spezialbeschwörung.',
  'Los monstruos Planta que controles ganan 800 ATK. Cada vez que un monstruo Planta boca arriba que controles sea destruido: Ganas LP iguales al ATK que tenía en el Campo, y después Invoca de Modo Especial 1 "Ficha Diente de León" (Planta/TIERRA/Nivel 3/ATK 1000/DEF 1000).',
  "Les monstres Plante que vous contrôlez gagnent 800 ATK. Chaque fois qu'un monstre Plante face recto que vous contrôlez est détruit : Gagnez des LP égaux à l'ATK qu'il avait sur le Terrain, puis Invoquez Spécialement 1 \"Jeton Pissenlit\" (Plante/TERRE/Niveau 3/ATK 1000/DEF 1000).",
  'I mostri Pianta che controlli guadagnano 800 ATK. Ogni volta che un mostro Pianta scoperto che controlli viene distrutto: Guadagni LP pari all\'ATK che aveva sul Terreno, poi Evoca Specialmente 1 "Segna-Dente di Leone" (Pianta/TERRA/Livello 3/ATK 1000/DEF 1000).',
  '自分フィールドの植物族モンスターの攻撃力は800アップする。自分フィールドの表側表示の植物族モンスターが破壊される度に、そのモンスターのフィールドでの攻撃力分だけ自分のLPを回復し、その後「ダンデライオントークン」（植物族・地・星３・攻／守１０００）１体を特殊召喚する。',
  '자신 필드의 식물족 몬스터의 공격력은 800 올린다. 자신 필드의 앞면 표시 식물족 몬스터가 파괴될 때마다, 그 몬스터의 필드에서의 공격력만큼 자신의 LP를 회복하고, 그 후 "민들레 토큰"(식물족 / 땅 / 레벨 3 / 공 1000 / 수 1000) 1장을 특수 소환한다.',
  'Os monstros Planta que você controla ganham 800 de ATK. Cada vez que um monstro Planta com a face para cima que você controla for destruído: Ganhe LP iguais ao ATK que ele tinha no campo e, depois, Invoque por Invocação-Especial 1 "Ficha Dente-de-Leão" (Planta/TERRA/Nível 3/ATK 1000/DEF 1000).',
  '自己场上的植物族怪兽的攻击力上升800。每次自己场上的表侧表示的植物族怪兽被破坏，自己回复那只怪兽在场上的攻击力数值的基本分，那之后把1只「蒲公英衍生物」（植物族·地·3星·攻/守1000）特殊召唤。'),
 LOADOUT: ('Überwucherter Garten', 'Jardín Frondoso', 'Jardin Envahi', 'Giardino Selvaggio', '生い茂る庭園', '우거진 정원', 'Jardim Selvagem', '繁茂花园'),
 TOKEN['name']: ('Löwenzahn-Spielmarke', 'Ficha Diente de León', 'Jeton Pissenlit', 'Segna-Dente di Leone', 'ダンデライオントークン', '민들레 토큰', 'Ficha Dente-de-Leão', '蒲公英衍生物'),
 TOKEN['desc']: (
  'Als Spezialbeschwörung durch den Effekt des Relikts „Ewiger Garten“ beschworen.',
  'Invocada de Modo Especial con el efecto de la reliquia "Jardín Eterno".',
  'Invoqué Spécialement avec l\'effet de la relique "Jardin Éternel".',
  'Evocato Specialmente con l\'effetto della reliquia "Giardino Eterno".',
  'レリック「エターナル・ガーデン」の効果で特殊召喚される。',
  '유물 "이터널 가든"의 효과로 특수 소환된다.',
  'Invocada por Invocação-Especial com o efeito da relíquia "Jardim Eterno".',
  '由遗物「永恒花园」的效果特殊召唤。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(path.read_text(encoding='utf-8-sig'))
    have = {(r['group'], r['en']) for r in rows}
    for en, ctx in ((PHOTO, 'relic name (photosynthesis)'), (PHOTO_TEXT, 'relic effect (photosynthesis)'),
                    (GROWTH, 'relic name (spring_growth)'), (GROWTH_TEXT, 'relic effect (spring_growth)'),
                    (POLLEN, 'relic name (pollinator)'), (POLLEN_TEXT, 'relic effect (pollinator)'),
                    (GARDEN, 'relic name (eternal_garden)'), (GARDEN_TEXT, 'relic effect (eternal_garden)')):
        en = re.sub(r'\s+', ' ', en).strip()
        if ('relic', en) not in have:
            rows.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': ctx})
    if ('character', LOADOUT) not in have:
        rows.append({'group': 'character', 'en': LOADOUT, 'kind': 'exact', 'ctx': 'variant title of Weevil Underwood'})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
