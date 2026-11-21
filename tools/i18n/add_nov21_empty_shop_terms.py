"""Solomon's lines for the empty LVL -1 shop of Copycat's first loadout and Dueling Engine (Discord, 2026-11-21),
in all 8 languages (shopkeeper-talk.js LINES.empty). Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Why are you even here?': ('Was machst du überhaupt hier?', '¿Y tú qué haces aquí?', "Qu'est-ce que tu fais là, au juste ?", 'Ma tu che ci fai qui?', '何しに来たんじゃ？', '여긴 왜 온 게냐?', 'O que você está fazendo aqui?', '你来这儿干什么？'),
 'There’s nothing for you here.': ('Hier gibt es nichts für dich.', 'Aquí no hay nada para ti.', "Il n'y a rien pour toi ici.", "Qui non c'è niente per te.", 'ここにお前さんの物は何もないぞ。', '여기엔 너한테 줄 게 없단다.', 'Não tem nada para você aqui.', '这里没有你要的东西。'),
 'Get the hell outta my store!': ('Raus aus meinem Laden!', '¡Largo de mi tienda!', 'Dehors, hors de ma boutique !', 'Fuori dal mio negozio!', 'わしの店から出ていけ！', '내 가게에서 썩 나가라!', 'Fora da minha loja!', '给我滚出我的店！'),
 'Did you get lost?': ('Hast du dich verlaufen?', '¿Te has perdido?', 'Tu t’es perdu ?', 'Ti sei perso?', '道に迷ったのか？', '길을 잃었느냐?', 'Você se perdeu?', '你迷路了吗？'),
 'Nothing to buy. Move along.': ('Hier gibt’s nichts zu kaufen. Weitergehen.', 'No hay nada que comprar. Circula.', 'Rien à acheter. Circule.', 'Niente da comprare. Circolare.', '買える物はないぞ。さあ行った行った。', '살 건 없다. 어서 가거라.', 'Nada para comprar. Circulando.', '没东西可买。走吧走吧。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
