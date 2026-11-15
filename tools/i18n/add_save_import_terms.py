"""Text for importing players' own save files in the app (2026-11-14), in every language.
Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text

LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    'Import a save file': ('Spielstand-Datei importieren', 'Importar un archivo de guardado', 'Importer un fichier de sauvegarde', 'Importa un file di salvataggio', 'Importar um arquivo de salvamento', 'セーブファイルをインポート', '저장 파일 가져오기', '导入存档文件'),
    'A save backup exported from the browser version, or a recovery file from the admin.': (
        'Eine aus der Browserversion exportierte Spielstand-Sicherung oder eine Wiederherstellungsdatei vom Admin.',
        'Una copia de guardado exportada desde la versión de navegador, o un archivo de recuperación del administrador.',
        "Une sauvegarde exportée depuis la version navigateur, ou un fichier de récupération fourni par l'administrateur.",
        "Un backup del salvataggio esportato dalla versione browser, o un file di recupero fornito dall'amministratore.",
        'Um backup de salvamento exportado da versão de navegador, ou um arquivo de recuperação do administrador.',
        'ブラウザ版からエクスポートしたセーブのバックアップ、または管理者の復旧ファイル。',
        '브라우저 버전에서 내보낸 저장 백업 또는 관리자가 제공한 복구 파일.',
        '从浏览器版导出的存档备份，或管理员提供的恢复文件。'),
    'Choose a save file exported from the game.': (
        'Wähle eine aus dem Spiel exportierte Spielstand-Datei.',
        'Elige un archivo de guardado exportado desde el juego.',
        'Choisissez un fichier de sauvegarde exporté depuis le jeu.',
        'Scegli un file di salvataggio esportato dal gioco.',
        'Escolha um arquivo de salvamento exportado do jogo.',
        'ゲームからエクスポートしたセーブファイルを選んでください。',
        '게임에서 내보낸 저장 파일을 선택하세요.',
        '请选择从游戏导出的存档文件。'),
    'Import this save? This replaces current runs, progress and Ultimate Collectors.': (
        'Diesen Spielstand importieren? Das ersetzt laufende Durchläufe, Fortschritt und Ultimative Sammler.',
        '¿Importar esta partida guardada? Reemplaza las partidas en curso, el progreso y los Coleccionistas Definitivos.',
        'Importer cette sauvegarde ? Cela remplace les parties en cours, la progression et les Collectionneurs Ultimes.',
        'Importare questo salvataggio? Sostituisce le partite in corso, i progressi e i Collezionisti Supremi.',
        'Importar este salvamento? Isso substitui as jornadas em andamento, o progresso e os Colecionadores Supremos.',
        'このセーブをインポートしますか？進行中のラン、進行状況、アルティメット・コレクターが置き換えられます。',
        '이 저장을 가져올까요? 진행 중인 런, 진행 상황, 얼티밋 컬렉터가 덮어써집니다.',
        '导入此存档？这将替换当前的冒险、进度和终极收藏家数据。'),
}


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(catalog_path.read_text(encoding='utf8'))
    known = {r['en'] for r in rows}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        for key, values in TERMS.items():
            table.setdefault(key, values[index])
        write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    for key in TERMS:
        if key not in known:
            rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'mobile.js,device-backup.js'})
    write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')


if __name__ == '__main__':
    main()
