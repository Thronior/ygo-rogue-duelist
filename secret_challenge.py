"""Copycat's hidden, standalone championship match."""
import storage

def create(game):
 # Use the normal run schema without changing the player's character unlocks.
 run=game.new_run(0)
 run.update(character=37,round=8,lp=8000,gold=0,stage='draft',opponent=0,routes=[0],artifacts=['echo_glass'],starting_relic='echo_glass',encore_active=True,secret_challenge=True,challenge_level=0,curses=[],boss_curse=None,profile_complete=True)
 game.copy_deck(run)
 # Preserve the previous run separately before entering the secret match.
 previous=game.load_run()
 if previous:storage.write(storage.ROOT/'before-secret-run.json',previous)
 game.save(run)
 return run
