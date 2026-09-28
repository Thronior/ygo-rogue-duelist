"""Yu-Gi-Oh: Rogue Duelist native desktop launcher."""
from frontend import App
Campaign = App
if __name__ == "__main__":
    import msvcrt,traceback
    from pathlib import Path
    from tkinter import messagebox
    root=Path(__file__).parent
    lock=(root/'temp/session.lock').open('a+b')
    try:
        lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
    except OSError:
        messagebox.showinfo('Yu-Gi-Oh: Rogue Duelist','Yu-Gi-Oh: Rogue Duelist is already open. Look for its window in the taskbar.')
        raise SystemExit(0)
    try:App().mainloop()
    except Exception:
        log=root/'temp/startup-error.log';log.write_text(traceback.format_exc(),encoding='utf8')
        messagebox.showerror('Yu-Gi-Oh: Rogue Duelist',f'Could not open the game. Details saved to {log}')
