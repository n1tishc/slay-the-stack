// Chapter map: a Slay-the-Spire style DAG of 12 rows × 7 columns, climbing toward the SEV-0 boss.

export const ChapterMap = {
  ROWS: 12,
  COLS: 7,
  PATHS: 6,
  TREASURE_ROW: 7,
  NODE_INFO: {
    combat: { label: 'Bug', icon: '🐛', desc: 'A production bug. Fix it.' },
    elite: { label: 'Incident', icon: '🔥', desc: 'A SEV-2 incident. Dangerous, but drops a Plugin.' },
    rest: { label: 'Downtime', icon: '☕', desc: 'Sleep to heal or Fine-tune a card.' },
    shop: { label: 'Marketplace', icon: '🛒', desc: 'Spend API Credits on cards, Plugins and Scripts.' },
    event: { label: 'Slack Thread', icon: '💬', desc: 'Something is happening in #eng-general.' },
    treasure: { label: 'Stash', icon: '🎁', desc: 'An unclaimed Plugin.' },
    boss: { label: 'SEV-0', icon: '🌋', desc: 'The chapter boss.' },
  },

  generate: function (rng) {
    var R = this.ROWS,
      K = this.COLS;
    var nodes = [];
    for (var r = 0; r < R; r++) {
      nodes.push([]);
      for (var c = 0; c < K; c++) nodes[r].push(null);
    }
    function ensure(r, c) {
      if (!nodes[r][c]) nodes[r][c] = { row: r, col: c, type: null, next: [], jx: rng.next() - 0.5, jy: rng.next() - 0.5 };
      return nodes[r][c];
    }
    function hasEdge(r, a, b) {
      var n = nodes[r][a];
      return !!n && n.next.indexOf(b) >= 0;
    }

    var firstStart = -1;
    for (var p = 0; p < this.PATHS; p++) {
      var cur = rng.int(K);
      if (p === 1) while (cur === firstStart) cur = rng.int(K);
      if (p === 0) firstStart = cur;
      for (var row = 0; row < R; row++) {
        var node = ensure(row, cur);
        if (row === R - 1) break;
        var options = [];
        for (var d = -1; d <= 1; d++) {
          var nc = cur + d;
          if (nc < 0 || nc >= K) continue;
          // Reject moves that would cross an existing edge.
          if (d === 1 && hasEdge(row, cur + 1, cur)) continue;
          if (d === -1 && hasEdge(row, cur - 1, cur)) continue;
          options.push(nc);
        }
        var nxt = rng.pick(options);
        if (node.next.indexOf(nxt) < 0) node.next.push(nxt);
        cur = nxt;
      }
    }

    // Parents for type constraints.
    for (r = 0; r < R; r++) for (c = 0; c < K; c++) if (nodes[r][c]) nodes[r][c].parents = [];
    for (r = 0; r < R - 1; r++)
      for (c = 0; c < K; c++) {
        var n = nodes[r][c];
        if (!n) continue;
        n.next.sort();
        n.next.forEach(function (nc) {
          nodes[r + 1][nc].parents.push(c);
        });
      }

    var SPECIAL = ['elite', 'rest', 'shop'];
    for (r = 0; r < R; r++)
      for (c = 0; c < K; c++) {
        n = nodes[r][c];
        if (!n) continue;
        if (r === 0) {
          n.type = 'combat';
          continue;
        }
        if (r === this.TREASURE_ROW) {
          n.type = 'treasure';
          continue;
        }
        if (r === R - 1) {
          n.type = 'rest';
          continue;
        }
        var parentTypes = n.parents.map(function (pc) {
          return nodes[r - 1][pc].type;
        });
        var pairs = [
          ['combat', 45],
          ['event', 22],
        ];
        if (r >= 4) pairs.push(['elite', 14]);
        if (r >= 4 && r !== R - 2) pairs.push(['rest', 12]);
        if (r >= 2) pairs.push(['shop', 7]);
        pairs = pairs.filter(function (pr) {
          return SPECIAL.indexOf(pr[0]) < 0 || parentTypes.indexOf(pr[0]) < 0;
        });
        n.type = rng.weighted(pairs);
      }

    var all = [];
    for (r = 0; r < R; r++) for (c = 0; c < K; c++) if (nodes[r][c]) all.push(nodes[r][c]);
    function count(t) {
      return all.filter(function (x) {
        return x.type === t;
      }).length;
    }
    function convert(t, minRow, maxRow) {
      var cands = all.filter(function (x) {
        if (x.row < minRow || x.row > maxRow || (x.type !== 'combat' && x.type !== 'event')) return false;
        return (
          x.parents.every(function (pc) {
            return nodes[x.row - 1][pc].type !== t;
          }) &&
          x.next.every(function (nc) {
            return nodes[x.row + 1][nc].type !== t;
          })
        );
      });
      if (cands.length) rng.pick(cands).type = t;
    }
    if (count('shop') === 0) convert('shop', 3, 9);
    while (count('elite') < 3) {
      var before = count('elite');
      convert('elite', 4, 10);
      if (count('elite') === before) break;
    }

    return { rows: R, cols: K, nodes: nodes };
  },

  node: function (map, row, col) {
    return map.nodes[row] && map.nodes[row][col];
  },

  // Keys ("row,col") of every node still reachable from pos (all nodes before the first move).
  reachable: function (map, pos) {
    var out = {};
    var frontier = ChapterMap.available(map, pos).filter(function (n) {
      return !n.boss;
    });
    while (frontier.length) {
      var n = frontier.pop();
      var k = n.row + ',' + n.col;
      if (out[k]) continue;
      out[k] = true;
      if (n.row < map.rows - 1)
        n.next.forEach(function (c) {
          frontier.push(map.nodes[n.row + 1][c]);
        });
    }
    return out;
  },

  // Nodes the player may move to next.
  available: function (map, pos) {
    if (!pos) return map.nodes[0].filter(Boolean);
    if (pos.boss) return [];
    if (pos.row === map.rows - 1) return [{ row: map.rows, col: 3, type: 'boss', boss: true }];
    var n = map.nodes[pos.row][pos.col];
    return n.next.map(function (c) {
      return map.nodes[pos.row + 1][c];
    });
  },
};
