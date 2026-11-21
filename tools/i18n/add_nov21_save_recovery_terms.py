"""The web build's "Progress could not be saved" window (tools/pwa/pwa-storage.js), in all 8 languages. It showed in
English, with its "Your latest progress..." line half caught by the "Your {0}" pattern ("La tua zona: latest
progress...", Discord, yagura99, 2026-11-21). Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Progress could not be saved': ('Fortschritt konnte nicht gespeichert werden', 'No se pudo guardar el progreso', "La progression n'a pas pu être sauvegardée", 'Impossibile salvare i progressi', '進行状況を保存できませんでした', '진행 상황을 저장하지 못했습니다', 'Não foi possível salvar o progresso', '无法保存进度'),
 'Your latest progress is still in this window. Export a backup before closing it. Your previous saved progress has not been replaced.': (
  'Dein neuester Fortschritt ist noch in diesem Fenster. Exportiere eine Sicherung, bevor du es schließt. Dein zuvor gespeicherter Fortschritt wurde nicht ersetzt.',
  'Tu progreso más reciente sigue en esta ventana. Exporta una copia de seguridad antes de cerrarla. Tu progreso guardado anterior no se ha reemplazado.',
  "Ta dernière progression est encore dans cette fenêtre. Exporte une sauvegarde avant de la fermer. Ta progression enregistrée précédente n'a pas été remplacée.",
  'I tuoi ultimi progressi sono ancora in questa finestra. Esporta un backup prima di chiuderla. I progressi salvati in precedenza non sono stati sostituiti.',
  '最新の進行状況はまだこのウィンドウにあります。閉じる前にバックアップをエクスポートしてください。以前に保存した進行状況は置き換えられていません。',
  '최신 진행 상황은 아직 이 창에 있습니다. 창을 닫기 전에 백업을 내보내세요. 이전에 저장된 진행 상황은 바뀌지 않았습니다.',
  'Seu progresso mais recente ainda está nesta janela. Exporte um backup antes de fechá-la. Seu progresso salvo anterior não foi substituído.',
  '你的最新进度仍在此窗口中。关闭前请导出备份。之前保存的进度没有被覆盖。'),
 'Export current progress': ('Aktuellen Fortschritt exportieren', 'Exportar el progreso actual', 'Exporter la progression actuelle', 'Esporta i progressi attuali', '現在の進行状況をエクスポート', '현재 진행 상황 내보내기', 'Exportar o progresso atual', '导出当前进度'),
 'Retry saving': ('Erneut speichern', 'Reintentar guardar', 'Réessayer la sauvegarde', 'Riprova a salvare', '保存を再試行', '다시 저장', 'Tentar salvar novamente', '重试保存'),
 'There is not enough browser storage to save your progress. Free some device space, then retry. Do not clear site data without exporting your save.': (
  'Der Browser-Speicher reicht nicht aus, um deinen Fortschritt zu speichern. Gib etwas Speicherplatz auf dem Gerät frei und versuche es erneut. Lösche keine Websitedaten, ohne deinen Spielstand zu exportieren.',
  'No hay suficiente almacenamiento del navegador para guardar tu progreso. Libera espacio en el dispositivo y vuelve a intentarlo. No borres los datos del sitio sin exportar tu partida.',
  "Le stockage du navigateur est insuffisant pour sauvegarder ta progression. Libère de l'espace sur l'appareil, puis réessaie. N'efface pas les données du site sans exporter ta sauvegarde.",
  'Lo spazio di archiviazione del browser non basta per salvare i progressi. Libera spazio sul dispositivo, poi riprova. Non cancellare i dati del sito senza aver esportato il salvataggio.',
  '進行状況を保存するためのブラウザーのストレージが足りません。端末の空き容量を増やしてから再試行してください。セーブをエクスポートせずにサイトデータを消去しないでください。',
  '진행 상황을 저장할 브라우저 저장 공간이 부족합니다. 기기 공간을 확보한 뒤 다시 시도하세요. 저장 데이터를 내보내기 전에는 사이트 데이터를 지우지 마세요.',
  'Não há armazenamento suficiente no navegador para salvar seu progresso. Libere espaço no dispositivo e tente novamente. Não apague os dados do site sem exportar seu save.',
  '浏览器存储空间不足，无法保存进度。请释放一些设备空间后重试。在导出存档之前不要清除网站数据。'),
 'Browser storage is unavailable. Check your browser storage permissions, then retry.': (
  'Der Browser-Speicher ist nicht verfügbar. Prüfe die Speicherberechtigungen deines Browsers und versuche es erneut.',
  'El almacenamiento del navegador no está disponible. Revisa los permisos de almacenamiento del navegador y vuelve a intentarlo.',
  "Le stockage du navigateur n'est pas disponible. Vérifie les autorisations de stockage de ton navigateur, puis réessaie.",
  'Lo spazio di archiviazione del browser non è disponibile. Controlla i permessi di archiviazione del browser, poi riprova.',
  'ブラウザーのストレージを利用できません。ブラウザーのストレージの許可を確認してから再試行してください。',
  '브라우저 저장 공간을 사용할 수 없습니다. 브라우저 저장 권한을 확인한 뒤 다시 시도하세요.',
  'O armazenamento do navegador não está disponível. Verifique as permissões de armazenamento do navegador e tente novamente.',
  '浏览器存储不可用。请检查浏览器的存储权限后重试。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
