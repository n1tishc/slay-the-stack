// UI state. The run and combat objects come from the game engine; everything else is
// presentation state for whichever screen is showing.
export const ui = {
  run: null,
  screen: 'title',
  c: null, // live Combat
  sc: null, // current stage scene
  sel: null, // hand index awaiting a target
  selScript: null, // script slot awaiting a target
  busy: false, // animations or the enemy turn are running
  dying: {}, // enemy uids still fading out
  reward: null,
  shop: null,
  event: null,
  eventResult: null,
  eventRetry: false, // a scenario missed in an earlier run, back for another try
  practice: null, // Practice mode: { queue, i, answered, best, rng } (screens/practice.js)
  treasure: null,
  rest: null,
  over: null,
  picker: null,
  modal: null,
  focusChar: 'claude',
};

export function isTargeting() {
  return ui.sel !== null || ui.selScript !== null;
}
