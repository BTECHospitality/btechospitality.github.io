/* Thoddoo School · BTEC Hospitality — site behaviour */
(function () {
  'use strict';

  /* ============ SETTINGS — edit these ============ */
  var CONFIG = {
    // WhatsApp number in international format, digits only, e.g. '9607771234'.
    // Leave empty ('') to hide the WhatsApp buttons.
    whatsapp: '',
    viber: '',
    // Where the enquiry form sends its email.
    email: 'admin@thoddooschool.edu.mv',
    // The form is delivered by FormSubmit (formsubmit.co), a form-to-email service.
    // The first enquiry sent from the live website triggers a one-time activation
    // email to the address above: open it and click "Activate Form".
    // Set to '' to switch back to opening the visitor's own email app.
    formEndpoint: 'https://formsubmit.co/ajax/'
  };
  /* =============================================== */

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero video: only on larger screens with normal data use ---------- */
  var hv = $('.hero-video');
  if (hv) {
    var saveData = navigator.connection && navigator.connection.saveData;
    var wide = matchMedia('(min-width: 821px)');
    var startHero = function () {
      if (reduce || saveData || !wide.matches || hv.getAttribute('src')) return;
      hv.src = hv.getAttribute('data-src');
      hv.preload = 'auto';
      var p = hv.play(); if (p && p.catch) p.catch(function () {});
    };
    startHero();
    if (wide.addEventListener) wide.addEventListener('change', startHero);   // also start if the window is widened later
  }

  /* ---------- Theme toggle ---------- */
  var themeBtn = $('.theme-toggle');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncThemeLabel() {
    if (themeBtn) themeBtn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncThemeLabel();
    });
    syncThemeLabel();
  }

  /* ---------- Mobile menu ---------- */
  var mb = $('.menu-btn'), nav = $('#nav');
  function closeMenu() { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); }
  mb.addEventListener('click', function () {
    var o = nav.classList.toggle('open');
    mb.setAttribute('aria-expanded', o);
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !mb.contains(e.target)) closeMenu();
  });

  /* ---------- Header shadow + back to top ---------- */
  var header = $('header.main'), topBtn = $('.fab.top');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('scrolled', y > 10);
    if (topBtn) topBtn.classList.toggle('show', y > 900);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- Active nav link ---------- */
  var links = $$('a[href^="#"]', nav);
  if ('IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s) map[s.id] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- Scroll reveal ---------- */
  var revealSel = '.head, .split > *, .pillar, .strand, .three > div, .feature, .news article, .quote, .alum, .step, .career, .roles-head, .faq-grid > *, .partner, .contact-grid > *, .work-tabs';
  if ('IntersectionObserver' in window && !reduce) {
    var groups = {};
    $$(revealSel).forEach(function (el) {
      el.classList.add('reveal');
      // stagger siblings slightly
      var p = el.parentNode, k = p.__rk || (p.__rk = Math.random());
      groups[k] = (groups[k] || 0) + 1;
      el.style.setProperty('--d', Math.min(groups[k] - 1, 6) * 0.07 + 's');
    });
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach(function (el) { ro.observe(el); });
  }

  /* ---------- Gallery: filters, show-more and a gap-free justified layout ---------- */
  // The first photos in the page are the best ones. Every row is scaled so it fills the full width exactly (no gaps, no cropping).
  var galEl = $('#gallery .gal'), items = $$('#gallery .gal button'), expanded = false, FIRST = 12, lastW = 0;
  var moreWrap = $('.gal-more'), moreBtn = moreWrap && $('button', moreWrap);
  if (galEl) galEl.classList.add('justified');
  function ratioOf(b) {
    var m = b.querySelector('img'), w = +m.getAttribute('width') || m.naturalWidth || 4, h = +m.getAttribute('height') || m.naturalHeight || 3;
    return Math.max(0.45, Math.min(3.2, w / h));
  }
  function partition(r, k) {                      // split the photos into k consecutive rows of similar total width
    var n = r.length, P = [0], i, j, row;
    for (i = 0; i < n; i++) P.push(P[i] + r[i]);
    var target = P[n] / k, INF = 1e12, dp = [], cut = [];
    for (row = 0; row <= k; row++) { dp.push([]); cut.push([]); for (j = 0; j <= n; j++) { dp[row].push(INF); cut[row].push(0); } }
    dp[0][0] = 0;
    for (row = 1; row <= k; row++) for (j = row; j <= n; j++) for (i = row - 1; i < j; i++) {
      var s = P[j] - P[i], c = dp[row - 1][i] + (s - target) * (s - target);
      if (c < dp[row][j]) { dp[row][j] = c; cut[row][j] = i; }
    }
    var rows = [], end = n;
    for (row = k; row >= 1; row--) { var st = cut[row][end]; rows.unshift([st, end]); end = st; }
    return rows;
  }
  function justify(el, vis) {                      // fill every row of el to the full width with the photos in vis
    var W = el.clientWidth; if (!vis.length || !W) return 0;
    var gap = W < 560 ? 6 : 10, T = W < 560 ? 150 : (W < 900 ? 200 : 250);
    var r = vis.map(ratioOf), S = r.reduce(function (a, b) { return a + b; }, 0);
    var k = Math.max(1, Math.min(vis.length, Math.round(S * T / W)));
    el.style.gap = gap + 'px';
    partition(r, k).forEach(function (rg) {
      var cnt = rg[1] - rg[0], sum = 0, q;
      for (q = rg[0]; q < rg[1]; q++) sum += r[q];
      var h = (W - gap * (cnt - 1) - 1) / sum;
      for (q = rg[0]; q < rg[1]; q++) { vis[q].style.width = (Math.floor(r[q] * h * 100) / 100) + 'px'; vis[q].style.height = (Math.round(h * 100) / 100) + 'px'; }
    });
    return W;
  }
  function layoutGallery() {
    if (!galEl) return;
    var vis = items.filter(function (b) { return !b.hidden && !b.classList.contains('collapsed'); });
    lastW = justify(galEl, vis) || lastW;
  }
  // every batch gallery under "Work by batch" uses the same gap-free layout (it is laid out when its batch is opened)
  $$('.work-gal').forEach(function (g) {
    var tiles = $$('button', g); if (!tiles.length) return;
    g.classList.add('justified');
    var wLast = 0, run = function () { var w = g.clientWidth; if (w && w !== wLast) { wLast = justify(g, tiles); } };
    if (window.ResizeObserver) new ResizeObserver(run).observe(g);
    window.addEventListener('resize', run);
    g.__relayout = function () { wLast = 0; run(); };
  });
  function applyLimit() {
    var shown = items.filter(function (i) { return !i.hidden; });
    var collapse = !expanded && shown.length > FIRST + 2;
    shown.forEach(function (i, n) { i.classList.toggle('collapsed', collapse && n >= FIRST); });
    if (moreWrap) {
      moreWrap.hidden = !collapse;
      if (moreBtn) moreBtn.firstChild.nodeValue = 'View all ' + shown.length + ' photos ';
    }
    layoutGallery();
  }
  $$('.filters button').forEach(function (b) {
    var f = b.dataset.f, n = f === 'all' ? items.length : items.filter(function (i) { return i.dataset.c === f; }).length;
    var ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = n; b.appendChild(ct);
    b.addEventListener('click', function () {
      $$('.filters button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      expanded = false;
      items.forEach(function (i) {
        var show = f === 'all' || i.dataset.c === f;
        i.hidden = !show;
        if (show) { i.classList.remove('pop'); void i.offsetWidth; i.classList.add('pop'); }
      });
      applyLimit();
    });
  });
  if (moreBtn) moreBtn.addEventListener('click', function () { expanded = true; applyLimit(); });
  applyLimit();
  if (window.ResizeObserver && galEl) new ResizeObserver(function () { if (galEl.clientWidth !== lastW) layoutGallery(); }).observe(galEl);
  window.addEventListener('resize', function () { if (galEl && galEl.clientWidth !== lastW) layoutGallery(); });

  /* ---------- Lightbox ---------- */
  var d = $('#lb'), im = $('#lbi'), cp = $('#lbc'), cnt = $('#lbcount'), cur = 0, curList = items;
  function vis() { return curList.filter(function (i) { return !i.hidden && !i.classList.contains('collapsed'); }); }
  function fullSrc(btn) { var m = btn.querySelector('img'); return m.getAttribute('data-full') || m.currentSrc || m.src; }
  function show(btn) {
    var m = btn.querySelector('img'), v = vis();
    im.classList.add('loading');
    im.onload = function () { im.classList.remove('loading'); };
    im.src = fullSrc(btn); im.alt = m.alt;
    cp.textContent = btn.querySelector('span').textContent;
    cur = v.indexOf(btn);
    if (cnt) cnt.textContent = (cur + 1) + ' / ' + v.length;
    // preload neighbours so next/previous feel instant
    [1, -1].forEach(function (k) { var nb = v[(cur + k + v.length) % v.length]; if (nb) (new Image()).src = fullSrc(nb); });
  }
  function step(n) { var v = vis(); if (v.length) show(v[(cur + n + v.length) % v.length]); }
  $$('.gal button').forEach(function (b) {
    b.addEventListener('click', function () {
      curList = $$('button', b.parentNode);
      show(b);
      try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    });
  });
  $('#lbp').onclick = function () { step(-1); };
  $('#lbn').onclick = function () { step(1); };
  $('#lbx').onclick = function () { d.close(); };
  d.addEventListener('click', function (e) { if (e.target === d || e.target.classList.contains('lb-stage')) d.close(); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  // swipe on phones
  var sx = null;
  im.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  im.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    sx = null;
  });

  /* ---------- Learner work: batch cards, closed until clicked ---------- */
  var tabs = $$('.work-tabs button');
  $$('.work-panel').forEach(function (p) { if (p.querySelector('.work-gal button')) p.querySelector('.work-empty').hidden = true; });
  tabs.forEach(function (t) {
    var panel = document.getElementById(t.getAttribute('aria-controls'));
    var photos = $$('.work-gal button', panel).length, videos = $$('video', panel).length;
    var first = $('.work-gal img', panel);
    var label = t.textContent.replace(/\s*Batch\s*$/, '');
    var bits = [];
    if (photos) bits.push(photos + ' photo' + (photos > 1 ? 's' : ''));
    if (videos) bits.push(videos + ' video' + (videos > 1 ? 's' : ''));
    t.innerHTML =
      '<span class="b-cover">' + (first ? '<img src="' + first.getAttribute('src') + '" alt="" loading="lazy">' : '<em>Coming soon</em>') + '</span>' +
      '<span class="b-body"><small>Batch</small><b>' + label + '</b><i>' + (bits.length ? bits.join(' · ') : 'Photos coming soon') + '</i></span>' +
      '<span class="b-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>';
    t.setAttribute('aria-label', label + ' batch, ' + (bits.join(', ') || 'photos coming soon'));
    t.addEventListener('click', function () {
      var open = t.getAttribute('aria-expanded') !== 'true';
      tabs.forEach(function (x) {
        x.setAttribute('aria-expanded', 'false');
        document.getElementById(x.getAttribute('aria-controls')).hidden = true;
      });
      $$('.work-panel video').forEach(function (v) { v.pause(); });
      if (open) {
        t.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        $$('.work-gal', panel).forEach(function (g) { if (g.__relayout) g.__relayout(); });
        setTimeout(function () { panel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }, 60);
      }
    });
  });
  // close button inside each open batch
  $$('.work-panel').forEach(function (p) {
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'work-close';
    x.innerHTML = 'Close batch <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () {
      var t = document.querySelector('[aria-controls="' + p.id + '"]');
      t.click(); t.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
    p.insertBefore(x, p.firstChild);
  });

  /* ---------- WhatsApp ---------- */
  var waNum = (CONFIG.whatsapp || '').replace(/\D/g, '');
  $$('[data-wa]').forEach(function (el) {
    if (!waNum) { el.hidden = true; return; }
    if (el.tagName === 'A') el.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('Hello, I would like to ask about the BTEC Hospitality programme at Thoddoo School.');
  });

  /* ---------- Viber ---------- */
  var vbNum = (CONFIG.viber || '').replace(/\D/g, '');
  var vbLink = 'viber://chat?number=%2B' + vbNum;
  var vbDlg = $('#vb');
  function openVbHelp() {
    if (!vbDlg) return;
    try { vbDlg.showModal(); } catch (e) { vbDlg.setAttribute('open', ''); }
  }
  function tryViber(e) {
    e.preventDefault();
    var left = false;
    function gone() { left = true; }
    window.addEventListener('blur', gone, { once: true });
    document.addEventListener('visibilitychange', gone, { once: true });
    try { window.location.href = vbLink; } catch (err) {}
    // If the page is still in front after 1.5s, Viber did not open: show help.
    setTimeout(function () {
      window.removeEventListener('blur', gone);
      document.removeEventListener('visibilitychange', gone);
      if (!left && !document.hidden) openVbHelp();
    }, 1500);
  }
  $$('[data-viber]').forEach(function (el) {
    if (!vbNum) { (el.closest('.cards > div') || el).hidden = true; return; }
    el.href = vbLink;
    el.addEventListener('click', tryViber);
  });
  if (vbDlg) {
    var pretty = '+' + vbNum.slice(0, 3) + ' ' + vbNum.slice(3, 6) + ' ' + vbNum.slice(6);
    $('#vb-num').textContent = pretty;
    $('#vb-open').href = vbLink;
    $('#vb-x').onclick = function () { vbDlg.close(); };
    vbDlg.addEventListener('click', function (e) { if (e.target === vbDlg) vbDlg.close(); });
    $('#vb-copy').onclick = function () {
      var btn = this, done = function () { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = 'Copy number'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('+' + vbNum).then(done, function () { selectNum(); });
      } else { selectNum(); }
      function selectNum() {
        var r = document.createRange(); r.selectNodeContents($('#vb-num'));
        var s = getSelection(); s.removeAllRanges(); s.addRange(r);
        try { document.execCommand('copy'); done(); } catch (e) {}
      }
    };
  }

  /* ---------- Enquiry form: sends the message to the school office ---------- */
  var form = $('#enquiry');
  if (form) {
    var statusEl = $('.status', form), sendBtn = $('button[type="submit"]', form), btnLabel = $('.btn-label', form);
    function setStatus(msg, kind) { statusEl.textContent = msg; statusEl.className = 'status' + (kind ? ' ' + kind : ''); }
    function compose() {
      var f = form.elements;
      return {
        subject: 'BTEC Hospitality enquiry: ' + f.topic.value,
        body: 'Name: ' + f.name.value + '\n' +
              (f.phone.value ? 'Phone: ' + f.phone.value + '\n' : '') +
              'Email: ' + f.email.value + '\n' +
              'Enquiry type: ' + f.topic.value + '\n\n' + f.message.value
      };
    }
    function openEmailApp(note) {
      var m = compose();
      window.location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
      setStatus(note + ' You can also email ' + CONFIG.email + ' directly.', 'warn');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var f = form.elements;
      if (f._honey && f._honey.value) return;               // spam bots fill this hidden field
      var online = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      if (!CONFIG.formEndpoint || !online) {
        openEmailApp(online ? 'Your email app should open with the message ready to send.' : 'Direct sending starts working once the website is published online. For now your email app should open with the message ready.');
        return;
      }
      sendBtn.disabled = true; if (btnLabel) btnLabel.textContent = 'Sending…';
      setStatus('Sending your enquiry…');
      fetch(CONFIG.formEndpoint + encodeURIComponent(CONFIG.email), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: 'BTEC Hospitality enquiry: ' + f.topic.value,
          _template: 'table', _captcha: 'false', _replyto: f.email.value,
          Name: f.name.value, Phone: f.phone.value || '-', Email: f.email.value,
          'Enquiry type': f.topic.value, Message: f.message.value
        })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && String(res.j.success) === 'true') {
            form.reset();
            setStatus('Thank you. Your enquiry has been sent to the school office, and we will reply by email.', 'ok');
          } else { throw new Error((res.j && res.j.message) || 'not sent'); }
        })
        .catch(function () { openEmailApp('We could not send the form just now, so your email app should open with the message ready.'); })
        .then(function () { sendBtn.disabled = false; if (btnLabel) btnLabel.textContent = 'Send enquiry'; });
    });
    var waBtn = $('[data-wa-form]', form);
    if (waBtn) {
      if (!waNum) waBtn.hidden = true;
      waBtn.addEventListener('click', function () {
        if (!form.reportValidity()) return;
        var m = compose();
        window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(m.subject + '\n\n' + m.body), '_blank', 'noopener');
      });
    }
  }

  /* ---------- Year in footer ---------- */
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
