// Every enemy definition, keyed by id.

import { BUGS } from './bugs.js';
import { ELITES } from './elites.js';
import { BOSSES } from './bosses.js';

export const ENEMIES = {};
[BUGS, ELITES, BOSSES].forEach(function (list) {
  list.forEach(function (def) {
    ENEMIES[def.id] = def;
  });
});

// The failure modes with a Field Guide entry, in the order you meet them (beginner first).
export const FAILURES = BUGS.filter(function (def) {
  return def.lesson;
});

// The failure modes a Practice card counters (by card id).
export const countersOf = function (cardId) {
  return FAILURES.filter(function (def) {
    return def.weakness === cardId;
  });
};
