/* Squash Punkte – Zähl-Logik (PAR bis 11, 2 Punkte Abstand). ES5, ohne DOM. */
(function (root) {
  'use strict';
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function newMatch(cfg) {
    cfg = cfg || {};
    return { cfg: { bestOf: cfg.bestOf === 3 ? 3 : 5, to: 11 }, points: [0, 0], gamesWon: [0, 0], games: [],
      server: null, side: 'R', winner: null, history: [], seq: 0 };
  }
  function snap(st) { return { points: st.points, gamesWon: st.gamesWon, games: st.games, server: st.server, side: st.side, winner: st.winner }; }
  function push(ns, st) { ns.history.push(snap(st)); if (ns.history.length > 1000) ns.history.shift(); ns.seq = (st.seq || 0) + 1; }
  function gameOver(p, to) { var a = p[0], b = p[1]; return (a >= to || b >= to) && Math.abs(a - b) >= 2; }
  function need(st) { return Math.floor(st.cfg.bestOf / 2) + 1; }
  // Aufschlag festlegen (Spielbeginn / Münzwurf)
  function setServer(st, t) {
    var ns = clone(st); push(ns, st); ns.server = t; ns.side = 'R'; return ns;
  }
  // Neuer Aufschläger darf Seite wählen: Seite wechseln ohne Punkt
  function toggleSide(st) {
    var ns = clone(st); push(ns, st); ns.side = st.side === 'R' ? 'L' : 'R'; return ns;
  }
  function point(st, t) {
    if (st.winner !== null) return st;
    var ns = clone(st); push(ns, st);
    if (ns.server === null) ns.server = t; // ohne Wahl: wer den ersten Ballwechsel gewinnt
    ns.points[t]++;
    if (gameOver(ns.points, ns.cfg.to)) {
      ns.games.push([ns.points[0], ns.points[1]]);
      ns.gamesWon[t]++; ns.points = [0, 0];
      ns.server = t; ns.side = 'R';
      if (ns.gamesWon[t] >= need(ns)) ns.winner = t;
      return ns;
    }
    if (st.server === t) ns.side = st.side === 'R' ? 'L' : 'R'; // Aufschläger gewinnt -> Seite wechseln
    else { ns.server = t; ns.side = 'R'; }                      // Aufschlagwechsel, Standard rechts
    return ns;
  }
  function undo(st) {
    if (!st.history.length) return st;
    var ns = clone(st), h = ns.history.pop();
    for (var k in h) ns[k] = h[k];
    ns.seq = (st.seq || 0) + 1; return ns;
  }
  function setBestOf(st, n) {
    var ns = clone(st); ns.cfg.bestOf = n === 3 ? 3 : 5;
    if (ns.winner === null) { for (var t = 0; t < 2; t++) if (ns.gamesWon[t] >= need(ns)) ns.winner = t; }
    else if (ns.gamesWon[ns.winner] < need(ns)) ns.winner = null;
    return ns;
  }
  // Ansage: Satzball / Matchball / Verlängerung
  function label(st) {
    if (st.winner !== null) return '';
    var p = st.points, to = st.cfg.to;
    for (var t = 0; t < 2; t++) {
      var q = p.slice(); q[t]++;
      if (gameOver(q, to)) return { t: t, txt: st.gamesWon[t] + 1 >= need(st) ? 'Matchball' : 'Satzball' };
    }
    if (p[0] >= to - 1 && p[1] >= to - 1) return { t: null, txt: '2 Punkte Abstand' };
    return '';
  }
  function summary(st) { return st.gamesWon.join(':') + ' | ' + st.points.join(':') + ' | ' + (st.server === null ? '-' : st.server + st.side); }
  root.SquashScore = { newMatch: newMatch, point: point, undo: undo, setServer: setServer, toggleSide: toggleSide, setBestOf: setBestOf, label: label, summary: summary, need: need };
  if (typeof module !== 'undefined') module.exports = root.SquashScore;
})(typeof window !== 'undefined' ? window : this);
