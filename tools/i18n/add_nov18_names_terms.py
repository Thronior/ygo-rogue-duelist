"""Pack and character names (itch.io, a Chinese player, 2026-11-18: shop packs and duelist names stayed English).

Booster sets use their official localized names where one exists (Yugipedia set infoboxes); sets never released in a
language get a natural translation, except German, whose official TCG set names are English. Characters use their
official anime names (ja: original, ko: Korean dub, zh: the usual Simplified Chinese names); European languages get
an entry only where the dub name or the title really differs. Fan-made and player-named characters keep English.

Names that are also card names in the game (Pharaoh's Servant, Labyrinth of Nightmare, Invader of Darkness,
The Sanctuary in the Sky, Copycat, Dark Magician, Harpie Lady Sisters, The Masked Beast, Amazoness Paladin,
Darkbishop Archfiend, Lady Ninja Yae, Ojama King) get no entry: the card's official name translates them, and a ui
entry would override the card everywhere. Proper names stay out of data/i18n/catalog.json (build_catalog.py leaves
them out too), so languages without an entry keep the English name. Never overwrites an existing translation.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']

# English: (de, es, fr, it, ja, ko, pt, zh); None keeps the English name in that language.
PACKS = {
 'Legend of Blue Eyes White Dragon': (None, 'Leyenda del Dragón Blanco de Ojos Azules', 'La Légende du Dragon Blanc aux Yeux Bleus', 'La Leggenda del Drago Bianco Occhi Blu', '青眼の白龍伝説', '푸른 눈의 백룡의 전설', 'A Lenda do Dragão Branco de Olhos Azuis', '青眼白龙传说'),
 'Metal Raiders': (None, 'Predadores Metálicos', 'Métal Raiders', 'Predoni Metallici', 'メタル・レイダーズ', '강철의 습격자', 'Predadores Metálicos', '钢铁袭击者'),
 'Spell Ruler': (None, 'Señor de Hechizos', 'Le Maître des Magies', 'Sovrano della Magia', 'スペル・ルーラー', '마법의 지배자', 'Soberano da Magia', '魔法统治者'),
 'Legacy of Darkness': (None, 'Legado de la Oscuridad', "L'Héritage des Ténèbres", "L'Eredità dell'Oscurità", 'レガシー・オブ・ダークネス', '어둠의 유산', 'Legado das Trevas', '黑暗的遗产'),
 'Pharaonic Guardian': (None, 'Guardián Faraónico', 'Le Gardien Pharaonique', 'Guardiano Faraonico', 'ファラオニック・ガーディアン －王家の守護者－', '왕가의 수호자', 'Guardião Faraônico', '王家的守护者'),
 "Magician's Force": (None, 'La Fuerza del Mago', 'La Force du Magicien', 'La Forza del Mago', 'マジシャンズ・フォース', '매지션의 힘', 'A Força do Mago', '魔术师之力'),
 'Dark Crisis': (None, 'Crisis Oscura', 'La Crise des Ténèbres', 'Crisi Oscura', 'ダーク・クライシス', '암흑의 위협', 'Crise Sombria', '黑暗危机'),
 'Invasion of Chaos': (None, 'Invasión del Caos', "L'Invasion des Ténèbres", 'Invasione del Chaos', 'インヴェイジョン・オブ・カオス', '혼돈의 지배', 'Invasão do Caos', '混沌入侵'),
 'Tournament Pack Collection': ('Turnierpaket-Sammlung', 'Colección de Paquetes de Torneo', 'Collection Paquets de Tournoi', 'Collezione Tournament Pack', 'トーナメントパック・コレクション', '토너먼트 팩 컬렉션', 'Coleção de Pacotes de Torneio', '锦标赛包合集'),
 'Spell of Mask': (None, 'Hechizo de la Máscara', 'Le Sortilège du Masque', "L'Incantesimo della Maschera", 'スペル・オブ・マスク －仮面の呪縛－', '가면의 저주', 'O Feitiço da Máscara', '假面的咒缚'),
 'Struggle of Chaos': (None, 'Lucha del Caos', 'La Lutte du Chaos', 'Lotta del Caos', 'ストラグル・オブ・カオス －闇を制する者－', '혼돈의 투쟁', 'Luta do Caos', '混沌之争'),
 'Mythological Age': (None, 'Era Mitológica', "L'Âge Mythologique", 'Era Mitologica', 'ミサラジカル・エイジ －蘇りし魂－', '신화의 시대', 'Era Mitológica', '神话时代'),
 'The New Ruler': (None, 'El Nuevo Soberano', 'Le Nouveau Souverain', 'Il Nuovo Sovrano', '新たなる支配者', '새로운 지배자', 'O Novo Soberano', '新的支配者'),
 'Advent of Union': (None, 'Advenimiento de la Unión', "L'Avènement de l'Union", "L'Avvento dell'Unione", 'ユニオンの降臨', '유니온의 강림', 'Advento da União', '同盟的降临'),
 'Champion of Black Magic': (None, 'Campeón de la Magia Negra', 'Le Champion de la Magie Noire', 'Campione della Magia Nera', '黒魔導の覇者', '흑마도의 패자', 'Campeão da Magia Negra', '黑魔导的霸者'),
 'Power of the Guardian': (None, 'Poder del Guardián', 'Le Pouvoir du Gardien', 'Il Potere del Guardiano', 'ガーディアンの力', '가디언의 힘', 'Poder do Guardião', '守护者之力'),
 'Threat of the Dark Demon World': (None, 'Amenaza del Mundo Demoníaco Oscuro', 'La Menace du Monde Démoniaque', 'La Minaccia del Mondo Demoniaco Oscuro', '闇魔界の脅威', '암마계의 위협', 'Ameaça do Mundo Demoníaco Sombrio', '暗魔界的威胁'),
 'Controller of Chaos': (None, 'Dominador del Caos', 'Le Maître du Chaos', 'Il Dominatore del Caos', '混沌を制す者', '혼돈을 다스리는 자', 'Controlador do Caos', '支配混沌者'),
 "Pharaoh's Inheritance": (None, 'La Herencia del Faraón', "L'Héritage du Pharaon", "L'Eredità del Faraone", 'ファラオの遺産', '파라오의 유산', 'A Herança do Faraó', '法老的遗产'),
 'Booster Chronicle': (None, 'Crónica de Sobres', 'Chronique des Boosters', 'Cronaca delle Buste', 'ブースター・クロニクル', '부스터 크로니클', 'Crônica dos Boosters', '补充包编年史'),
 'Premium Pack Collection': ('Premium-Pack-Sammlung', 'Colección de Paquetes Premium', 'Collection Paquets Premium', 'Collezione Premium Pack', 'プレミアムパック・コレクション', '프리미엄 팩 컬렉션', 'Coleção de Pacotes Premium', '高级包合集'),
 'Green Millennium Puzzle': ('Grünes Millenniumspuzzle', 'Rompecabezas del Milenio Verde', 'Puzzle du Millénium Vert', 'Puzzle del Millennio Verde', '緑の千年パズル', '초록색 천년 퍼즐', 'Enigma do Milênio Verde', '绿色千年积木'),
 'Red Millennium Puzzle': ('Rotes Millenniumspuzzle', 'Rompecabezas del Milenio Rojo', 'Puzzle du Millénium Rouge', 'Puzzle del Millennio Rosso', '赤の千年パズル', '빨간색 천년 퍼즐', 'Enigma do Milênio Vermelho', '红色千年积木'),
 'Yellow Millennium Puzzle': ('Gelbes Millenniumspuzzle', 'Rompecabezas del Milenio Amarillo', 'Puzzle du Millénium Jaune', 'Puzzle del Millennio Giallo', '黄の千年パズル', '노란색 천년 퍼즐', 'Enigma do Milênio Amarelo', '黄色千年积木'),
 'Purple Millennium Puzzle': ('Lila Millenniumspuzzle', 'Rompecabezas del Milenio Morado', 'Puzzle du Millénium Violet', 'Puzzle del Millennio Viola', '紫の千年パズル', '보라색 천년 퍼즐', 'Enigma do Milênio Roxo', '紫色千年积木'),
 'Dark Revelation Volume 1': ('Dark Revelations Volume 1', 'Revelación Oscura Volumen 1', 'Sombre Révélation 1', 'Rivelazione Oscura Vol.1', 'ダーク・レベレーション Volume 1', '다크 레벨레이션 Volume 1', 'Revelação Negra Volume 1', '黑暗启示 第1卷'),
 'Dark Beginning 1': (None, 'Principio Oscuro 1', 'Sombre Commencement 1', 'Inizio Oscuro 1', 'ダーク・ビギニング 1', '다크 비기닝 1', 'Início Sombrio 1', '黑暗的开端 1'),
 'Flaming Eternity': (None, 'Eternidad Llameante', 'Éternité Brûlante', 'Eternità Fiammeggiante', 'フレイミング・エターニティ', '영원한 화염', 'Eternidade Flamejante', '燃烧的永恒'),
 'Rise of Destiny': (None, 'Auge del Destino', 'Avènement du Destin', 'Ascesa del Destino', 'ライズ・オブ・デスティニー', '운명의 시작', 'Ascensão do Destino', '命运的崛起'),
 'Soul of the Duelist': (None, 'Alma del Duelista', "L'Âme du Duelliste", 'Anima del Duellante', 'ソウル・オブ・ザ・デュエリスト', '듀얼리스트의 투혼', 'Alma do Duelista', '决斗者之魂'),
 'Ancient Sanctuary': (None, 'Santuario Antiguo', 'Sanctuaire Ancestral', 'Antico Santuario', 'エンシェント・サンクチュアリ', '고대의 성역', 'Santuário Antigo', '古代圣域'),
 "Beginner's Edition 2": (None, 'Edición Principiante 2', 'Édition Débutant 2', 'Edizione Principianti 2', 'ビギナーズ・エディション 2', '비기너즈팩2', 'Edição Iniciante 2', '新手版 2'),
 'Expert Edition Volume.2': (None, 'Edición Experto Volumen 2', 'Édition Expert Volume 2', 'Edizione Esperti Volume 2', 'エキスパート・エディション Volume.2', '하이그레이드팩2', 'Edição Especialista Volume 2', '专家版 Volume.2'),
 'Limited Edition Collection': ('Sammlung Limitierte Auflage', 'Colección Edición Limitada', 'Collection Édition Limitée', 'Collezione Edizione Limitata', 'リミテッド・エディション・コレクション', '리미티드 에디션 컬렉션', 'Coleção Edição Limitada', '限定版合集'),
 # The game's own packs.
 'Nightmare Legion': ('Albtraumlegion', 'Legión de Pesadilla', 'Légion Cauchemar', "Legione dell'Incubo", '悪夢の軍団', '악몽의 군단', 'Legião do Pesadelo', '梦魇军团'),
 'Knights and Magi': ('Ritter und Magier', 'Caballeros y Magos', 'Chevaliers et Mages', 'Cavalieri e Maghi', '騎士と魔導師', '기사와 마도사', 'Cavaleiros e Magos', '骑士与魔导师'),
 "Heaven's Wrath": ('Zorn des Himmels', 'Ira del Cielo', 'Courroux Céleste', 'Ira del Cielo', '天の怒り', '하늘의 분노', 'Ira dos Céus', '天之怒'),
 'Savage Wilds': ('Wilde Weiten', 'Tierras Salvajes', 'Terres Sauvages', 'Terre Selvagge', '荒ぶる原野', '야생의 땅', 'Terras Selvagens', '蛮荒之地'),
 'Stone and Steel': ('Stein und Stahl', 'Piedra y Acero', 'Pierre et Acier', 'Pietra e Acciaio', '石と鋼', '돌과 강철', 'Pedra e Aço', '岩石与钢铁'),
 'Storm Tide': ('Sturmflut', 'Marea de Tormenta', 'Marée de Tempête', 'Marea Tempestosa', '嵐の潮', '폭풍의 조류', 'Maré da Tempestade', '风暴之潮'),
 "Fortune's Gambit": ('Glücksspiel des Schicksals', 'La Apuesta de la Fortuna', 'Le Pari de la Fortune', "L'Azzardo della Fortuna", '運命の賭け', '행운의 도박', 'A Aposta da Sorte', '命运的赌注'),
 'Stinkers': ('Stinker', 'Apestosos', 'Les Puants', 'Puzzoni', 'ハズレカード', '꽝 카드', 'Fedorentos', '烂卡'),
}
for n in range(1, 6):
    PACKS[f'Duelist Legacy Volume.{n}'] = (None, f'Legado del Duelista Volumen {n}', f"L'Héritage du Duelliste Volume {n}", f"L'Eredità del Duellante Volume {n}",
                                           f'デュエリスト・レガシー Volume.{n}', f'듀얼리스트 레거시 Volume.{n}', f'Legado do Duelista Volume {n}', f'决斗者遗产 Volume.{n}')

# Character names: ja, ko, zh, plus European entries only where the dub/title differs.
ASIAN = {  # English: (ja, ko, zh)
 'Yami Yugi': ('闇遊戯', '어둠의 유희', '暗游戏'),
 'Yugi Muto': ('武藤遊戯', '유희', '武藤游戏'),
 'Seto Kaiba': ('海馬瀬人', '카이바 세토', '海马濑人'),
 'Joey Wheeler': ('城之内克也', '조이', '城之内克也'),
 'Mai Valentine': ('孔雀舞', '메이 발렌타인', '孔雀舞'),
 'Bandit Keith': ('バンデット・キース', '밴디트 키스', '强盗基斯'),
 'Lumis and Umbra': ('光と闇の仮面', '빛과 어둠의 가면', '光与暗之假面'),
 'Yami Bakura': ('闇獏良', '어둠의 바크라', '暗貘良'),
 'Ryou Bakura': ('獏良了', '바크라', '貘良了'),
 'Maximillion Pegasus': ('ペガサス・J・クロフォード', '페가서스 J. 크로퍼드', '贝卡斯·J·克劳福德'),
 'Cecelia Pegasus': ('シンディア', '신디아', '辛迪娅'),
 'Rex Raptor': ('ダイナソー竜崎', '렉스 랩터', '恐龙龙崎'),
 'Bonz': ('ゴースト骨塚', '본즈', '幽灵骨冢'),
 'Weevil Underwood': ('インセクター羽蛾', '위빌 언더우드', '昆虫羽蛾'),
 "Weevil's helper": ('羽蛾の手下', '위빌의 조수', '羽蛾的帮手'),
 'Yami Marik': ('闇マリク', '어둠의 마리크', '暗马利克'),
 'Marik Ishtar': ('マリク・イシュタール', '마리크 이슈타르', '马利克·伊修塔尔'),
 'Ishizu Ishtar': ('イシズ・イシュタール', '이시즈 이슈타르', '伊丝兹·伊修塔尔'),
 'Odion': ('リシド', '리시드', '里希德'),
 'Tristan Taylor': ('本田ヒロト', '전우혁', '本田广人'),
 'Tea Gardner': ('真崎杏子', '안수진', '真崎杏子'),
 'Solomon Muto': ('武藤双六', '솔로몬 무토', '武藤双六'),
 'Mokuba Kaiba': ('海馬モクバ', '모크바', '海马木马'),
 'Noah Kaiba': ('海馬乃亜', '노아 카이바', '海马乃亚'),
 'Serenity Wheeler': ('川井静香', '조앤', '川井静香'),
 'Rebecca Hawkins': ('レベッカ・ホプキンス', '레베카 호킨스', '丽贝卡·霍普金斯'),
 'Arthur Hawkins': ('アーサー・ホプキンス', '아서 호킨스', '亚瑟·霍普金斯'),
 'Espa Roba': ('エスパー絽場', '에스파 로바', '超能力者绍场'),
 'Arkana': ('パンドラ', '아르카나', '潘多拉'),
 'Mako Tsunami': ('梶木漁太', '마코 츠나미', '梶木渔太'),
 'Duke Devlin': ('御伽龍児', '듀크', '御伽龙儿'),
 'Paradox Brothers': ('迷宮兄弟', '패러독스 형제', '迷宫兄弟'),
 'Anubis': ('アヌビス', '아누비스', '阿努比斯'),
 'Shadi': ('シャーディー', '샤디', '夏迪'),
 'PaniK': ('「闇」のプレイヤーキラー', '패닉', '暗之玩家杀手'),
 'Dartz': ('ダーツ', '다츠', '达姿'),
 'Rafael': ('ラフェール', '라파엘', '拉斐尔'),
 'Valon': ('ヴァロン', '바론', '瓦隆'),
 'Alister': ('アメルダ', '앨리스터', '阿梅尔达'),
 'Roland': ('磯野', '롤랜드', '矶野'),
 'Leon von Schroeder': ('レオンハルト・フォン・シュレイダー', '레온 폰 슈로더', '莱昂哈特·冯·施莱德'),
 'Siegfried von Schroeder': ('ジークフリード・フォン・シュレイダー', '지크프리트 폰 슈로더', '齐格弗里德·冯·施莱德'),
 'Kemo': ('猿渡', '케모', '猿渡'),
 'Leichter': ('大門小五郎', '라이히터', '大门小五郎'),
 'Sid': ('高井戸清', '시드', '高井户清'),
 'Crump': ('大瀧修三', '크럼프', '大泷修三'),
 'Nezbitt': ('大田宗一郎', '네즈빗', '大田宗一郎'),
 'Gansley': ('大下幸之助', '갠슬리', '大下幸之助'),
 'Johnson': ('大岡筑前', '존슨', '大冈筑前'),
 'Princess Adena': ('メアリー姫', '아데나 공주', '玛丽公主'),
 'Aknadin': ('アクナディン', '아크나딘', '阿克纳丁'),
 'Shimon Muran / Simon': ('シモン・ムーラン', '시몬 뮤란', '西蒙·穆兰'),
 'Mahad': ('マハード', '마하드', '马哈德'),
 'Kisara': ('キサラ', '키사라', '琪莎拉'),
 'Strings': ('パントマイマー', '스트링스', '默剧演员'),
 'Seeker': ('レアハンター', '레어 헌터', '稀有猎人'),
 'Zorc Necrophades': ('大邪神ゾーク・ネクロファデス', '대사신 조크 네크로파데스', '大邪神 佐克·尼克罗法迪斯'),
 # Named after their card; the short name the card uses in that language.
 'Thestalos': ('テスタロス', '테스탈로스', '泰斯塔罗斯'),
 'Breaker': ('ブレイカー', '브레이커', '破坏者'),
}
EUROPEAN = {  # English: {lang: name}, only where the dub name or the title differs
 'Weevil Underwood': {'fr': 'Insector Haga', 'it': 'Bruchido Haga'},
 'Bandit Keith': {'fr': 'Ken'},
 'Tristan Taylor': {'es': 'Tristán Taylor'},
 'Seeker': {'fr': 'Jack Hunter'},
 'Paradox Brothers': {'de': 'Paradox-Brüder', 'es': 'Hermanos Paradox', 'fr': 'Frères Paradox', 'it': 'Fratelli Paradox', 'pt': 'Irmãos Paradox'},
 'Lumis and Umbra': {'de': 'Lumis und Umbra', 'es': 'Lumis y Umbra', 'fr': 'Lumis et Umbra', 'it': 'Lumis e Umbra', 'pt': 'Lumis e Umbra'},
 'Princess Adena': {'de': 'Prinzessin Adena', 'es': 'Princesa Adena', 'fr': 'Princesse Adena', 'it': 'Principessa Adena', 'pt': 'Princesa Adena'},
 "Weevil's helper": {'de': 'Weevils Helfer', 'es': 'Ayudante de Weevil', 'fr': 'Assistant de Weevil', 'it': 'Aiutante di Weevil', 'pt': 'Ajudante de Weevil'},
 'Breaker': {'de': 'Brecher', 'fr': 'Fracas'},
}
# "Obelisk the Tormenter" (the opponent) is spelled differently from the card "Obelisk the Tormentor" (10000000), so
# it takes that card's official name in every language.
CARD_NAMED = {'Obelisk the Tormenter': 10000000}


def table():
    rows = {lang: {} for lang in LANGS}
    content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf8'))
    card_names = {c['name'] for c in content['cards'] + content['tokenCards']}
    for en, values in PACKS.items():
        assert en not in card_names, en
        for lang, v in zip(LANGS, values):
            if v: rows[lang][en] = v
    for en, (ja, ko, zh) in ASIAN.items():
        assert en not in card_names, en
        rows['ja'][en], rows['ko'][en], rows['zh'][en] = ja, ko, zh
    for en, by_lang in EUROPEAN.items():
        for lang, v in by_lang.items(): rows[lang][en] = v
    for en, cid in CARD_NAMED.items():
        for lang in LANGS:
            local = json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf8')).get(str(cid))
            if local and local[0]: rows[lang][en] = local[0]
    known = {c['name'] for c in content['characters']} | {p['name'] for p in content['packs']}
    for lang in LANGS:
        missing = set(rows[lang]) - known
        assert not missing, (lang, missing)
    return rows


def main():
    rows = table()
    added = 0
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        ui = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, v in rows[lang].items():
            if en not in ui: ui[en] = v; added += 1
        path.write_text(json.dumps(ui, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', {lang: len(rows[lang]) for lang in LANGS}, 'added', added)


if __name__ == '__main__':
    main()
