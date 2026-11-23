// DNA Rewrite's monster Type is one choice for the whole Tag team: tag_campaign.py keeps it in the shared run state, so
// both partners are offered it and the first answer counts for both. The other partner's window then has nothing left to
// answer and has to close by itself (Discord, Tasfariel, 2026-11-22: that partner was stuck on it until a reload).
export const typeChoicePending=run=>!!run&&run.challenge_level!==-1&&(run.artifacts||[]).includes('dna_rewrite')&&!run.monster_type;
// Closes the open DNA Rewrite window once the run no longer waits for a Type. True when it closed it.
export function closeStaleTypeChoice(modal,run){
 if(!modal?.open||!modal.querySelector?.('[data-do="choose-monster-type"]')||typeChoicePending(run))return false;
 modal.close();return true;
}
