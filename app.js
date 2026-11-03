/* Squash Punkte – Oberfläche und Eingaben (ES5, läuft auch auf älterem Android-WebView) */
(function () {
  'use strict';
  var S = window.SquashScore;
  var $ = function (id) { return document.getElementById(id); };
  var LS_STATE = 'squash.state', LS_SET = 'squash.settings';
  var DEF_KEYS = { A: ['ArrowLeft', 'ArrowUp', 'PageUp', '1', 'a'], B: ['ArrowRight', 'ArrowDown', 'PageDown', '2', 'b'], U: ['Backspace', 'Delete', '0', 'z', 'u'] };
  var DBL_MS = 700; // Doppelklick-Fenster (ms)
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v || d; } catch (e) { return d; } }

  var set = load(LS_SET, {});
  var defaults = { nameA: 'Artur', nameB: 'Kamila', swap: false, tap: true, light: false, beep: false, keys: DEF_KEYS, dbl: true, dblMs: DBL_MS };
  for (var k in defaults) if (set[k] === undefined) set[k] = JSON.parse(JSON.stringify(defaults[k]));
  var st = load(LS_STATE, null);
  if (!st || !st.cfg || !st.points || !st.gamesWon) { st = S.newMatch(); st.setup = true; }

  function saveSet() { localStorage.setItem(LS_SET, JSON.stringify(set)); }
  function saveState() { localStorage.setItem(LS_STATE, JSON.stringify(st)); }
  saveSet(); saveState();

  /* ---------- Anzeige ---------- */
  var bannerT;
  function banner(t, cls) { var b = $('banner'); b.textContent = t; b.classList.toggle('undo', cls === 'undo'); b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(function () { b.classList.remove('show'); }, 1700); }
  function name(i) { return i === 0 ? set.nameA : set.nameB; }
  function sideTxt(s) { return s === 'R' ? 'rechts' : 'links'; }

  function render() {
    document.body.classList.toggle('light', !!set.light);
    var L = set.swap ? 1 : 0;
    $('sA').className = 'side ' + (L === 0 ? 'sideA' : 'sideB'); $('sA').setAttribute('data-side', L);
    $('sB').className = 'side R ' + (L === 0 ? 'sideB' : 'sideA'); $('sB').setAttribute('data-side', 1 - L);
    [['A', L], ['B', 1 - L]].forEach(function (r) {
      var c = r[0], t = r[1];
      $('n' + c).textContent = name(t);
      $('p' + c).textContent = st.winner !== null ? '–' : st.points[t];
      $('g' + c).textContent = st.gamesWon[t];
      var srv = st.server === t && st.winner === null;
      $('v' + c).className = 'srv' + (srv ? '' : ' off');
      $('vb' + c).textContent = 'Aufschlag ' + sideTxt(st.side);
    });
    $('sSA').textContent = st.gamesWon[L]; $('sSB').textContent = st.gamesWon[1 - L];
    $('sSA').className = L === 0 ? 'sa' : 'sb'; $('sSB').className = L === 0 ? 'sb' : 'sa';
    $('hist').textContent = st.games.map(function (x) { return x[L] + ':' + x[1 - L]; }).join('   ');
    var lab = S.label(st), txt = lab ? lab.txt + (lab.t !== null ? ' ' + name(lab.t) : '') : '';
    var s = $('status'); s.textContent = txt; s.classList.toggle('hot', !!txt);
    // Aufschlagwahl vor dem ersten Ballwechsel
    $('pick').style.display = st.server === null && st.winner === null ? '' : 'none';
    $('kA').textContent = name(0); $('kB').textContent = name(1);
    var w = $('winner');
    if (st.winner !== null) {
      $('wTitle').textContent = 'Sieg ' + name(st.winner) + '!';
      $('wSets').textContent = 'Sätze ' + st.gamesWon[0] + ':' + st.gamesWon[1];
      $('wTbl').innerHTML = st.games.map(function (x, i) { return 'Satz ' + (i + 1) + ': ' + x[0] + ':' + x[1]; }).join('<br>');
      w.classList.add('show');
    } else w.classList.remove('show');
    $('bUndo').disabled = !st.history.length;
  }

  function flash(team) {
    var el = (set.swap ? 1 - team : team) === 0 ? $('sA') : $('sB');
    el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 350);
  }
  var actx;
  function beep(f) {
    if (!set.beep) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = f || 880; g.gain.value = 0.15; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.12); } catch (e) {}
  }
  function commit(ns, team) {
    var prev = st; st = ns; saveState(); render();
    if (team === undefined) return;
    flash(team); beep(team === 0 ? 880 : 660);
    if (st.winner !== null) return;
    if (st.gamesWon[team] > prev.gamesWon[team]) { var g = st.games[st.games.length - 1]; banner('Satz ' + name(team) + ' ' + Math.max(g[0], g[1]) + ':' + Math.min(g[0], g[1])); }
  }
  function vib(p) {
    try { if (window.PadelNative && PadelNative.vibrate) { PadelNative.vibrate(JSON.stringify([].concat(p))); return; } } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(p);
  }
  function point(team) { lastBtn = null; if (st.winner !== null) return; commit(S.point(st, team), team); vib(40); }
  function undo() { lastBtn = null; if (!st.history.length) return; commit(S.undo(st)); banner('↶ Rückgängig'); vib([30, 60, 30]); }

  /* Doppelklick = Zurück: wie Padel Punkte v6. 1. Druck zählt sofort; dieselbe Taste
     innerhalb dblMs nochmal -> Stand von vor dem 1. Druck und zusätzlich einen Schritt zurück. */
  var lastBtn = null;
  function btnPoint(team, src) {
    var now = Date.now(), win = Math.max(300, Math.min(1500, +set.dblMs || DBL_MS));
    if (set.dbl && lastBtn && lastBtn.team === team && lastBtn.src === src && now - lastBtn.t <= win) {
      var before = lastBtn.before, seq = st.seq; lastBtn = null;
      var ns = before.history.length ? S.undo(before) : before;
      ns = JSON.parse(JSON.stringify(ns)); ns.seq = seq + 1;
      commit(ns); banner('↶ Punkt zurück', 'undo'); vib([80, 80, 80, 80, 250]);
      return;
    }
    var prev = st; point(team);
    lastBtn = { team: team, src: src, t: now, before: prev };
  }
  function newMatch() { lastBtn = null; st = S.newMatch(st.cfg); st.setup = true; saveState(); render(); openStart(); }

  /* ---------- Start-Dialog: Namen + erster Aufschlag ---------- */
  var startSrv = 'c';
  function openStart() {
    $('tA').value = set.nameA; $('tB').value = set.nameB; startSrv = 'c'; startLabels();
    $('start').classList.add('show');
  }
  function startLabels() {
    $('dA').textContent = $('tA').value.trim() || 'Artur'; $('dB').textContent = $('tB').value.trim() || 'Kamila';
    $('bKeep').textContent = 'Weiter mit ' + set.nameA + ' / ' + set.nameB;
    [].forEach.call($('srvb').children, function (b) { b.classList.toggle('on', b.getAttribute('data-s') === String(startSrv)); });
  }
  var CHIPS = ['Artur', 'Kamila', 'Spieler 1', 'Spieler 2'];
  ['A', 'B'].forEach(function (c) {
    var box = $('c' + c);
    box.innerHTML = CHIPS.map(function (n) { return '<button class="btn" type="button">' + esc(n) + '</button>'; }).join('');
    box.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $('t' + c).value = b.textContent; startLabels(); };
  });
  $('tA').oninput = startLabels; $('tB').oninput = startLabels;
  $('srvb').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var v = b.getAttribute('data-s'); startSrv = v === 'c' ? 'c' : +v; startLabels(); };
  function startGo(useTyped) {
    if (useTyped) { set.nameA = $('tA').value.trim() || 'Artur'; set.nameB = $('tB').value.trim() || 'Kamila'; saveSet(); }
    $('start').classList.remove('show'); delete st.setup; saveState();
    var t = startSrv;
    if (t === 'c') { var a = new Uint8Array(1); try { crypto.getRandomValues(a); } catch (e) { a[0] = Math.random() * 256; } t = a[0] & 1; }
    serve(t);
  }
  $('bKeep').onclick = function () { startGo(false); };
  $('bGo').onclick = function () { startGo(true); };

  /* ---------- Antippen ---------- */
  var press = null;
  function onDown(e) {
    if (!set.tap || e.target.closest('button') || $('settings').classList.contains('show')) return;
    var side = e.target.closest('.side');
    if (!side) return;
    var team = +side.getAttribute('data-side');
    press = { team: team, t: setTimeout(function () { press = null; undo(); }, 650) };
  }
  function onUp() { if (!press) return; clearTimeout(press.t); var t = press.team; press = null; point(t); }
  function onCancel() { if (press) { clearTimeout(press.t); press = null; } }
  var board = $('board');
  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointerup', onUp);
  board.addEventListener('pointercancel', onCancel);
  board.addEventListener('pointerleave', onCancel);
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  $('bUndo').onclick = undo;
  $('wUndo').onclick = undo;
  $('wNew').onclick = newMatch;
  function serve(t) { lastBtn = null; commit(S.setServer(st, t)); banner('Aufschlag ' + name(t)); }
  $('kA').onclick = function () { serve(0); };
  $('kB').onclick = function () { serve(1); };
  $('pCoin').onclick = function () { var a = new Uint8Array(1); try { crypto.getRandomValues(a); } catch (e) { a[0] = Math.random() * 256; } serve(a[0] & 1); };
  function side() { lastBtn = null; commit(S.toggleSide(st)); }
  $('vtA').onclick = side; $('vtB').onclick = side;

  /* ---------- Tasten ---------- */
  var learn = null;
  function keyName(e) { return e.key && e.key !== 'Unidentified' ? e.key : 'code:' + (e.code || e.keyCode); }
  document.addEventListener('keydown', function (e) {
    var kn = keyName(e);
    $('lastKey').textContent = 'Letzte Taste: ' + kn;
    if (learn) { e.preventDefault(); ['A', 'B', 'U'].forEach(function (x) { set.keys[x] = set.keys[x].filter(function (y) { return y !== kn; }); });
      set.keys[learn].push(kn); learn = null; saveSet(); renderKeys(); return; }
    if ($('start').classList.contains('show')) return;
    if ($('settings').classList.contains('show')) { if (kn === 'Escape') closeSettings(); return; }
    var hit = null; ['A', 'B', 'U'].forEach(function (x) { if (set.keys[x].indexOf(kn) >= 0 || set.keys[x].indexOf(kn.toLowerCase()) >= 0) hit = x; });
    if (!hit) return;
    e.preventDefault();
    if (e.repeat) return;
    if (hit === 'U') undo(); else btnPoint(hit === 'A' ? 0 : 1, 'key');
  });
  function renderKeys() {
    var rows = [['A', 'Punkt ' + set.nameA], ['B', 'Punkt ' + set.nameB], ['U', 'Rückgängig']], h = '';
    rows.forEach(function (r) {
      h += '<span>' + esc(r[1]) + '</span><span>' + set.keys[r[0]].map(function (k) { return '<code>' + esc(k === ' ' ? 'Leertaste' : k) + '</code>'; }).join(' ') + '</span>' +
        '<button class="btn" data-learn="' + r[0] + '">' + (learn === r[0] ? 'Taste drücken…' : 'Taste lernen') + '</button>';
    });
    h += '<span></span><span></span><button class="btn" id="kReset">Standard</button>';
    $('keys').innerHTML = h;
  }
  $('keys').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'kReset') { set.keys = JSON.parse(JSON.stringify(DEF_KEYS)); saveSet(); }
    else learn = b.getAttribute('data-learn');
    renderKeys();
  });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Bildschirm an lassen ---------- */
  var lock = null;
  function wake() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !lock) wake(); });
  document.addEventListener('pointerdown', function () { if (!lock) wake(); }, { passive: true });
  wake();

  $('bFull').onclick = function () {
    var d = document.documentElement;
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen ? d.webkitRequestFullscreen() : null);
    if (p && p.then) p.then(function () { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); }).catch(function () {});
    wake();
  };

  /* ---------- Einstellungen ---------- */
  function openSettings() {
    $('iA').value = set.nameA; $('iB').value = set.nameB;
    $('cTap').checked = !!set.tap; $('cLight').checked = !!set.light; $('cBeep').checked = !!set.beep; $('cDbl').checked = !!set.dbl; $('rDbl').value = set.dblMs; $('vDbl').textContent = (set.dblMs / 1000).toFixed(1).replace('.', ',') + ' s';
    [].forEach.call($('segBest').children, function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === st.cfg.bestOf); });
    renderKeys();
    $('settings').classList.add('show');
  }
  function closeSettings() { learn = null; $('settings').classList.remove('show'); render(); }
  $('bSet').onclick = openSettings; $('sClose').onclick = closeSettings;
  function nm() { set.nameA = $('iA').value.trim() || 'Artur'; set.nameB = $('iB').value.trim() || 'Kamila'; saveSet(); render(); renderKeys(); }
  $('iA').oninput = nm; $('iB').oninput = nm;
  [].forEach.call(document.querySelectorAll('[data-names]'), function (b) { b.onclick = function () { var p = b.getAttribute('data-names').split('|'); $('iA').value = p[0]; $('iB').value = p[1]; nm(); }; });
  $('bSwap').onclick = function () { set.swap = !set.swap; saveSet(); render(); banner('Seiten getauscht'); };
  $('segBest').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; st = S.setBestOf(st, +b.getAttribute('data-v')); saveState(); render(); openSettings(); };
  $('cTap').onchange = function () { set.tap = this.checked; saveSet(); };
  $('cLight').onchange = function () { set.light = this.checked; saveSet(); render(); };
  $('cBeep').onchange = function () { set.beep = this.checked; saveSet(); if (set.beep) beep(); };
  $('cDbl').onchange = function () { set.dbl = this.checked; saveSet(); };
  $('rDbl').oninput = function () { set.dblMs = +this.value; $('vDbl').textContent = (set.dblMs / 1000).toFixed(1).replace('.', ',') + ' s'; saveSet(); };
  $('bNew').onclick = function () { if (confirm('Neues Match starten? Der aktuelle Stand wird gelöscht.')) { newMatch(); closeSettings(); banner('Neues Match'); } };

  window.addEventListener('storage', function (e) { if (e.key === LS_STATE && e.newValue) { st = JSON.parse(e.newValue); render(); } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});

  render(); if (st.setup) openStart();
  window.__sq = { state: function () { return st; }, settings: function () { return set; }, summary: function () { return S.summary(st); } };
})();
