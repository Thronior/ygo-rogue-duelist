"""Stars Aligned (needs a monster in your GY) and Berserker's Pact (1 more attack than the card has) texts, changed by the
user on 2026-11-18, in all 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Once per turn, during your End Phase, if you have at least 1 monster in your GY and all monsters in your GY and on your field have the same Level: Special Summon 1 monster of that Level from your hand.': (
  'Einmal pro Spielzug, während deiner End Phase, falls du mindestens 1 Monster in deinem Friedhof hast und alle Monster in deinem Friedhof und auf deiner Spielfeldseite dieselbe Stufe haben: Beschwöre 1 Monster dieser Stufe von deiner Hand als Spezialbeschwörung.',
  'Una vez por turno, durante tu End Phase, si tienes al menos 1 monstruo en tu Cementerio y todos los monstruos en tu Cementerio y en tu Campo tienen el mismo Nivel: Invoca de Modo Especial, desde tu mano, 1 monstruo de ese Nivel.',
  'Une fois par tour, durant votre End Phase, si vous avez au moins 1 monstre dans votre Cimetière et que tous les monstres dans votre Cimetière et sur votre Terrain ont le même Niveau : Invoquez Spécialement 1 monstre de ce Niveau depuis votre main.',
  'Una volta per turno, durante la tua End Phase, se hai almeno 1 mostro nel tuo Cimitero e tutti i mostri nel tuo Cimitero e sul tuo Terreno hanno lo stesso Livello: Evoca Specialmente 1 mostro di quel Livello dalla tua mano.',
  '1ターンに1度、自分エンドフェイズに、自分の墓地にモンスターが1体以上存在し、自分の墓地と自分フィールドのモンスターが全て同じレベルの場合、そのレベルのモンスター1体を手札から特殊召喚する。',
  '1턴에 1번, 자신 엔드 페이즈에, 자신 묘지에 몬스터가 1장 이상 존재하고, 자신의 묘지와 자신 필드의 몬스터가 전부 같은 레벨일 경우, 그 레벨의 몬스터 1장을 패에서 특수 소환한다.',
  'Uma vez por turno, durante sua Fase Final, se você tiver pelo menos 1 monstro no seu Cemitério e todos os monstros no seu Cemitério e no seu campo tiverem o mesmo Nível: Invoque por Invocação-Especial 1 monstro desse Nível da sua mão.',
  '1回合1次，自己结束阶段，自己墓地有怪兽存在，且自己墓地和自己场上的怪兽全部是相同等级的场合，从手卡把1只那个等级的怪兽特殊召唤。'),
 'Monsters you control can make 1 more attack during each Battle Phase than they otherwise could. You cannot Set monsters or Special Summon them in Defense Position.': (
  'Alle Monster, die du kontrollierst, können während jeder Battle Phase 1 Angriff mehr durchführen, als sie sonst könnten. Du kannst keine Monster setzen oder als Spezialbeschwörung in die Verteidigungsposition beschwören.',
  'Los monstruos que controles pueden hacer 1 ataque más durante cada Battle Phase de los que podrían hacer normalmente. No puedes Colocar monstruos ni Invocarlos de Modo Especial en Posición de Defensa.',
  "Les monstres que vous contrôlez peuvent effectuer 1 attaque de plus durant chaque Battle Phase qu'ils ne le pourraient autrement. Vous ne pouvez pas Poser de monstres ni les Invoquer Spécialement en Position de Défense.",
  'I mostri che controlli possono effettuare 1 attacco in più durante ogni Battle Phase rispetto a quanto potrebbero normalmente. Non puoi Posizionare mostri o Evocarli Specialmente in Posizione di Difesa.',
  '自分フィールドのモンスターは、1度のバトルフェイズ中に本来の攻撃回数より1回多く攻撃できる。自分はモンスターをセットできず、守備表示で特殊召喚できない。',
  '자신 필드의 몬스터는 각 배틀 페이즈 중에 원래 공격할 수 있는 횟수보다 1번 더 공격할 수 있다. 자신은 몬스터를 세트하거나 수비 표시로 특수 소환할 수 없다.',
  'Os monstros que você controla podem realizar 1 ataque a mais durante cada Fase de Batalha do que poderiam normalmente. Você não pode Baixar monstros nem Invocá-los por Invocação-Especial em Posição de Defesa.',
  '①：自己场上的怪兽在每次战斗阶段中可以比原本多作1次攻击。②：自己不能盖放怪兽，也不能把怪兽守备表示特殊召唤。'),
 # Duelist's Catalogue is no longer rarer than other relics (user, 2026-11-18): its last sentence is gone.
 'Character draft packs can appear in the random booster slots on shop visits and rerolls.': (
  'Charakter-Draft-Booster können bei Shop-Besuchen und Aktualisierungen in den zufälligen Booster-Plätzen erscheinen.',
  'Los sobres de draft de personaje pueden aparecer en las casillas de sobres aleatorios en las visitas a la tienda y en las renovaciones.',
  'Les boosters de draft des personnages peuvent apparaître dans les emplacements de boosters aléatoires lors des visites de boutique et des relances.',
  'Le buste draft dei personaggi possono apparire negli slot delle buste casuali nelle visite al negozio e nei cambi.',
  'ショップの来店時とリロール時に、ランダムなブースター枠にキャラクタードラフトパックが並ぶことがある。',
  '상점 방문 및 리롤 시 무작위 부스터 칸에 캐릭터 드래프트 팩이 나올 수 있다.',
  'Pacotes de draft de personagens podem aparecer nos espaços de pacotes aleatórios nas visitas à loja e nas atualizações.',
  '进入商店和刷新时，角色轮抽补充包可能出现在随机补充包栏位中。'),
 # Ryou Bakura's Fortune's Favorite (user, 2026-11-18), on the character select.
 'Start with 4 copies of one random character pack and a relic for an archetype in that pack.': (
  'Starte mit 4 Exemplaren eines zufälligen Charakter-Boosters und einem Relikt für einen Archetyp aus diesem Booster.',
  'Empieza con 4 copias de un sobre de personaje aleatorio y una reliquia de un arquetipo de ese sobre.',
  "Commencez avec 4 exemplaires d'un booster de personnage aléatoire et une relique pour un archétype de ce booster.",
  'Inizia con 4 copie di una busta personaggio casuale e una reliquia per un archetipo di quella busta.',
  'ランダムなキャラクターパック1種を4つと、そのパックにあるアーキタイプのレリックで始める。',
  '무작위 캐릭터 팩 1종 4개와 그 팩에 있는 아키타입의 유물로 시작한다.',
  'Comece com 4 cópias de um pacote de personagem aleatório e uma relíquia de um arquétipo desse pacote.',
  '以随机1种角色补充包×4和该补充包中某个系列的遗物开始。'),
 # New run slot window title, shortened so it fits on phones (user, 2026-11-18).
 'Choose a save slot': ('Wähle einen Speicherplatz', 'Elige una ranura de guardado', 'Choisissez un emplacement de sauvegarde',
  'Scegli uno slot di salvataggio', 'セーブスロットを選択', '저장 슬롯을 고르세요', 'Escolha um espaço de salvamento', '选择一个存档位'),
 # The shopkeeper's secret duel opponent (user, 2026-11-18).
 'Angry Grandpa': ('Wütender Opa', 'Abuelo furioso', 'Grand-père en colère', 'Nonno arrabbiato', '怒れるじいちゃん', '화난 할아버지',
  'Vovô furioso', '愤怒的爷爷'),
 # Victory coin line: a Final Countdown win tops the duel's coins up to 300 (official card names per language).
 'Final Countdown win': ('Sieg durch Letzter Countdown', 'Victoria por Cuenta Atrás Final', 'Victoire par Compte à Rebours Final',
  'Vittoria con Conto alla Rovescia', '終焉のカウントダウンで勝利', '종언의 카운트 다운 승리', 'Vitória por Contagem Final', '终焉的倒计时胜利'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': 'relic text changed 2026-11-18'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
