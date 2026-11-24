"""Stats > CPU Stats (user, 2026-11-24): every player's finished solo duels against each CPU, grouped by deck tier, and
one CPU's record against each duelist (mobile.js renderCpuStats). All 8 languages; never overwrites an existing
translation. "Tier 1"-"Tier 3", "Ultimate Collectors", "Opponent", "Character", "Back", "Retry", "Since {0}",
"Search characters" and "No matching characters." already exist."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'CPU Stats': ('CPU-Statistiken', 'Estadísticas de la CPU', 'Statistiques des CPU', 'Statistiche CPU', 'CPU統計', 'CPU 통계', 'Estatísticas da CPU', 'CPU统计'),
 'Loading CPU results…': ('CPU-Ergebnisse werden geladen…', 'Cargando resultados de la CPU…', 'Chargement des résultats des CPU…', 'Caricamento dei risultati CPU…', 'CPUの結果を読み込み中…', 'CPU 결과를 불러오는 중…', 'Carregando resultados da CPU…', '正在加载CPU结果…'),
 'Opening duel': ('Eröffnungsduell', 'Duelo inicial', "Duel d'ouverture", 'Duello iniziale', '最初のデュエル', '첫 듀얼', 'Duelo inicial', '开局决斗'),
 'Tier 4': ('Tier 4', 'Tier 4', 'Palier 4', 'Tier 4', 'ティア4', '티어 4', 'Tier 4', '阶级4'),
 'Search opponents': ('Gegner suchen', 'Buscar adversarios', 'Rechercher des adversaires', 'Cerca avversari', '相手を検索', '상대 검색', 'Buscar oponentes', '搜索对手'),
 'No matching opponents.': ('Keine passenden Gegner.', 'No hay adversarios que coincidan.', 'Aucun adversaire correspondant.', 'Nessun avversario corrispondente.', '一致する相手はいません。', '일치하는 상대가 없습니다.', 'Nenhum oponente correspondente.', '没有匹配的对手。'),
 'No CPU duels recorded yet.': ('Noch keine CPU-Duelle erfasst.', 'Aún no hay duelos contra la CPU registrados.', 'Aucun duel contre les CPU enregistré pour le moment.', 'Ancora nessun duello contro la CPU registrato.', 'CPUとのデュエルはまだ記録されていません。', '아직 기록된 CPU 듀얼이 없습니다.', 'Nenhum duelo contra a CPU registrado ainda.', '尚未记录与CPU的决斗。'),
 'Duels': ('Duelle', 'Duelos', 'Duels', 'Duelli', 'デュエル', '듀얼', 'Duelos', '决斗'),
 'CPU wins': ('CPU-Siege', 'Victorias de la CPU', 'Victoires du CPU', 'Vittorie CPU', 'CPUの勝利', 'CPU 승리', 'Vitórias da CPU', 'CPU胜'),
 'CPU losses': ('CPU-Niederlagen', 'Derrotas de la CPU', 'Défaites du CPU', 'Sconfitte CPU', 'CPUの敗北', 'CPU 패배', 'Derrotas da CPU', 'CPU负'),
 'CPU win rate': ('CPU-Siegquote', 'Porcentaje de victorias de la CPU', 'Taux de victoire du CPU', 'Percentuale di vittorie CPU', 'CPUの勝率', 'CPU 승률', 'Taxa de vitórias da CPU', 'CPU胜率'),
 'No duels against this CPU yet.': ('Noch keine Duelle gegen diese CPU.', 'Aún no hay duelos contra esta CPU.', 'Aucun duel contre ce CPU pour le moment.', 'Ancora nessun duello contro questa CPU.', 'このCPUとのデュエルはまだありません。', '아직 이 CPU와의 듀얼이 없습니다.', 'Nenhum duelo contra esta CPU ainda.', '尚无与该CPU的决斗。'),
 'No CPU duels for this duelist yet.': ('Noch keine CPU-Duelle mit diesem Duellanten.', 'Aún no hay duelos contra la CPU con este duelista.', 'Aucun duel contre les CPU avec ce duelliste pour le moment.', 'Ancora nessun duello contro la CPU con questo duellante.', 'このデュエリストのCPU戦はまだありません。', '이 듀얼리스트의 CPU 듀얼이 아직 없습니다.', 'Nenhum duelo contra a CPU com este duelista ainda.', '该决斗者尚无与CPU的决斗。'),
 'CPU stats are temporarily unavailable.': ('CPU-Statistiken sind vorübergehend nicht verfügbar.', 'Las estadísticas de la CPU no están disponibles por ahora.', 'Les statistiques des CPU sont temporairement indisponibles.', 'Le statistiche CPU sono temporaneamente non disponibili.', 'CPU統計は一時的に利用できません。', 'CPU 통계를 일시적으로 사용할 수 없습니다.', 'As estatísticas da CPU estão temporariamente indisponíveis.', 'CPU统计暂时不可用。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
