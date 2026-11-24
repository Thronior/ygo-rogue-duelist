"""Card picture for the Dandelion Token (user, 2026-11-24): Dandylion's illustration on the token frame the Moth Token
uses, drawn by tools/make_moth_lv_card_art.py's make(). Its text comes from data/custom-tokens.json.

Usage: python tools/make_plant_token_art.py   (writes assets/cards/190000058.jpg)
"""
import json, runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DANDYLION, DANDELION_TOKEN = 15341821, 190000058

if __name__ == '__main__':
    art = runpy.run_path(str(ROOT / 'tools/make_moth_lv_card_art.py'), run_name='plant_token')
    art['PLAN'][DANDELION_TOKEN] = (art['SNAKE_TOKEN'], DANDYLION, '[Plant/Token]')
    tokens = {t['id']: t for t in json.loads((ROOT / 'data/custom-tokens.json').read_text(encoding='utf8'))}
    art['make'](DANDELION_TOKEN, tokens[DANDELION_TOKEN])
