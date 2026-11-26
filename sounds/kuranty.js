/* Куранты колокольни на табло архондарика (stpanteleimon.gr/tv/) и кнопка курантов на экране архондарика (Папа 21.11).
   Как на колокольне: каждые 15 минут перезвон (1, 2, 3 раза через 3,8 с), в начале часа — 4 перезвона и удары часового колокола (1–12, через 4 с).
   По времени обители (византийскому) или мирскому — как выбрал архондарик (сервер: apiTvState / apiTvSet { chime: 'off' | 'byz' | 'wall' }).
   Страница первой версии даёт window.SPTk: now, byz, wall (часы), ctx (звук), tv() (это табло?), ar() (состояние табло у архондарика),
   set(op) (сохранить), msg (строка сообщения), gas (сервер). Сюда же пишем e (когда кончится перезвон — колокол за ним) и h() (держать колокол). */
(function () {
  'use strict';
  var K = window.SPTk;
  if (!K || K.kur) return;
  K.kur = 1;
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var PER = 3.8, GAP = 1.2, STEP = 4.0;
  var mode = '', bufs = null, loading = null, last = '';
  var NAME = { byz: 'по времени обители', wall: 'по мирскому времени', off: 'выключены' };
  K.km = function (m) { return 'Куранты на табло: ' + (NAME[m] || NAME.off) + '.'; };

  /* ---------- табло: звук ---------- */
  function load() {
    var ctx = K.ctx();
    if (!ctx) return Promise.reject(new Error('no audio'));
    if (bufs) return Promise.resolve(bufs);
    if (!loading) {
      var one = function (n) {
        return fetch('https://stpanteleimon.gr/sounds/' + n).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
          .then(function (ab) { return new Promise(function (ok, bad) { var p = ctx.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); }); });
      };
      loading = Promise.all([one('perezvon.mp3'), one('chasy.mp3')]).then(function (b) { return (bufs = { ph: b[0], st: b[1] }); })
        .catch(function (e) { loading = null; throw e; });
    }
    return loading;
  }
  /* n: 1–3 — четверти, 101–112 — час */
  function play(n) {
    return load().then(function (B) {
      var ctx = K.ctx();
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      var t0 = Math.max(ctx.currentTime + 0.05, K.e || 0), k = n > 100 ? 4 : n, end = t0;
      var at = function (buf, t) { var s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(t); end = Math.max(end, t + buf.duration); };
      for (var i = 0; i < k; i++) at(B.ph, t0 + i * PER);
      if (n > 100) for (var j = 0; j < n - 100; j++) at(B.st, t0 + 4 * PER + GAP + j * STEP);
      K.e = end;
    });
  }
  var minOf = function (ms) { return mode === 'wall' ? mod(K.wall(ms), 720) : K.byz(ms); };
  /* колокол перед службой ждёт перезвона той же четверти (до неё полторы минуты) — потом звонит сразу за ним */
  K.h = function () { return !!mode && K.tv() && mod(minOf(K.now()), 15) > 13.5; };
  function tick() {
    if (K.tv() && mode) {
      var ms = K.now(), b = minOf(ms), r = mod(b, 15);
      if (r <= 1.2) {
        var key = mode + Math.round(ms / 6e4 - r);
        if (key !== last) {
          last = key;
          var q = Math.round((b - r) / 15) % 48;
          play(q % 4 ? q % 4 : 100 + (q / 4 || 12)).catch(function () {});
        }
      }
    }
    arBtn();
  }
  function stLoad() {
    if (!K.tv()) return;
    K.gas('apiTvState', []).then(function (r) {
      if (!r || !r.ok) return;
      var was = mode;
      mode = r.chime === 'byz' || r.chime === 'wall' ? r.chime : '';
      if (mode && mode !== was) {
        load().catch(function () {});
        last = mode + Math.round(K.now() / 6e4 - mod(minOf(K.now()), 15));   // включили (или табло перезапустили) посреди четверти — бьём со следующей
      }
    }).catch(function () { /* без связи — как было */ });
  }

  /* ---------- экран архондарика: кнопка курантов рядом с колоколом и паромом ---------- */
  var SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6a9.4 9.4 0 1 1 0 18.8 9.4 9.4 0 0 1 0-18.8zm0 2.2a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4zm1.1 2.6v4.2l3 1.9-1.2 1.8-4-2.6V7.4z"/></svg>';
  var css = document.createElement('style');
  css.textContent = '.ar-tv-i[data-ar-kur]{position:relative}.ar-tv-i[data-ar-kur] b{position:absolute;right:-3px;bottom:-3px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#1C6650;color:#fff;font:600 10px/18px system-ui,sans-serif;text-align:center}.ar-tv-i[data-ar-kur].is-off b{display:none}';
  document.head.appendChild(css);
  var NEXT = { off: 'byz', byz: 'wall', wall: 'off' };
  var DO = { off: 'включить по времени обители', byz: 'по мирскому времени', wall: 'выключить' };
  function arBtn() {
    var box = document.getElementById('ar-tv'), s = K.ar();
    if (!box || !s || box.hidden) return;
    var b = box.querySelector('[data-ar-kur]');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.className = 'ar-tv-i'; b.setAttribute('data-ar-kur', '');
      b.addEventListener('click', function () { var cur = (K.ar() || {}).chime || 'off'; K.set({ chime: NEXT[cur] || 'byz' }); K.msg(K.km(NEXT[cur] || 'byz')); arBtn(); });
      box.appendChild(b);
    }
    var m = NAME[s.chime] ? s.chime : 'off', t = K.km(m) + ' Нажмите — ' + DO[m] + '.';
    if (b.dataset.m === m) return;
    b.dataset.m = m;
    b.innerHTML = SVG + '<b>' + (m === 'byz' ? 'В' : m === 'wall' ? 'М' : '') + '</b>';
    b.classList.toggle('is-off', m === 'off');
    b.setAttribute('aria-pressed', String(m !== 'off'));
    b.title = t; b.setAttribute('aria-label', t);
  }
  var box0 = document.getElementById('ar-tv');
  if (box0 && window.MutationObserver) new MutationObserver(function () { var b = box0.querySelector('[data-ar-kur]'); if (!b) arBtn(); }).observe(box0, { childList: true });

  /* ---------- колокол перед службами (Папа 21.11, 21:34: «чтобы везде было одинаково» — как в приложении и во второй версии) ----------
     За 30 минут до службы — 33 удара; перед бдением, перед воскресной утренней службой и перед литургией после бдения — весь
     праздничный звон (12 мин; перед бдением — за 15 минут, Папа 25.11); в день бдения после утренней трапезы (трапеза — 25 минут) — 12 ударов. Записи — те же, что в приложении
     (sounds/kolokol33.mp3, zvon.mp3, kolokol12.mp3); играет <audio>. Страница даёт: p (расписание ночи), k (прежние удары — запасной путь),
     o() (колокол включён / табло звонит), x(e) (до какого мига звучит — для кнопки «остановить»); сюда она зовёт b(служба), m(минуты, разница), s(). */
  var BF = { n: 'kolokol33.mp3', v: 'zvon.mp3', 12: 'kolokol12.mp3' }, aud = null;
  var idxOf = function (ymd) { var a = ymd.split('-').map(Number); return Math.round(Date.UTC(a[0], a[1] - 1, a[2]) / 864e5); };
  var ymdOf = function (i) { return new Date(i * 864e5).toISOString().slice(0, 10); };
  function kindOf(s) {
    var sun = s.D && new Date((idxOf(s.D) + 1) * 864e5 + 432e5).getUTCDay() === 0;
    return s.svc === 'vigil' || s.svc === 'liturgy' || (s.svc === 'morning' && sun) ? 'v' : 'n';
  }
  function audio(k) {
    if (aud && aud._k === k) return aud;
    if (aud) { try { aud.pause(); } catch (e) { /* ignore */ } }
    var a = new Audio(); a._k = k; a.preload = 'auto'; a.src = 'https://stpanteleimon.gr/sounds/' + BF[k];
    a.addEventListener('playing', function () { var c = K.ctx(); if (c && K.x) K.x(c.currentTime + Math.max(1, (a.duration || 900) - a.currentTime)); });
    a.addEventListener('pause', function () { if (K.x) K.x(0); });
    a.addEventListener('ended', function () { if (K.x) K.x(0); });
    return (aud = a);
  }
  function ring(k) {
    if (mode && K.tv() && mod(minOf(K.now()), 15) < 0.05) { setTimeout(function () { ring(k); }, 3000); return; }   // перезвон этой четверти только начинается — колокол за ним
    var a = audio(k), c = K.ctx(), w = c ? Math.max(0, (K.e || 0) - c.currentTime) : 0;
    setTimeout(function () {
      try { a.currentTime = 0; } catch (e) { /* ignore */ }
      var p = a.play();
      if (p && p.catch) p.catch(function () { if (K.k) K.k(12).catch(function () {}); });   // браузер не дал звук записью — прежние удары
    }, w * 1000 + 60);
  }
  K.s = function () { if (aud) { try { aud.pause(); aud.currentTime = 0; } catch (e) { /* ignore */ } } };
  K.b = function (s) { ring(kindOf(s)); };
  /* D — ночь бдения (бдение вечером дня D); трапеза — утром того же дня, по расписанию ночи D−1; ответ — абсолютные минуты, как nowAbs */
  function mealAt(D, dif) {
    if (!K.p(D, dif).vigil) return null;
    var D0 = ymdOf(idxOf(D) - 1), rows = K.p(D0, dif).rows, vg = K.p(D0, dif).vigil, m = null, r = null, i;
    var find = function (f) { for (i = 0; i < rows.length; i++) if (f(rows[i])) return rows[i]; return null; };
    if (vg) { r = find(function (x) { return x.svc === 'liturgy'; }); if (r && r.c0 != null) m = r.c0 + r.dur; }   // накануне тоже бдение — трапеза после литургии
    else {
      r = find(function (x) { return x.k === 'breakfast' && x.c0 != null; });   // зимой в будни — точное время трапезы
      if (r) m = r.c0;
      else { r = find(function (x) { return x.svc === 'morning'; }); if (r && r.c0 != null) m = r.c0 + r.dur; }   // иначе — сразу после утренней службы
    }
    return m == null ? null : idxOf(D0) * 1440 + m + 25;   // трапеза — 25 минут (Папа 25.11, было 15)
  }
  K.m = function (nowAbs, dif) {
    if (!K.o || !K.o() || dif == null || !K.p) return;
    var at = mealAt(ymdOf(Math.floor(nowAbs / 1440)), dif);
    if (at == null) return;
    var left = at - nowAbs;
    if (left > 0 && left < 3) { if (!aud || aud.paused) audio('12'); return; }   // за 3 минуты — запись подгружается
    if (left > 0 || left <= -5) return;
    var key = 'm' + at;
    try { if (localStorage.getItem('svc-bell-meal') === key) return; localStorage.setItem('svc-bell-meal', key); } catch (e) { return; }
    ring('12');
  };

  setInterval(tick, 1000);
  setInterval(stLoad, 60000);
  stLoad(); tick();
})();
