# Terminology review, 2026-11-09

Every language was checked against the words players see in official Yu-Gi-Oh! localizations and in big games. The glossary in `TERMS.md` now holds the chosen word for each term. Its sources are recorded in `data/i18n/glossary/<lang>.json` (`evidence`).

## Sources

- **Yu-Gi-Oh! terms:**
  - Konami's card database (db.yugioh-card.com with `request_locale`).
  - Konami's localized rules pages.
  - The Master Duel sites and its Steam page.
- **Genre terms:**
  - Official localizations of Balatro (voucher names on balatrowiki.org).
  - Slay the Spire, Hades and Monster Train Steam pages in each language.
  - TFT and VALORANT patch notes in each locale.
  - Hearthstone card text.
- **Platform terms:** Steam, Google Play Games and Xbox. This is an Android and web game, so Google Play's wording wins where it differs from Steam.

## Changed

| Lang | Term | Old → new | Why |
|---|---|---|---|
| de | Reroll | Neu würfeln / Neuwurf → Aktualisieren / Aktualisierung | Balatro DE "Aktualisierungsüberschuss"; Hearthstone DE "aktualisiert Bobs Gasthaus" |
| it | Reroll | Rinnova / rinnovo → Cambia / cambio | Balatro IT "Cambi in surplus" |
| pt | Reroll | Renovar / renovação → Atualizar / atualização | Balatro PT-BR "Excesso de Atualizações"; TFT PT-BR "atualização" |
| ko | Relic | 렐릭 → 유물 (also cursed, fused and starting relics) | Slay the Spire KR: '유물'이라고 불리는 강력한 물건들 |
| es | Tag Duel | Duelo en Pareja → Duelo Tag | Konami ES keeps "Tag Dueling"; matches de and it |
| fr | Tag Duel | Duel en Équipe → Duel Tag | Konami FR keeps "Tag Dueling" |
| pt | Tag Duel | Duelo em Dupla → Duelo Tag | Konami PT-BR: "Regras de Tag Dueling" |
| fr | Lock in | Valider → Verrouiller | VALORANT FR "verrouillé votre agent"; the unlock button already said Déverrouiller |
| it, pt | Lock in | Blocca / Trave / travada, mixed with Conferma / Confirmar → always Conferma / Confirmar | One word per language |
| es, it, pt, ja, ko | Undo lock-in | Desbloquear, Sblocca, Desbloquear, 選択を解除, 선택 잠금 해제 → Cancelar confirmación, Annulla conferma, Cancelar confirmação, 確定を取り消す, 확정 취소 | Pairs with the lock-in word |
| de, fr, ja, ko | Loadout | Ausrüstung, configuration, 構成, 로드아웃 → the Variant word (Variante, バリアント, 변형) | The game calls the second loadout a variant everywhere else |

## Fixed (wrong text, not wording)

**zh:** 33 engine strings had been copied from EDOPro's Chinese strings.conf, whose IDs are shifted. Examples:

- "Add the card(s) to your hand" showed 请选择要无效的卡.
- "Send to Hand" showed 返回卡组.
- All the effect-category filters (怪兽破坏, 除外, 贯穿伤害…) were off by one or more rows.

The "Tag" label showed full-width ＴＡＧ and now shows 双打.

## Checked and kept

- **de:**
  - Erfolge: Google Play Games and Xbox DE; Steam says Errungenschaften.
  - Shop, Durchlauf (Balatro DE), Boss, Booster.
- **es:** Renovar (Balatro ES "renovaciones"), Partida (Balatro ES), Jefe, Tienda, Logros, Sobre (Konami ES "Sobres de Cartas").
- **fr:** Relancer (TFT FR "relance"), Partie, Boutique, Succès, Booster, Boss.
- **it:**
  - Partita.
  - Obiettivi: Google Play IT.
  - Negozio, Boss.
  - Busta: Konami IT "Buste da Torneo".
- **pt:**
  - Jornada. Partida already means a match in Ultimate Collector. Monster Train uses partida and Slay the Spire uses tentativa.
  - Loja, Conquistas, Chefe.
  - Pacote: Konami PT-BR "Pacotes".
  - PV: official card text "Pague 500 PV".
- **ja:** リロール (Balatro and TFT JA), ラン (Balatro JA), レリック, ショップ, 実績, 解放.
- **ko:**
  - 리롤 (Balatro and TFT KR).
  - 런. Slay the Spire KR uses 도전, but 도전 레벨 is already Challenge Level here.
  - 업적: Google Play KR; Steam says 도전 과제.
  - 상점, 해금.
- **zh:**
  - 刷新 (Hearthstone CN).
  - 遗物 (Slay the Spire CN).
  - 首领 (Monster Train CN).
  - 手卡, 卡组, 基本分: official card-text convention.
  - 冒险 and 双打决斗 are unconfirmed but have no better-attested alternative.
