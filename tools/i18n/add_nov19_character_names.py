"""Character names in Japanese, Korean and Simplified Chinese, checked against official sources (2026-11-19).

Replaces the ja/ko/zh character entries of add_nov18_names_terms.py: those were partly fan transliterations of the
English dub names (Korean 위빌 언더우드, 렉스 랩터, 마코 츠나미...) and partly Taiwanese/fan Chinese spellings.
Every entry in NAMES is written over whatever the ui table holds.

Sources, in order of preference:
- Konami's Duel Links site, which lists the same characters in each language
  (konami.com/yugioh/duel_links/legendarydecks/{ja,ko,zh-tw}/; the zh-tw URL serves the Simplified Chinese list and
  zh-cn the Traditional one). Korean Duel Links uses the Korean broadcast names (조이, 사마준, 유별난...).
- ja: Yugipedia ja_name fields (the original anime names).
- ko: the Korean broadcast names on Namu Wiki where Duel Links has no such character (Big Five 라돈/크라켄/오피온/
  타라스크/칼레신, 로이드, 나이스, 레드, 라펠, 어둠의 플레이어 킬러); Japanese-based spellings otherwise.
- zh: Chinese Wikipedia's character list in its zh-cn variant (the names the Chinese Duel Links also uses: 利希德,
  帕伽索斯, 海马圭平, 亚曼尔达) for characters Duel Links does not list; the Japanese kanji for kanji names.

Characters named after a card (Dark Magician, Harpie Lady Sisters, The Masked Beast, Amazoness Paladin, Darkbishop
Archfiend, Lady Ninja Yae, Ojama King, Copycat) get no entry: i18n.js translates an exact card name from the card
database, so they already show the official card name. CARD_NAMED is only checked here. "Dueling Engine" stays
English, as in every other ja/ko/zh string that names it. Player-made names stay English. Yami Alexander (from the
English-only Capsule Monsters) has no official name in these languages and stays English.

No catalog rows: proper names stay out of data/i18n/catalog.json (see add_nov18_names_terms.py), because
android/test_i18n.mjs requires every catalog key in all 8 languages and the European ones keep the English name.
"""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['ja', 'ko', 'zh']

NAMES = {  # English: (ja, ko, zh)
 'Yami Yugi': ('闇遊戯', '어둠의 유희', '暗游戏'),
 'Yugi Muto': ('武藤遊戯', '유희', '武藤游戏'),
 'Seto Kaiba': ('海馬瀬人', '카이바 세토', '海马濑人'),
 'Joey Wheeler': ('城之内克也', '조이', '城之内克也'),
 'Mai Valentine': ('孔雀舞', '메이 발렌타인', '孔雀舞'),
 'Tea Gardner': ('真崎杏子', '안수진', '真崎杏子'),
 'Tristan Taylor': ('本田ヒロト', '전우혁', '本田广人'),
 'Bandit Keith': ('バンデット・キース', '키스 하워드', '盗贼基斯'),
 'Lumis and Umbra': ('光と闇の仮面', '빛과 어둠의 가면', '光与暗之假面'),
 'Yami Bakura': ('闇バクラ', '어둠의 바크라', '暗貘良'),
 'Ryou Bakura': ('獏良了', '바크라', '貘良了'),
 'Maximillion Pegasus': ('ペガサス・J・クロフォード', '페가수스 J. 크로포드', '帕伽索斯·J·克劳福德'),
 'Cecelia Pegasus': ('シンディア', '신디아', '辛迪娅'),
 'Rex Raptor': ('ダイナソー竜崎', '다이나소 용만', '恐龙龙崎'),
 'Bonz': ('ゴースト骨塚', '해골수스', '鬼骨冢'),
 'Weevil Underwood': ('インセクター羽蛾', '사마준', '昆虫羽蛾'),
 "Weevil's helper": ('羽蛾の手下', '사마준의 조수', '羽蛾的帮手'),
 'Yami Marik': ('闇マリク', '어둠의 마리크', '暗马利克'),
 'Marik Ishtar': ('マリク・イシュタール', '마리크 이슈타르', '马利克·伊修达尔'),
 'Ishizu Ishtar': ('イシズ・イシュタール', '이시즈 이슈타르', '伊西丝·伊修达尔'),
 'Odion': ('リシド', '리시드', '利希德'),
 'Solomon Muto': ('武藤双六', '유별난', '武藤双六'),
 'Mokuba Kaiba': ('海馬モクバ', '모크바', '海马圭平'),
 'Noah Kaiba': ('海馬乃亜', '노아', '海马乃亚'),
 'Serenity Wheeler': ('川井静香', '조앤', '川井静香'),
 'Rebecca Hawkins': ('レベッカ・ホプキンス', '레베카 홉킨스', '蕾贝卡·霍普金斯'),
 'Arthur Hawkins': ('アーサー・ホプキンス', '아서 홉킨스', '亚瑟·霍普金斯'),
 'Espa Roba': ('エスパー絽場', '에스퍼 로바', '天才吕场'),
 'Arkana': ('パンドラ', '판도라', '潘多拉'),
 'Mako Tsunami': ('梶木漁太', '마해룡', '梶木渔太'),
 'Duke Devlin': ('御伽龍児', '듀크', '御伽龙儿'),
 'Paradox Brothers': ('迷宮兄弟', '미궁형제', '迷宫兄弟'),
 'Princess Adena': ('メアリー姫', '메리 공주', '玛丽公主'),
 'Alister': ('アメルダ', '아멜다', '亚曼尔达'),
 'Dartz': ('ダーツ', '다츠', '达兹'),
 'Rafael': ('ラフェール', '라펠', '拉费尔'),
 'Valon': ('ヴァロン', '바론', '瓦龙'),
 'Anubis': ('アヌビス', '아누비스', '阿努比斯'),
 'Shadi': ('シャーディー', '샤디', '夏迪'),
 'PaniK': ('「闇」のプレイヤーキラー', '어둠의 플레이어 킬러', '暗之玩家杀手'),
 'Roland': ('磯野', '로이드', '矶野'),
 'Kemo': ('猿渡', '나이스', '猿渡'),
 'Gansley': ('大下幸之助', '라돈', '大下幸之助'),
 'Crump': ('大瀧修三', '크라켄', '大泷修三'),
 'Johnson': ('大岡筑前', '오피온', '大冈筑前'),
 'Nezbitt': ('大田宗一郎', '타라스크', '大田宗一郎'),
 'Leichter': ('大門小五郎', '칼레신', '大门小五郎'),
 'Sid': ('高井戸清', '레드', '高井户清'),
 'Leon von Schroeder': ('レオンハルト・フォン・シュレイダー', '레온하르트 폰 슈레이더', '莱昂哈特·冯·施莱德'),
 'Siegfried von Schroeder': ('ジークフリード・フォン・シュレイダー', '지크프리드 폰 슈레이더', '齐格弗里德·冯·施莱德'),
 'Strings': ('パントマイマー', '판토마이머', '默剧演员'),
 'Seeker': ('レアハンター', '레어 헌터', '稀有卡猎人'),
 'Aknadin': ('アクナディン', '아크나딘', '阿克纳帝'),
 'Shimon Muran / Simon': ('シモン・ムーラン', '시몬 무란', '西蒙·穆兰'),
 'Mahad': ('マハード', '마하드', '马哈德'),
 'Kisara': ('キサラ', '키사라', '琪莎拉'),
 'Zorc Necrophades': ('大邪神ゾーク・ネクロファデス', '대사신 조크 네크로파데스', '大邪神佐克·内洛法'),
 # Monsters as opponents: the short name the card uses in that language.
 'Thestalos': ('テスタロス', '테스탈로스', '泰斯塔罗斯'),
 'Breaker': ('ブレイカー', '브레이커', '破坏者'),
}
# Already translated through the card database (no ui entry); checked so a missing card name shows up here.
CARD_NAMED = ['Dark Magician', 'Harpie Lady Sisters', 'The Masked Beast', 'Amazoness Paladin', 'Darkbishop Archfiend',
              'Lady Ninja Yae', 'Ojama King', 'Copycat']
# Simplified Chinese must not carry these Traditional forms (a quick guard, not a full converter).
TRADITIONAL = set('遊戲馬瀨內龍兒蟲貝爾亞達絲廣靜雙場們禮盜賊塚漁宮與麗戸瀧門岡亜')


def main():
    content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf8'))
    characters = {c['name'] for c in content['characters']}
    cards = {c['name']: c['id'] for c in content['cards'] + content['tokenCards']}
    for en, row in NAMES.items():
        assert en in characters, en
        assert en not in cards, en
        assert len(row) == len(LANGS) and all(row), en
        assert not set(row[2]) & TRADITIONAL, (en, row[2])
    for en in CARD_NAMED:
        assert en in characters and en in cards, en
        for lang in LANGS:
            local = json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf8')).get(str(cards[en]))
            assert local and local[0], (lang, en)
    changed = []
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        ui = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, row in NAMES.items():
            if ui.get(en) != row[i]: changed.append((lang, en, ui.get(en), row[i])); ui[en] = row[i]
        path.write_text(json.dumps(ui, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    for lang, en, old, new in changed: print(f'{lang}\t{en}\t{old} -> {new}')
    print('ok', len(NAMES), 'names,', len(changed), 'changed')


if __name__ == '__main__':
    main()
