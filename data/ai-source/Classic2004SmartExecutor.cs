using System;
using System.Collections.Generic;
using System.Linq;
using WindBot;
using WindBot.Game;
using WindBot.Game.AI;
using YGOSharp.OCGWrapper.Enums;

namespace WindBot.Game.AI.Decks
{
    [Deck("Classic2004Smart", "AI_Classic2004Smart", "Hard")]
    public class Classic2004SmartExecutor : DefaultExecutor
    {
        public class CardId
        {
            // Monsters
            public const int BlackLusterSoldier = 72989439;
            public const int Jinzo = 77585513;
            public const int AirknightParshath = 18036057;
            public const int BreakerTheMagicalWarrior = 71413901;
            public const int DDWarriorLady = 7572887;
            public const int KycooTheGhostDestroyer = 88240808;
            public const int BerserkGorilla = 39168895;
            public const int Sangan = 26202165;
            public const int WitchOfTheBlackForest = 78010363;
            public const int SinisterSerpent = 8131171;
            public const int MagicianOfFaith = 31560081;
            public const int SpiritReaper = 23205979;
            public const int Tsukuyomi = 34853266;

            // Spells
            public const int PotOfGreed = 55144522;
            public const int GracefulCharity = 79571449;
            public const int DelinquentDuo = 44763025;
            public const int TheForcefulSentry = 42829885;
            public const int Confiscation = 17375316;
            public const int ChangeOfHeart = 4031928;
            public const int SnatchSteal = 45986603;
            public const int MonsterReborn = 83764718;
            public const int PrematureBurial = 70828912;
            public const int HarpiesFeatherDuster = 18144506;
            public const int HeavyStorm = 19613556;
            public const int MysticalSpaceTyphoon = 5318639;
            public const int DarkHole = 53129443;
            public const int Raigeki = 12580477;
            public const int BookOfMoon = 14087893;

            // Traps
            public const int MirrorForce = 44095762;
            public const int TorrentialTribute = 53582587;
            public const int RingOfDestruction = 83555666;
            public const int CallOfTheHaunted = 97077563;
            public const int SolemnJudgment = 41420027;
        }

        public Classic2004SmartExecutor(GameAI ai, Duel duel)
            : base(ai, duel)
        {
            // Reactive / defensive cards first.
            AddExecutor(ExecutorType.Activate, CardId.SolemnJudgment, SmartSolemnJudgment);
            AddExecutor(ExecutorType.Activate, CardId.MirrorForce, SmartMirrorForce);
            AddExecutor(ExecutorType.Activate, CardId.TorrentialTribute, SmartTorrentialTribute);
            AddExecutor(ExecutorType.Activate, CardId.RingOfDestruction, SmartRingOfDestruction);
            AddExecutor(ExecutorType.Activate, CardId.BookOfMoon, SmartBookOfMoon);
            AddExecutor(ExecutorType.Activate, CardId.CallOfTheHaunted, SmartCallOfTheHaunted);
            AddExecutor(ExecutorType.Activate, CardId.MysticalSpaceTyphoon, DefaultMysticalSpaceTyphoon);

            // High-value power spells.
            AddExecutor(ExecutorType.Activate, CardId.HarpiesFeatherDuster, SmartFeatherDuster);
            AddExecutor(ExecutorType.Activate, CardId.HeavyStorm, SmartHeavyStorm);
            AddExecutor(ExecutorType.Activate, CardId.Raigeki, SmartRaigeki);
            AddExecutor(ExecutorType.Activate, CardId.DarkHole, SmartDarkHole);
            AddExecutor(ExecutorType.Activate, CardId.ChangeOfHeart, SmartChangeOfHeart);
            AddExecutor(ExecutorType.Activate, CardId.SnatchSteal, SmartSnatchSteal);
            AddExecutor(ExecutorType.Activate, CardId.MonsterReborn, SmartMonsterReborn);
            AddExecutor(ExecutorType.Activate, CardId.PrematureBurial, SmartPrematureBurial);

            // Draw / hand disruption.
            AddExecutor(ExecutorType.Activate, CardId.PotOfGreed, SafeFreeSpell);
            AddExecutor(ExecutorType.Activate, CardId.GracefulCharity, SafeFreeSpell);
            AddExecutor(ExecutorType.Activate, CardId.DelinquentDuo, SmartDelinquentDuo);
            AddExecutor(ExecutorType.Activate, CardId.TheForcefulSentry, SafeFreeSpell);
            AddExecutor(ExecutorType.Activate, CardId.Confiscation, SmartConfiscation);

            // Monster effects.
            AddExecutor(ExecutorType.Activate, CardId.BlackLusterSoldier, SmartBLSEffect);
            AddExecutor(ExecutorType.Activate, CardId.BreakerTheMagicalWarrior, SmartBreakerEffect);
            AddExecutor(ExecutorType.Activate, CardId.DDWarriorLady, SmartDDWarriorLadyEffect);
            AddExecutor(ExecutorType.Activate, CardId.KycooTheGhostDestroyer, SmartKycooEffect);
            AddExecutor(ExecutorType.Activate, CardId.MagicianOfFaith, SafeMonsterEffect);
            AddExecutor(ExecutorType.Activate, CardId.SinisterSerpent, SafeMonsterEffect);
            AddExecutor(ExecutorType.Activate, CardId.Tsukuyomi, SmartTsukuyomiEffect);

            // Special summon BLS whenever it meaningfully improves the board.
            AddExecutor(ExecutorType.SpSummon, CardId.BlackLusterSoldier, SmartBLSSummon);

            // Generic normal summon/set logic for the whole vintage deck.
            AddExecutor(ExecutorType.SummonOrSet, SmartSummonOrSet);
            AddExecutor(ExecutorType.Repos, DefaultMonsterRepos);
            AddExecutor(ExecutorType.SpellSet, DefaultSpellSet);
        }

        private bool SafeFreeSpell()
        {
            return !DefaultSpellWillBeNegated();
        }

        private bool SafeMonsterEffect()
        {
            return !DefaultCheckWhetherCardIsNegated(Card);
        }

        private bool SmartDelinquentDuo()
        {
            if (DefaultSpellWillBeNegated()) return false;
            return Bot.LifePoints > 1000 && Enemy.Hand.Count >= 2;
        }

        private bool SmartConfiscation()
        {
            if (DefaultSpellWillBeNegated()) return false;
            return Bot.LifePoints > 1000 && Enemy.Hand.Count > 0;
        }

        private bool SmartBLSSummon()
        {
            // The simulator already filters whether BLS is legally summonable.
            // Avoid needlessly exposing it when an existing board already has easy lethal.
            int currentAttack = 0;
            foreach (ClientCard monster in Bot.GetMonsters())
            {
                if (monster.IsFaceup() && monster.IsAttack())
                    currentAttack += Math.Max(0, monster.Attack);
            }
            if (Enemy.GetMonsters().Count == 0 && currentAttack >= Enemy.LifePoints)
                return false;
            return true;
        }

        private bool SmartBLSEffect()
        {
            if (DefaultCheckWhetherCardIsNegated(Card)) return false;

            // The second-attack trigger is nearly always worth taking.
            if (Duel.Phase == DuelPhase.BattleStep || Duel.Phase == DuelPhase.Damage ||
                Duel.Phase == DuelPhase.DamageCal || Duel.Phase == DuelPhase.Battle)
                return true;

            // In Main Phase, only spend BLS's attack to banish a monster that is
            // genuinely troublesome or cannot be cleanly beaten in battle.
            ClientCard target = GetBestEnemyMonster();
            if (target == null) return false;

            int targetPower = Math.Max(Math.Max(0, target.Attack), Math.Max(0, target.Defense));
            bool problematic = ThreatScore(target) >= 3600;
            bool tooLarge = targetPower >= Card.Attack;
            bool lethalWithoutEffect = Enemy.GetMonsters().Count == 0 && Card.Attack >= Enemy.LifePoints;
            if (lethalWithoutEffect) return false;

            if (problematic || tooLarge)
            {
                AI.SelectCard(target);
                return true;
            }
            return false;
        }

        private bool SmartBreakerEffect()
        {
            if (DefaultCheckWhetherCardIsNegated(Card)) return false;
            List<ClientCard> spells = Enemy.GetSpells();
            if (spells.Count == 0) return false;

            ClientCard target = spells
                .OrderByDescending(c => SpellTrapThreatScore(c))
                .FirstOrDefault();
            if (target == null) return false;
            AI.SelectCard(target);
            return true;
        }

        private bool SmartDDWarriorLadyEffect()
        {
            if (DefaultCheckWhetherCardIsNegated(Card)) return false;
            ClientCard enemy = Enemy.BattlingMonster;
            if (enemy == null) return false;

            // Trade D.D. Warrior Lady for anything that is meaningfully more valuable,
            // or for anything she could not otherwise remove cleanly.
            int enemyPower = Math.Max(Math.Max(0, enemy.Attack), Math.Max(0, enemy.Defense));
            return ThreatScore(enemy) >= 3300 || enemyPower >= 1800;
        }

        private bool SmartKycooEffect()
        {
            if (DefaultCheckWhetherCardIsNegated(Card)) return false;
            return Enemy.Graveyard.Any(c => c.IsMonster());
        }

        private bool SmartTsukuyomiEffect()
        {
            if (DefaultCheckWhetherCardIsNegated(Card)) return false;

            // Re-use Magician of Faith when possible.
            ClientCard faith = Bot.GetMonsters()
                .FirstOrDefault(c => c.IsFaceup() && c.IsCode(CardId.MagicianOfFaith));
            if (faith != null)
            {
                AI.SelectCard(faith);
                return true;
            }

            ClientCard enemy = Enemy.GetMonsters()
                .Where(c => c.IsFaceup())
                .OrderByDescending(c => ThreatScore(c))
                .FirstOrDefault();
            if (enemy != null)
            {
                AI.SelectCard(enemy);
                return true;
            }
            return false;
        }

        private bool SmartChangeOfHeart()
        {
            if (DefaultSpellWillBeNegated()) return false;
            ClientCard target = GetBestEnemyMonster();
            if (target == null) return false;
            AI.SelectCard(target);
            return true;
        }

        private bool SmartSnatchSteal()
        {
            if (DefaultSpellWillBeNegated()) return false;
            ClientCard target = GetBestEnemyMonster();
            if (target == null) return false;
            AI.SelectCard(target);
            return true;
        }

        private bool SmartMonsterReborn()
        {
            if (DefaultSpellWillBeNegated()) return false;

            ClientCard selected = Bot.Graveyard
                .Concat(Enemy.Graveyard)
                .Where(c => c.IsMonster() && c.IsCanRevive())
                .OrderByDescending(c => MonsterValue(c))
                .FirstOrDefault();
            if (selected == null) return false;

            AI.SelectCard(selected);
            return true;
        }

        private bool SmartPrematureBurial()
        {
            if (DefaultSpellWillBeNegated()) return false;
            if (Bot.LifePoints <= 800) return false;

            ClientCard selected = Bot.Graveyard
                .Where(c => c.IsMonster() && c.IsCanRevive())
                .OrderByDescending(c => MonsterValue(c))
                .FirstOrDefault();
            if (selected == null || MonsterValue(selected) < 2600) return false;

            AI.SelectCard(selected);
            return true;
        }

        private bool SmartFeatherDuster()
        {
            if (DefaultSpellWillBeNegated()) return false;
            List<ClientCard> spells = Enemy.GetSpells();
            if (spells.Count == 0) return false;
            if (spells.Count >= 2) return true;
            return spells.Any(c => c.IsFaceup() && SpellTrapThreatScore(c) >= 3200);
        }

        private bool SmartHeavyStorm()
        {
            if (DefaultSpellWillBeNegated()) return false;
            int enemyCount = Enemy.GetSpellCount();
            int ourCount = Bot.GetSpellCount();
            if (enemyCount == 0) return false;
            if (enemyCount >= ourCount + 2) return true;
            return enemyCount > ourCount && Enemy.GetSpells().Any(c => c.IsFaceup());
        }

        private bool SmartRaigeki()
        {
            if (DefaultSpellWillBeNegated()) return false;
            List<ClientCard> monsters = Enemy.GetMonsters();
            if (monsters.Count == 0) return false;
            if (monsters.Count >= 2) return true;
            return ThreatScore(monsters[0]) >= 3200 || Util.IsOneEnemyBetter();
        }

        private bool SmartDarkHole()
        {
            if (DefaultSpellWillBeNegated()) return false;
            if (Enemy.GetMonsters().Count == 0) return false;

            int enemyValue = Enemy.GetMonsters().Sum(c => MonsterValue(c));
            int ourValue = Bot.GetMonsters().Sum(c => MonsterValue(c));

            // Reset when behind, or when the opponent's single threat is overwhelming.
            if (enemyValue > ourValue + 1800) return true;
            if (Enemy.GetMonsters().Any(c => ThreatScore(c) >= 4200) && enemyValue >= ourValue)
                return true;
            return false;
        }

        private bool SmartBookOfMoon()
        {
            if (DefaultSpellWillBeNegated()) return false;

            // Save an important monster if this Book is being used reactively.
            if (Duel.Player == 1 && Bot.BattlingMonster != null && Enemy.BattlingMonster != null)
            {
                if (Enemy.BattlingMonster.Attack >= Bot.BattlingMonster.Attack && Bot.BattlingMonster.IsFaceup())
                {
                    AI.SelectCard(Enemy.BattlingMonster);
                    return true;
                }
            }

            ClientCard threat = Enemy.GetMonsters()
                .Where(c => c.IsFaceup() && !c.HasType(CardType.Link))
                .OrderByDescending(c => ThreatScore(c))
                .FirstOrDefault();
            if (threat != null && ThreatScore(threat) >= 3400)
            {
                AI.SelectCard(threat);
                return true;
            }
            return false;
        }

        private bool SmartCallOfTheHaunted()
        {
            if (DefaultTrapWillBeNegated()) return false;

            ClientCard selected = Bot.Graveyard
                .Where(c => c.IsMonster() && c.IsCanRevive())
                .OrderByDescending(c => MonsterValue(c))
                .FirstOrDefault();
            if (selected == null) return false;

            bool threatened = Duel.Player == 1 &&
                (Util.GetTotalAttackingMonsterAttack(1) >= Bot.LifePoints || Util.IsAllEnemyBetter(true));
            bool endPhaseValue = Duel.Player == 1 && Duel.Phase == DuelPhase.End && MonsterValue(selected) >= 3000;
            if (!threatened && !endPhaseValue) return false;

            AI.SelectCard(selected);
            return true;
        }

        private bool SmartMirrorForce()
        {
            if (DefaultTrapWillBeNegated()) return false;
            if (Duel.Player != 1) return false;

            List<ClientCard> attackers = Enemy.GetMonsters().Where(c => c.IsFaceup() && c.IsAttack()).ToList();
            if (attackers.Count == 0) return false;

            int totalAttack = attackers.Sum(c => Math.Max(0, c.Attack));
            int totalThreat = attackers.Sum(c => ThreatScore(c));
            if (totalAttack >= Bot.LifePoints) return true;
            if (attackers.Count >= 2) return true;
            return totalThreat >= 3400 || attackers[0].Attack >= 1900;
        }

        private bool SmartTorrentialTribute()
        {
            if (DefaultTrapWillBeNegated()) return false;
            if (Duel.LastSummonPlayer != 1) return false;

            int enemyValue = Enemy.GetMonsters().Sum(c => MonsterValue(c));
            int ourValue = Bot.GetMonsters().Sum(c => MonsterValue(c));
            if (Enemy.GetMonsters().Count >= 2 && enemyValue >= ourValue) return true;
            if (Enemy.GetMonsters().Any(c => ThreatScore(c) >= 4100) && enemyValue >= ourValue - 500)
                return true;
            return false;
        }

        private bool SmartRingOfDestruction()
        {
            if (DefaultTrapWillBeNegated()) return false;

            ClientCard target = Enemy.GetMonsters()
                .Where(c => c.IsFaceup() && c.Attack > 0 && c.Attack < Bot.LifePoints && c.Attack <= Enemy.LifePoints)
                .OrderByDescending(c => c.Attack)
                .FirstOrDefault();
            if (target == null) return false;

            bool wins = target.Attack >= Enemy.LifePoints;
            bool emergency = Duel.Player == 1 && Util.GetTotalAttackingMonsterAttack(1) >= Bot.LifePoints;
            bool highValue = ThreatScore(target) >= 3700;
            if (wins || emergency || highValue)
            {
                AI.SelectCard(target);
                return true;
            }
            return false;
        }

        private bool SmartSolemnJudgment()
        {
            if (DefaultTrapWillBeNegated()) return false;
            if (!DefaultSolemnJudgment()) return false;

            // Preserve LP when the threat is minor. Use Solemn aggressively when the
            // incoming play is large, when lethal is plausible, or while comfortably healthy.
            if (Bot.LifePoints > 4000) return true;

            if (Duel.SummoningCards != null && Duel.SummoningCards.Any(c => ThreatScore(c) >= 3800))
                return true;

            ClientCard last = Util.GetLastChainCard();
            if (last != null && last.Controller == 1)
            {
                if (last.IsMonster() && ThreatScore(last) >= 3800) return true;
                if ((last.IsSpell() || last.IsTrap()) && SpellTrapThreatScore(last) >= 3500) return true;
            }
            return Bot.LifePoints > 2000 && Util.GetTotalAttackingMonsterAttack(1) >= Bot.LifePoints;
        }

        private bool SmartSummonOrSet()
        {
            if (Card == null || !Card.IsMonster()) return false;

            if (Card.Level <= 4)
            {
                List<ClientCard> normalCandidates = Bot.Hand
                    .Where(c => c.IsMonster() && c.Level <= 4)
                    .OrderByDescending(c => NormalSummonScore(c))
                    .ToList();

                if (normalCandidates.Count == 0) return false;
                return normalCandidates[0].IsCode(Card.Id);
            }

            // Never try to Normal Summon BLS. For tribute monsters, rely on the base
            // value check, but choose Jinzo over Airknight against meaningful backrow.
            if (Card.IsCode(CardId.BlackLusterSoldier)) return false;

            if (Card.IsCode(CardId.Jinzo) || Card.IsCode(CardId.AirknightParshath))
            {
                int jinzoScore = Enemy.GetSpellCount() > 0 ? 9000 : 6500;
                int airknightScore = Enemy.GetMonsters().Any(c => c.IsDefense()) ? 7800 : 6400;
                int thisScore = Card.IsCode(CardId.Jinzo) ? jinzoScore : airknightScore;

                ClientCard other = Bot.Hand.FirstOrDefault(c =>
                    c.IsMonster() && c.Level > 4 && !c.IsCode(CardId.BlackLusterSoldier) && !c.IsCode(Card.Id));
                if (other != null)
                {
                    int otherScore = other.IsCode(CardId.Jinzo) ? jinzoScore :
                        (other.IsCode(CardId.AirknightParshath) ? airknightScore : MonsterValue(other));
                    if (otherScore > thisScore) return false;
                }
                return DefaultMonsterSummon();
            }
            return false;
        }

        public override bool OnSelectMonsterSummonOrSet(ClientCard card)
        {
            if (card == null) return false;

            if (card.IsCode(CardId.MagicianOfFaith)) return true;
            if (card.IsCode(CardId.SpiritReaper) && Util.IsAllEnemyBetterThanValue(card.Attack, true)) return true;
            if ((card.IsCode(CardId.Sangan) || card.IsCode(CardId.WitchOfTheBlackForest)) &&
                Util.IsAllEnemyBetterThanValue(card.Attack, true)) return true;

            return base.OnSelectMonsterSummonOrSet(card);
        }

        public override IList<ClientCard> OnSelectCard(IList<ClientCard> cards, int min, int max, long hint, bool cancelable)
        {
            if (AI.HaveSelectedCards()) return null;

            IList<ClientCard> baseSelection = base.OnSelectCard(cards, min, max, hint, cancelable);
            if (baseSelection != null) return baseSelection;

            if (cards == null || cards.Count == 0) return new List<ClientCard>();
            if (max > cards.Count) max = cards.Count;

            List<ClientCard> pool = new List<ClientCard>(cards);
            List<ClientCard> enemyCards = pool.Where(c => c.Controller == 1).ToList();
            List<ClientCard> ourCards = pool.Where(c => c.Controller == 0).ToList();
            List<ClientCard> deckCards = pool.Where(c => c.Location == CardLocation.Deck).ToList();

            // Enemy removal / control / target selection.
            if ((hint == HintMsg.Destroy || hint == HintMsg.ReturnToHand || hint == HintMsg.ToDeck ||
                 hint == HintMsg.Disable || hint == HintMsg.Control || hint == HintMsg.AttackTarget ||
                 hint == HintMsg.Oppo || hint == HintMsg.Negate) && enemyCards.Count > 0)
            {
                return TakeCards(enemyCards.OrderByDescending(c => ThreatScore(c)).ToList(), min, max, true);
            }

            // Banish selection: hurt the opponent's graveyard, but preserve our best LIGHT/DARK
            // resources when BLS is paying its summon cost.
            if (hint == HintMsg.Remove)
            {
                if (enemyCards.Count > 0)
                    return TakeCards(enemyCards.OrderByDescending(c => GraveyardThreatScore(c)).ToList(), min, max, true);
                return TakeCards(ourCards.OrderBy(c => SacrificeScore(c)).ToList(), min, max, false);
            }

            // If an effect lets us choose a card from the opponent's hand (for example
            // Confiscation), take the most dangerous one.  For our own costs, throw away
            // the cheapest resource first.
            if (hint == HintMsg.Discard && enemyCards.Count > 0)
            {
                return TakeCards(enemyCards.OrderByDescending(c => HandThreatScore(c)).ToList(), min, max, false);
            }
            if (hint == HintMsg.Release || hint == HintMsg.Tribute || hint == HintMsg.Discard ||
                hint == HintMsg.FusionMaterial || hint == HintMsg.SynchroMaterial ||
                hint == HintMsg.XyzMaterial || hint == HintMsg.LinkMaterial)
            {
                return TakeCards(pool.OrderBy(c => SacrificeScore(c)).ToList(), min, max, false);
            }

            // Search effects: choose the card with the greatest strategic value, not raw ATK.
            if (hint == HintMsg.AddToHand && deckCards.Count > 0)
            {
                return TakeCards(deckCards.OrderByDescending(c => SearchScore(c)).ToList(), min, max, false);
            }

            // Revival / special summon selection.
            if (hint == HintMsg.SpSummon)
            {
                return TakeCards(pool.OrderByDescending(c => MonsterValue(c)).ToList(), min, max, false);
            }

            // Sending to grave can mean removal or a cost.
            if (hint == HintMsg.ToGrave)
            {
                if (enemyCards.Count > 0)
                    return TakeCards(enemyCards.OrderByDescending(c => ThreatScore(c)).ToList(), min, max, true);
                return TakeCards(ourCards.OrderBy(c => SacrificeScore(c)).ToList(), min, max, false);
            }

            // Generic target selection. Prefer meaningful opposing threats; otherwise use
            // the lowest-cost friendly card so costs do not consume the win condition.
            if (hint == HintMsg.Target || hint == HintMsg.Select || hint == HintMsg.Effect)
            {
                if (enemyCards.Count > 0)
                    return TakeCards(enemyCards.OrderByDescending(c => ThreatScore(c)).ToList(), min, max, false);
                return TakeCards(ourCards.OrderBy(c => SacrificeScore(c)).ToList(), min, max, false);
            }

            // Safe fallback: satisfy only the minimum required selection.
            return TakeCards(pool.OrderByDescending(c => GenericSelectionScore(c)).ToList(), min, max, false);
        }

        private IList<ClientCard> TakeCards(List<ClientCard> ordered, int min, int max, bool takeMaximum)
        {
            List<ClientCard> result = new List<ClientCard>();
            if (ordered == null || ordered.Count == 0) return result;

            int wanted = takeMaximum ? Math.Min(max, ordered.Count) : Math.Min(Math.Max(min, 1), ordered.Count);
            if (wanted < min) wanted = Math.Min(min, ordered.Count);
            for (int i = 0; i < wanted; ++i)
                result.Add(ordered[i]);
            return result;
        }

        private ClientCard GetBestEnemyMonster()
        {
            return Enemy.GetMonsters()
                .OrderByDescending(c => ThreatScore(c))
                .FirstOrDefault();
        }

        private int NormalSummonScore(ClientCard card)
        {
            int score = MonsterValue(card);
            int enemyBest = 0;
            foreach (ClientCard enemy in Enemy.GetMonsters())
                enemyBest = Math.Max(enemyBest, Math.Max(Math.Max(0, enemy.Attack), Math.Max(0, enemy.Defense)));

            bool behind = enemyBest > Math.Max(0, card.Attack);
            if (card.IsCode(CardId.MagicianOfFaith)) score += behind ? 5000 : 1000;
            if (card.IsCode(CardId.SpiritReaper)) score += behind ? 4500 : 300;
            if (card.IsCode(CardId.Sangan) || card.IsCode(CardId.WitchOfTheBlackForest)) score += behind ? 2200 : 400;
            if (card.IsCode(CardId.BreakerTheMagicalWarrior) && Enemy.GetSpellCount() > 0) score += 4200;
            if (card.IsCode(CardId.DDWarriorLady) && Enemy.GetMonsters().Count > 0) score += 2800;
            if (card.IsCode(CardId.KycooTheGhostDestroyer) && Enemy.Graveyard.Count > 0) score += 1200;
            if (card.IsCode(CardId.Tsukuyomi) && Bot.GetMonsters().Any(c => c.IsFaceup() && c.IsCode(CardId.MagicianOfFaith))) score += 5000;
            return score;
        }

        private int GenericSelectionScore(ClientCard card)
        {
            if (card.Controller == 1) return ThreatScore(card);
            if (card.Location == CardLocation.Deck) return SearchScore(card);
            if (card.IsMonster()) return MonsterValue(card);
            return CardPriority(card.Id);
        }

        private int SearchScore(ClientCard card)
        {
            return CardPriority(card.Id) + (card.IsMonster() ? Math.Max(0, card.Attack) : 0);
        }

        private int HandThreatScore(ClientCard card)
        {
            if (card == null) return 0;
            int score = CardPriority(card.Id);
            if (card.IsMonster()) score += MonsterValue(card);
            // Power spells and sweepers are especially important to strip before they resolve.
            if (card.IsCode(CardId.PotOfGreed, CardId.GracefulCharity, CardId.Raigeki,
                CardId.HarpiesFeatherDuster, CardId.HeavyStorm, CardId.MonsterReborn,
                CardId.ChangeOfHeart, CardId.SnatchSteal)) score += 2500;
            return score;
        }

        private int GraveyardThreatScore(ClientCard card)
        {
            int score = card.IsMonster() ? MonsterValue(card) : CardPriority(card.Id);
            if (card.IsCode(CardId.SinisterSerpent)) score += 2500;
            if (card.IsCode(CardId.MagicianOfFaith)) score += 1200;
            if (card.IsCode(CardId.BlackLusterSoldier)) score += 2500;
            return score;
        }

        private int SacrificeScore(ClientCard card)
        {
            if (card == null) return 10000;

            // Lower is better to spend.
            int score = card.IsMonster() ? MonsterValue(card) : CardPriority(card.Id);
            if (card.IsCode(CardId.SinisterSerpent)) score -= 5000;
            if (card.IsCode(CardId.Sangan) || card.IsCode(CardId.WitchOfTheBlackForest)) score -= 2200;
            if (card.IsCode(CardId.MagicianOfFaith) && card.IsFaceup()) score -= 1800;
            if (card.IsCode(CardId.SpiritReaper)) score -= 500;
            if (card.IsCode(CardId.BlackLusterSoldier) || card.IsCode(CardId.Jinzo)) score += 3000;
            return score;
        }

        private int MonsterValue(ClientCard card)
        {
            if (card == null) return 0;
            int attack = Math.Max(0, card.Attack);
            int defense = Math.Max(0, card.Defense);
            int score = Math.Max(attack, defense);
            score += CardPriority(card.Id);
            if (card.HasType(CardType.Effect)) score += 250;
            if (card.IsFacedown()) score += 250;
            return score;
        }

        private int ThreatScore(ClientCard card)
        {
            if (card == null) return 0;
            int score = MonsterValue(card);
            if (card.IsFacedown()) score += 700; // respect unknown flip effects / walls
            if (card.IsFaceup() && card.HasType(CardType.Effect)) score += 350;
            return score;
        }

        private int SpellTrapThreatScore(ClientCard card)
        {
            if (card == null) return 0;
            int score = CardPriority(card.Id);
            if (card.IsFaceup()) score += 1400;
            if (card.IsFacedown()) score += 900;
            if (card.HasType(CardType.Continuous) || card.HasType(CardType.Equip) || card.HasType(CardType.Field))
                score += 1000;
            return score;
        }

        private int CardPriority(int id)
        {
            switch (id)
            {
                case CardId.BlackLusterSoldier: return 5600;
                case CardId.Jinzo: return 4300;
                case CardId.AirknightParshath: return 3200;
                case CardId.BreakerTheMagicalWarrior: return 3900;
                case CardId.DDWarriorLady: return 3600;
                case CardId.KycooTheGhostDestroyer: return 2900;
                case CardId.BerserkGorilla: return 1700;
                case CardId.Sangan: return 2500;
                case CardId.WitchOfTheBlackForest: return 2600;
                case CardId.SinisterSerpent: return 2100;
                case CardId.MagicianOfFaith: return 3300;
                case CardId.SpiritReaper: return 2700;
                case CardId.Tsukuyomi: return 3100;

                case CardId.PotOfGreed: return 6000;
                case CardId.GracefulCharity: return 5700;
                case CardId.DelinquentDuo: return 5400;
                case CardId.TheForcefulSentry: return 5200;
                case CardId.Confiscation: return 4700;
                case CardId.ChangeOfHeart: return 5200;
                case CardId.SnatchSteal: return 5200;
                case CardId.MonsterReborn: return 5600;
                case CardId.PrematureBurial: return 4200;
                case CardId.HarpiesFeatherDuster: return 5200;
                case CardId.HeavyStorm: return 4500;
                case CardId.MysticalSpaceTyphoon: return 3400;
                case CardId.DarkHole: return 4300;
                case CardId.Raigeki: return 5400;
                case CardId.BookOfMoon: return 3300;

                case CardId.MirrorForce: return 5000;
                case CardId.TorrentialTribute: return 4400;
                case CardId.RingOfDestruction: return 4300;
                case CardId.CallOfTheHaunted: return 3900;
                case CardId.SolemnJudgment: return 4700;
                default: return 0;
            }
        }
    }
}
