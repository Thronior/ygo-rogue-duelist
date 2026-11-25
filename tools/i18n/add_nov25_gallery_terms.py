"""Gallery Audio and Images tabs (user 2026-11-25). All 8 languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Audio': ('Audio', 'Audio', 'Audio', 'Audio', 'オーディオ', '오디오', 'Áudio', '音频'),
 'Images': ('Bilder', 'Imágenes', 'Images', 'Immagini', '画像', '이미지', 'Imagens', '图片'),
 'Soundtrack': ('Soundtrack', 'Banda sonora', 'Bande originale', 'Colonna sonora', 'サウンドトラック', '사운드트랙', 'Trilha sonora', '原声音乐'),
 'Boss duels': ('Boss-Duelle', 'Duelos de jefe', 'Duels de Boss', 'Duelli contro il Boss', 'ボスデュエル', '보스 듀얼', 'Duelos contra Chefe', '首领决斗'),
 'Legendary summons': ('Legendäre Beschwörungen', 'Invocaciones legendarias', 'Invocations légendaires', 'Evocazioni leggendarie',
  '伝説の召喚', '전설의 소환', 'Invocações lendárias', '传说召唤'),
 'Finishers': ('Finisher', 'Remates', 'Coups de grâce', 'Colpi di grazia', 'フィニッシュ', '피니시', 'Golpes finais', '终结'),
 'Defeat taunts': ('Niederlagen-Sprüche', 'Burlas de derrota', 'Moqueries de défaite', 'Prese in giro della sconfitta',
  '敗北時の挑発', '패배 도발', 'Provocações de derrota', '失败嘲讽'),
 'Duelist sleeves': ('Duellanten-Hüllen', 'Fundas de duelista', 'Protège-cartes de duelliste', 'Bustine dei duellanti',
  'デュエリストスリーブ', '듀얼리스트 슬리브', 'Capas de duelista', '决斗者卡套'),
 'Card sleeves': ('Kartenhüllen', 'Fundas de carta', 'Protège-cartes de carte', 'Bustine delle carte', 'カードスリーブ', '카드 슬리브',
  'Capas de carta', '卡牌卡套'),
 'Music is at 0% in Settings.': ('Musik steht in den Einstellungen auf 0 %.', 'La música está al 0 % en Ajustes.',
  'La musique est à 0 % dans les Paramètres.', 'La musica è allo 0% nelle Impostazioni.', '設定で音楽が0%になっています。',
  '설정에서 음악이 0%입니다.', 'A música está em 0% nas Configurações.', '设置中的音乐为0%。'),
 'Voice Lines are at 0% in Settings.': ('Sprachausgabe steht in den Einstellungen auf 0 %.', 'Las frases de voz están al 0 % en Ajustes.',
  'Les répliques vocales sont à 0 % dans les Paramètres.', 'Le battute vocali sono allo 0% nelle Impostazioni.',
  '設定でボイスが0%になっています。', '설정에서 음성이 0%입니다.', 'As falas estão em 0% nas Configurações.', '设置中的语音为0%。'),
 'Gallery sections': ('Galerie-Bereiche', 'Secciones de la galería', 'Sections de la galerie', 'Sezioni della galleria',
  'ギャラリーの項目', '갤러리 항목', 'Seções da galeria', '画廊分区'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
