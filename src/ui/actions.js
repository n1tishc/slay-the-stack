// Action registry. Markup declares data-act="name" (plus data-* args); each screen registers
// the handlers it owns, and one delegated listener per container dispatches clicks.
const handlers = new Map();

export function defineActions(map) {
  for (const [name, fn] of Object.entries(map)) {
    if (handlers.has(name)) throw new Error(`Duplicate action: ${name}`);
    handlers.set(name, fn);
  }
}

// Click handler: finds the nearest [data-act] and runs it with the element's dataset.
export function dispatch(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = handlers.get(el.getAttribute('data-act'));
  if (!fn) return;
  e.stopPropagation();
  fn(el.dataset);
}
