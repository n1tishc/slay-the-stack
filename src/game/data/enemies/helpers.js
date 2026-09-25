// Move-selection helpers shared by enemy definitions.

// Picks a random move while avoiding using the same move more than `max` times in a row.
export function noRepeat(c, e, pairs, max) {
  max = max || 2;
  var h = e.history;
  var filtered = pairs.filter(function (p) {
    if (h.length < max) return true;
    for (var i = 1; i <= max; i++) if (h[h.length - i] !== p[0]) return true;
    return false;
  });
  return c.rng.weighted(filtered.length ? filtered : pairs);
}
export function cycle(e, keys) {
  return keys[e.history.length % keys.length];
}
