CLASSIC 2004 SMART AI FOR EDOPRO / WINDBOT
==========================================

WHAT THIS IS
------------
A hard, deterministic WindBot executor tuned for a 40-card pre-2005 Chaos/Control
"good stuff" test deck. It deliberately uses the SMART rules rather than the old
videogame mistakes discussed earlier.

The bot uses:
- current WindBot's generic battle/reposition infrastructure;
- card-value and threat scoring;
- sensible tribute/cost/discard choices;
- strong search/revival targeting;
- LP-aware Ring of Destruction / Premature Burial decisions;
- board-value checks before Dark Hole / Torrential Tribute / Heavy Storm;
- threat-aware Book of Moon, Mirror Force, Solemn Judgment, D.D. Warrior Lady;
- BLS summon/effect logic;
- Breaker backrow targeting;
- Magician of Faith / Tsukuyomi recycling;
- preservation of Sinister Serpent and searchers as expendable resources.

INSTALL (WINDOWS)
-----------------
1. Make sure your normal EDOPro WindBot opponents already work.
2. Easiest method: extract this whole folder into your EDOPro installation folder.
3. Double-click INSTALL_AI.bat.
4. The installer compiles Classic2004Smart.dll against YOUR installed ExecutorBase.dll,
   copies the deck, backs up bots.json, and adds the bot entry.
5. Restart EDOPro.
6. Start an AI duel and choose: Classic 2004 Smart AI

You can also run the package from elsewhere. If EDOPro is not auto-detected, the
installer asks you for the folder containing WindBot.

WHY IT COMPILES LOCALLY
-----------------------
WindBot external executors are DLLs compiled against ExecutorBase. Compiling against
your installed ExecutorBase.dll is safer than shipping a random precompiled DLL that
may have been built against a different EDOPro/WindBot revision.

DECK / BANLIST
--------------
The included deck intentionally uses classic power cards such as Pot of Greed,
Graceful Charity, Delinquent Duo, Raigeki, Harpie's Feather Duster, Monster Reborn,
BLS, etc. Use a no-banlist/permissive room for this test unless you install a matching
historical list.

Important: EDOPro uses the CURRENT database/card scripts. Cards that received later
errata (for example Sinister Serpent or Ring of Destruction) will use their current
text, not their exact 2004 printed text. This package changes the AI, not card scripts.

FILES INSTALLED
---------------
WindBot\Executors\Classic2004Smart.dll
WindBot\Decks\AI_Classic2004Smart.ydk
One entry in WindBot\bots.json

The installer also creates a timestamped bots.json backup before editing it.

UNINSTALL
---------
Run UNINSTALL_AI.bat. It removes the executor, test deck and its bot-list entry.

SOURCE / COMPATIBILITY
----------------------
Source is included at src\Classic2004SmartExecutor.cs.
The executor is designed against the public ProjectIgnis WindBot ExecutorBase API.
WindBot is AGPL-3.0-or-later; follow its license terms when redistributing a compiled
version or derivative package.

This is an experimental community-style executor, not an official Project Ignis bot.
