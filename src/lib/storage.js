// localStorage wrappers. Storage can be missing or throw (private windows, blocked cookies),
// so every access is optional and falls back to a default.
function attempt(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function loadText(key) {
  return attempt(() => localStorage.getItem(key), null);
}

export function saveText(key, text) {
  attempt(() => localStorage.setItem(key, text));
}

export function removeKey(key) {
  attempt(() => localStorage.removeItem(key));
}

export function loadJSON(key, fallback) {
  const v = loadText(key);
  return v ? attempt(() => JSON.parse(v), fallback) : fallback;
}

export function saveJSON(key, value) {
  saveText(key, JSON.stringify(value));
}
