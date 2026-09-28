"""Standalone dev tool: edit enemy decks in the EDOPro GUI, auto-saved back on change.

Local-only helper, never packaged into the installer. Run DeckEditor.exe (or
this file) from the game folder. Game decks are data/decks/*.ydk; EDOPro edits
runtime/deck/*.ydk. A watcher copies validated saves straight back, so there
is no separate import step. Personal decks in runtime/deck are never touched.
"""
import json
import shutil
import subprocess
import threading
import time
import tkinter as tk
from collections import Counter
from pathlib import Path
from tkinter import messagebox


def game_root():
    import sys
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    base = Path(sys.argv[0]).parent
    if (base / "data" / "decks").is_dir():
        return base
    return Path(__file__).resolve().parent.parent


ROOT = game_root()
DATA_DECKS = ROOT / "data" / "decks"
LIVE_DECKS = ROOT / "runtime" / "deck"
EDOPRO = ROOT / "runtime" / "EDOPro.exe"


def load_pool():
    cards = json.loads((ROOT / "data/era-cards.json").read_text(encoding="utf8"))
    aliases = json.loads((ROOT / "data/card-aliases.json").read_text(encoding="utf8"))
    return {c["id"]: c for c in cards}, {int(k): v for k, v in aliases.items()}


def parse_ydk(text):
    main, extra, side = [], [], []
    section = main
    for line in text.splitlines():
        line = line.strip()
        if line == "#main":
            section = main
        elif line == "#extra":
            section = extra
        elif line == "!side":
            section = side
        elif line and not line.startswith(("#", "!")):
            if not line.isdecimal():
                raise ValueError("Invalid card ID: " + line)
            section.append(int(line))
    return main, extra, side


def validate_deck(text):
    """Mirror of deck_files.read rules: 20+ main, known pool cards, max 3 copies."""
    cards, aliases = load_pool()
    main, extra, side = parse_ydk(text)
    if len(main) < 20:
        raise ValueError("needs at least 20 main-deck cards")
    missing = [c for c in main + extra + side if aliases.get(c, c) not in cards]
    if missing:
        raise ValueError("unknown/out-of-pool card ID " + str(missing[0]))
    counts = Counter(aliases.get(c, c) for c in main + extra + side)
    over = next((c for c, n in counts.items() if n > 3), None)
    if over is not None:
        raise ValueError("more than three copies of " + cards[over]["name"])
    return len(main), len(extra)


def game_deck_names():
    return sorted(p.name for p in DATA_DECKS.glob("*.ydk"))


class DeckEditor(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Shadow Run - Enemy Deck Editor (dev tool)")
        self.geometry("560x520")
        self._watching = False
        self._baseline = {}
        top = tk.Frame(self)
        top.pack(fill="x", padx=10, pady=8)
        tk.Button(top, text="Open EDOPro deck editor", command=self.open_editor).pack(side="left")
        tk.Button(top, text="Refresh list", command=self.refresh).pack(side="left", padx=6)
        tk.Label(top, text="saves apply automatically", fg="gray").pack(side="left", padx=6)
        self.listbox = tk.Listbox(self)
        self.listbox.pack(fill="both", expand=True, padx=10)
        self.log = tk.Text(self, height=10, state="disabled")
        self.log.pack(fill="x", padx=10, pady=8)
        self.refresh()
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def note(self, text):
        self.log.configure(state="normal")
        self.log.insert("end", time.strftime("%H:%M:%S") + "  " + text + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def refresh(self):
        self.listbox.delete(0, "end")
        for name in game_deck_names():
            try:
                main, extra, _ = parse_ydk((DATA_DECKS / name).read_text(encoding="utf-8-sig"))
                self.listbox.insert("end", f"{name}  ({len(main)} main / {len(extra)} extra)")
            except (OSError, ValueError) as e:
                self.listbox.insert("end", f"{name}  (INVALID: {e})")

    def open_editor(self):
        for name in game_deck_names():
            shutil.copy2(DATA_DECKS / name, LIVE_DECKS / name)
        self._baseline = {n: (LIVE_DECKS / n).stat().st_mtime_ns for n in game_deck_names()}
        try:
            subprocess.Popen([str(EDOPRO)], cwd=str(ROOT / "runtime"))
        except OSError as e:
            messagebox.showerror("Deck editor", f"Could not launch EDOPro: {e}")
            return
        self.note(f"Exported {len(self._baseline)} decks. Watching runtime/deck for saves...")
        if not self._watching:
            self._watching = True
            threading.Thread(target=self._watch, daemon=True).start()

    def _watch(self):
        while self._watching:
            time.sleep(2)
            try:
                self.poll_once()
            except Exception as e:  # never kill the watcher on a transient error
                self.after(0, self.note, f"watcher hiccup: {e}")

    def poll_once(self):
        """Copy validated saves straight back; shared by the watcher and tests."""
        for name, stamp in list(self._baseline.items()):
            live = LIVE_DECKS / name
            try:
                if not live.exists() or live.stat().st_mtime_ns == stamp:
                    continue
            except OSError:
                continue
            try:
                text = live.read_text(encoding="utf-8-sig")
                main_n, extra_n = validate_deck(text)
                (DATA_DECKS / name).write_text(text if text.endswith("\n") else text + "\n",
                                              encoding="utf8")
                self._baseline[name] = live.stat().st_mtime_ns
                self.after(0, self.note, f"Saved {name} ({main_n} main / {extra_n} extra).")
            except ValueError as e:
                self._baseline[name] = live.stat().st_mtime_ns
                self.after(0, self.note, f"Rejected {name}: {e} (game file untouched).")
            except OSError as e:
                self.after(0, self.note, f"Could not read {name}: {e}")

    def on_close(self):
        self._watching = False
        self.destroy()


def main():
    try:
        if not (ROOT / "data" / "decks").is_dir():
            raise RuntimeError(f"Cannot find the game folder (looked in {ROOT}). Put DeckEditor.exe inside the Shadow Run folder.")
        DeckEditor().mainloop()
    except Exception as e:
        import tkinter as tk
        from tkinter import messagebox
        r = tk.Tk()
        r.withdraw()
        messagebox.showerror("Deck editor failed to start", str(e))
        r.destroy()


if __name__ == "__main__":
    main()
