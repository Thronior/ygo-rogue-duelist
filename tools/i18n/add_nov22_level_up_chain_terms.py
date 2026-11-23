"""Level Up Chain (fused relic) had no translations; its text now says the opponent's monster effects (user,
2026-11-22). Name and text in all 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Level Up Chain': ('Aufstiegskette', 'Cadena de Nivel', 'Chaîne de Niveau', 'Catena di Livello', 'レベルアップ・チェーン', '레벨 업 체인', 'Corrente de Nível', '等级上升连锁'),
 'Start each Duel with a random Level 1–4 LV monster from your Deck and a copy of "Level Up!" in your hand. Your LV monsters gain 500 ATK and are unaffected by your opponent\'s monster effects.': (
  'Beginne jedes Duell mit einem zufälligen LV-Monster der Stufe 1–4 aus deinem Deck und einer Kopie von „Aufgestiegen!“ auf deiner Hand. Deine LV-Monster erhalten 500 ATK und werden von den Monstereffekten deines Gegners nicht betroffen.',
  'Empieza cada Duelo con un monstruo LV aleatorio de Nivel 1–4 de tu Deck y una copia de "¡Nivel Arriba!" en tu mano. Tus monstruos LV ganan 500 ATK y no son afectados por los efectos de monstruo de tu adversario.',
  "Commence chaque Duel avec un monstre LV aléatoire de Niveau 1–4 de ton Deck et un exemplaire de « Montée de Niveau ! » dans ta main. Tes monstres LV gagnent 500 ATK et ne sont pas affectés par les effets de monstre de ton adversaire.",
  'Inizia ogni Duello con un mostro LV casuale di Livello 1–4 dal tuo Deck e una copia di "Livello Superiore!" nella tua mano. I tuoi mostri LV guadagnano 500 ATK e non sono influenzati dagli effetti dei mostri del tuo avversario.',
  'デュエル開始時、デッキからランダムなレベル1～4の「LV」モンスター1体と「レベルアップ！」1枚を手札に加える。自分の「LV」モンスターの攻撃力は500アップし、相手のモンスターの効果を受けない。',
  '듀얼 시작 시 덱에서 무작위 레벨 1~4 "LV" 몬스터 1장과 "레벨 업!" 1장을 패에 넣는다. 자신의 "LV" 몬스터는 공격력이 500 올라가며, 상대 몬스터의 효과를 받지 않는다.',
  'Comece cada Duelo com um monstro LV aleatório de Nível 1–4 do seu Deck e uma cópia de "Subida de Nível!" na sua mão. Seus monstros LV ganham 500 de ATK e não são afetados pelos efeitos de monstro do seu oponente.',
  '每场决斗开始时，从卡组将1只随机的1～4星"LV"怪兽和1张"等级上升！"加入手卡。自己的"LV"怪兽攻击力上升500，不受对方怪兽的效果影响。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
