import {LIMITS} from './collector-rules.js';
import {championCards} from './champion-cards.js';
export const forcedUltra=new Set([...championCards,...Object.entries(LIMITS).filter(([,n])=>n===1).map(([id])=>Number(id))]);
export const isUltra=id=>forcedUltra.has(Number(id));
