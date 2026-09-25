// mulberry32: a tiny seeded PRNG whose whole state is one integer (easy to save).
export const RNG = function (seed) {
  this.state = seed >>> 0;
};
RNG.prototype.next = function () {
  var t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
RNG.prototype.int = function (n) {
  return Math.floor(this.next() * n);
};
RNG.prototype.range = function (lo, hi) {
  return lo + this.int(hi - lo + 1);
};
RNG.prototype.chance = function (p) {
  return this.next() < p;
};
RNG.prototype.pick = function (arr) {
  return arr[this.int(arr.length)];
};
RNG.prototype.shuffle = function (arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = this.int(i + 1);
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};
RNG.prototype.weighted = function (pairs) {
  // pairs: [[value, weight], ...]
  var total = 0;
  for (var i = 0; i < pairs.length; i++) total += pairs[i][1];
  var r = this.next() * total;
  for (var k = 0; k < pairs.length; k++) {
    r -= pairs[k][1];
    if (r < 0) return pairs[k][0];
  }
  return pairs[pairs.length - 1][0];
};
