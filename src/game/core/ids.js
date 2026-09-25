// Unique ids for card instances and enemies.

let uidCounter = 1;

export function uid() {
  return uidCounter++;
}

// After loading a save, make sure new ids never collide with saved ones.
export function reserveUids(maxUsed) {
  uidCounter = Math.max(uidCounter, maxUsed + 1);
}
