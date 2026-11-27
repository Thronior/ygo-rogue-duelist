"""Main loadout names (data/loadout-names.json, user 2026-11-27) in all 8 languages, plus the catalog rows. "Gagagoogoo"
stays as it is everywhere. Never overwrites an existing translation (a name that is also a card name keeps that entry)."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 "Pharaoh's Magic": ('Magie des Pharaos', 'Magia del Faraón', 'Magie du Pharaon', 'Magia del Faraone', 'ファラオの魔術', '파라오의 마술', 'Magia do Faraó', '法老的魔术'),
 'White Lightning Destruction': ('Weiße Blitzvernichtung', 'Destrucción del Relámpago Blanco', "Destruction de l'Éclair Blanc", 'Distruzione del Fulmine Bianco', '滅びの白き稲妻', '멸망의 하얀 번개', 'Destruição do Relâmpago Branco', '毁灭的白色闪电'),
 'Brooklyn Bladers': ('Brooklyn-Klingen', 'Espadachines de Brooklyn', 'Lames de Brooklyn', 'Lame di Brooklyn', 'ブルックリン・ブレイダーズ', '브루클린 블레이더스', 'Lâminas do Brooklyn', '布鲁克林剑士'),
 'Harpie Storm': ('Harpyiensturm', 'Tormenta Arpía', 'Tempête Harpie', 'Tempesta Arpia', 'ハーピィ・ストーム', '하피 스톰', 'Tempestade Harpia', '鹰身风暴'),
 'Lucky Metal': ('Glücksmetall', 'Metal de la Suerte', 'Métal Chanceux', 'Metallo Fortunato', 'ラッキー・メタル', '럭키 메탈', 'Metal da Sorte', '幸运金属'),
 'Masquerade Shadows': ('Maskenball der Schatten', 'Sombras de Mascarada', 'Ombres de la Mascarade', 'Ombre in Maschera', '仮面の影', '가면의 그림자', 'Sombras Mascaradas', '假面之影'),
 'Darkness Necromancer': ('Nekromant der Finsternis', 'Nigromante de la Oscuridad', 'Nécromancien des Ténèbres', 'Negromante delle Tenebre', '闇の死霊術師', '어둠의 사령술사', 'Necromante das Trevas', '黑暗死灵师'),
 'Restricting Eye': ('Bannendes Auge', 'Ojo Restrictivo', 'Œil Restrictif', 'Occhio Vincolante', '封じの眼', '봉인의 눈', 'Olho Restritivo', '封印之眼'),
 'Jurassic Stampede': ('Jurassischer Ansturm', 'Estampida Jurásica', 'Ruée Jurassique', 'Carica Giurassica', 'ジュラシック・スタンピード', '쥬라기 스탬피드', 'Estouro Jurássico', '侏罗纪狂奔'),
 'Rising Undead': ('Erwachende Untote', 'Resurgir de los No Muertos', 'Morts-Vivants Levés', 'Non Morti Risorti', '蘇る不死者', '되살아나는 언데드', 'Mortos-Vivos Erguidos', '苏醒的不死者'),
 'Swarming Hive': ('Schwärmender Stock', 'Enjambre de la Colmena', 'Ruche Grouillante', 'Alveare Brulicante', '群がる巣', '들끓는 벌집', 'Colmeia Fervilhante', '蜂拥之巢'),
 'Eternal Flames': ('Ewige Flammen', 'Llamas Eternas', 'Flammes Éternelles', 'Fiamme Eterne', '永遠の炎', '영원의 불꽃', 'Chamas Eternas', '永恒之焰'),
 'Gagagoogoo': ('Gagagoogoo',) * 8,
 'Blinding Blades': ('Blendende Klingen', 'Espadas Cegadoras', 'Lames Aveuglantes', 'Lame Accecanti', '眩き剣', '눈부신 검', 'Lâminas Ofuscantes', '炫目之刃'),
 "Future's Will": ('Wille der Zukunft', 'Voluntad del Futuro', "Volonté de l'Avenir", 'Volontà del Futuro', '未来の意志', '미래의 의지', 'Vontade do Futuro', '未来的意志'),
 "Serket's Tomb": ('Serkets Grab', 'Tumba de Serket', 'Tombeau de Serket', 'Tomba di Serket', 'セルケトの墓', '세르케트의 무덤', 'Tumba de Serket', '塞尔凯特之墓'),
 'Psychic Units': ('Psychische Einheiten', 'Unidades Psíquicas', 'Unités Psychiques', 'Unità Psichiche', 'サイキック・ユニット', '사이킥 유닛', 'Unidades Psíquicas', '念动部队'),
 'Crimson Magic': ('Purpurmagie', 'Magia Carmesí', 'Magie Pourpre', 'Magia Cremisi', '紅の魔術', '진홍의 마술', 'Magia Carmesim', '深红魔术'),
 'Legends of the Sea': ('Legenden des Meeres', 'Leyendas del Mar', 'Légendes de la Mer', 'Leggende del Mare', '海の伝説', '바다의 전설', 'Lendas do Mar', '大海的传说'),
 'Dungeon Dice': ('Dungeon-Würfel', 'Dados de Mazmorra', 'Dés du Donjon', 'Dadi del Dungeon', 'ダンジョンダイス', '던전 다이스', 'Dados de Masmorra', '地下城骰子'),
 'Ark Genesis': ('Arche-Genesis', 'Génesis del Arca', "Genèse de l'Arche", "Genesi dell'Arca", '方舟の創世', '방주의 창세', 'Gênese da Arca', '方舟创世'),
 'Guardians Labyrinth': ('Labyrinth der Wächter', 'Laberinto de los Guardianes', 'Labyrinthe des Gardiens', 'Labirinto dei Guardiani', '守護者の迷宮', '수호자의 미궁', 'Labirinto dos Guardiões', '守护者迷宫'),
 'Healing Flames': ('Heilende Flammen', 'Llamas Sanadoras', 'Flammes Guérisseuses', 'Fiamme Curative', '癒しの炎', '치유의 불꽃', 'Chamas Curativas', '治愈之焰'),
 'The Forbidden One': ('Der Verbotene', 'El Prohibido', "L'Interdit", 'Il Proibito', '封印されし者', '봉인된 자', 'O Proibido', '被封印者'),
 'Thunder Thief': ('Donnerdieb', 'Ladrón del Trueno', 'Voleur de Tonnerre', 'Ladro del Tuono', 'サンダー・シーフ', '썬더 시프', 'Ladrão do Trovão', '雷霆盗贼'),
 'Golden Grave': ('Goldenes Grab', 'Tumba Dorada', 'Tombe Dorée', 'Tomba Dorata', '黄金の墓', '황금의 무덤', 'Túmulo Dourado', '黄金之墓'),
 'Divine Phoenix': ('Göttlicher Phönix', 'Fénix Divino', 'Phénix Divin', 'Fenice Divina', '神の不死鳥', '신의 불사조', 'Fênix Divina', '神之不死鸟'),
 'Pyramid of Light': ('Pyramide des Lichts', 'Pirámide de Luz', 'Pyramide de Lumière', 'Piramide di Luce', '光のピラミッド', '빛의 피라미드', 'Pirâmide de Luz', '光之金字塔'),
 'Millennium Defender': ('Millenniums-Verteidiger', 'Defensor del Milenio', 'Défenseur du Millénaire', 'Difensore del Millennio', '千年の守護者', '천년의 수호자', 'Defensor do Milênio', '千年守护者'),
 'Dark Illusions': ('Dunkle Illusionen', 'Ilusiones Oscuras', 'Illusions des Ténèbres', 'Illusioni Oscure', '闇の幻影', '어둠의 환영', 'Ilusões Sombrias', '黑暗幻影'),
 'Shadow Realm': ('Reich der Schatten', 'Reino de las Sombras', 'Royaume des Ombres', 'Regno delle Ombre', '闇の世界', '어둠의 세계', 'Reino das Sombras', '黑暗世界'),
 'Sacred Guardian': ('Heiliger Wächter', 'Guardián Sagrado', 'Gardien Sacré', 'Guardiano Sacro', '聖なる守護者', '성스러운 수호자', 'Guardião Sagrado', '神圣守护者'),
 'Twisted Fate': ('Verdrehtes Schicksal', 'Destino Torcido', 'Destin Tordu', 'Destino Distorto', 'ねじれた運命', '뒤틀린 운명', 'Destino Distorcido', '扭曲的命运'),
 'Mirror Match': ('Spiegelduell', 'Duelo Espejo', 'Duel Miroir', 'Duello Specchio', 'ミラーマッチ', '미러 매치', 'Duelo Espelhado', '镜像对决'),
 'Robotic Precision': ('Robotische Präzision', 'Precisión Robótica', 'Précision Robotique', 'Precisione Robotica', '機械の精密さ', '로봇의 정밀함', 'Precisão Robótica', '机械般的精准'),
}


def main():
    names = json.loads((ROOT / 'data/loadout-names.json').read_text(encoding='utf8'))['names']
    import sys
    sys.path.insert(0, str(ROOT))
    owners = {}
    for index, name in names.items():
        owners.setdefault(name, index)
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        missing = [n for n in names.values() if n not in table]
        assert not missing, (lang, missing)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(path.read_text(encoding='utf-8-sig'))
    have = {(r['group'], r['en']) for r in rows}
    for name in names.values():
        if ('character', name) not in have:
            rows.append({'group': 'character', 'en': name, 'kind': 'exact', 'ctx': f'main loadout title of character {owners[name]}'})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
