/* Victor Mawira portfolio behaviour. Vanilla JS, progressive enhancement:
   the page reads fine without it. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  var themeBtn = $('#theme-toggle');
  var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function theme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return systemDark && systemDark.matches ? 'dark' : 'light';
  }
  function syncThemeButton() {
    if (!themeBtn) return;
    var next = theme() === 'dark' ? 'light' : 'dark';
    themeBtn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    root.setAttribute('data-theme', theme());
  }
  syncThemeButton();
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = theme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncThemeButton();
    });
  }

  /* ---------- Header border on scroll ---------- */
  var header = $('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- The lab: walk an attack path ---------- */
  var runBtn = $('#lab-run');
  var cmdEl = $('#lab-cmd');
  var textEl = $('#lab-text');
  var progress = $$('.lab-progress li');

  var steps = [
    {
      cmd: '$ nmap -sV -p- 172.16.5.0/24',
      text: 'Recon. A full port scan through the router finds two hosts. The web server is running an outdated app on port 80.',
      found: ['web', 'mail'], hot: ['l-kali-fw', 'l-fw-web', 'l-fw-mail']
    },
    {
      cmd: 'msf6 > use exploit/multi/http/... ; set RHOSTS 172.16.5.10 ; run',
      text: 'Exploit. A vulnerable upload form gives a Meterpreter shell on the web server. First foothold.',
      owned: ['web'], hot: ['l-kali-fw', 'l-fw-web']
    },
    {
      cmd: 'meterpreter > run autoroute -s 10.0.2.0/24',
      text: 'Pivot. The web server has a second network card. Routing through it reveals an internal subnet the attacker could never reach directly.',
      found: ['ldap', 'db'], hot: ['l-web-ldap', 'l-web-db']
    },
    {
      cmd: 'www-data@db:~$ sudo -l   # (root) NOPASSWD: /usr/bin/find',
      text: 'Escalate. Reused credentials open the database host, and a sudo misconfiguration turns www-data into root. Game over, and time to write the report.',
      owned: ['db'], root: ['db'], hot: ['l-web-db']
    }
  ];
  var initial = { cmd: cmdEl ? cmdEl.textContent : '', text: textEl ? textEl.innerHTML : '' };
  var timer = null;
  var stepIndex = -1;

  function node(name) { return $('.node[data-node="' + name + '"]'); }
  function clearLab() {
    $$('.node').forEach(function (n) { n.classList.remove('is-found', 'is-owned', 'is-root'); });
    $$('.links path').forEach(function (p) { p.classList.remove('is-hot'); });
    progress.forEach(function (li) { li.classList.remove('is-done'); });
  }
  function applyStep(i) {
    var s = steps[i];
    $$('.links path').forEach(function (p) { p.classList.remove('is-hot'); });
    (s.hot || []).forEach(function (id) { var p = doc.getElementById(id); if (p) p.classList.add('is-hot'); });
    (s.found || []).forEach(function (n) { var el = node(n); if (el) el.classList.add('is-found'); });
    (s.owned || []).forEach(function (n) { var el = node(n); if (el) el.classList.add('is-owned'); });
    (s.root || []).forEach(function (n) { var el = node(n); if (el) el.classList.add('is-root'); });
    if (progress[i]) progress[i].classList.add('is-done');
    cmdEl.textContent = s.cmd;
    textEl.textContent = s.text;
  }
  function finish() {
    runBtn.disabled = false;
    runBtn.textContent = 'Reset the lab';
    stepIndex = steps.length;
  }
  function run() {
    clearTimeout(timer);
    if (stepIndex >= steps.length) {          // reset
      clearLab();
      cmdEl.textContent = initial.cmd;
      textEl.innerHTML = initial.text;
      runBtn.textContent = 'Run the attack';
      stepIndex = -1;
      return;
    }
    clearLab();
    runBtn.disabled = true;
    stepIndex = 0;
    (function next() {
      applyStep(stepIndex);
      stepIndex++;
      if (stepIndex < steps.length) timer = setTimeout(next, reduceMotion ? 2600 : 2900);
      else timer = setTimeout(finish, 600);
    })();
  }
  if (runBtn && cmdEl && textEl) runBtn.addEventListener('click', run);

  /* ---------- eJPT bars fill when they scroll into view ---------- */
  var bars = $('.bars');
  if (bars) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var barObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { bars.classList.add('is-in'); barObs.disconnect(); }
      }, { threshold: 0.4 });
      barObs.observe(bars);
    } else {
      bars.classList.add('is-in');
    }
  }

  /* ---------- Project filters (category buttons + tool tags) ---------- */
  var list = $('#project-list');
  var projects = list ? $$('.project', list) : [];
  var filters = $('#project-filters');
  var tagStatus = $('#tag-status');
  var tagName = $('#tag-status-name');
  var empty = $('#projects-empty');
  var live = $('#projects-live');
  var state = { cat: 'all', tag: '', tagLabel: '' };

  function words(s) { return (s || '').split(/\s+/).filter(Boolean); }
  var usedTags = {};
  projects.forEach(function (p) { words(p.getAttribute('data-tags')).forEach(function (t) { usedTags[t] = true; }); });

  function render() {
    var shown = 0;
    projects.forEach(function (p) {
      var ok = (state.cat === 'all' || words(p.getAttribute('data-cat')).indexOf(state.cat) !== -1) &&
               (!state.tag || words(p.getAttribute('data-tags')).indexOf(state.tag) !== -1);
      p.hidden = !ok;
      if (ok) shown++;
    });
    if (filters) {
      $$('.chip-btn', filters).forEach(function (b) {
        var on = !state.tag && b.getAttribute('data-filter') === state.cat;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    $$('[data-tag][role="button"]').forEach(function (el) {
      var on = !!state.tag && el.getAttribute('data-tag') === state.tag;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-pressed', String(on));
    });
    if (tagStatus) { tagStatus.hidden = !state.tag; if (tagName) tagName.textContent = state.tagLabel; }
    if (empty) empty.hidden = shown !== 0;
    if (live) live.textContent = shown + (shown === 1 ? ' project shown' : ' projects shown');
  }

  function reset() { state.cat = 'all'; state.tag = ''; render(); }

  if (filters) {
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('.chip-btn');
      if (!b) return;
      state.cat = b.getAttribute('data-filter');
      state.tag = '';
      render();
    });
  }

  function selectTag(el) {
    var tag = el.getAttribute('data-tag');
    var fromSkills = !!el.closest('#skills');
    state.tag = state.tag === tag ? '' : tag;
    state.tagLabel = el.textContent.trim();
    state.cat = 'all';
    render();
    if (state.tag && fromSkills) {
      var target = $('#work');
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  // Only tags that match at least one project become buttons.
  $$('[data-tag]').forEach(function (el) {
    if (!usedTags[el.getAttribute('data-tag')]) return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-pressed', 'false');
    el.setAttribute('title', 'Show projects that use ' + el.textContent.trim());
    el.addEventListener('click', function () { selectTag(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTag(el); }
    });
  });
  var clearBtn = $('#tag-clear');
  if (clearBtn) clearBtn.addEventListener('click', reset);
  $$('[data-reset]').forEach(function (b) { b.addEventListener('click', reset); });

  /* ---------- Copy email ---------- */
  var copyBtn = $('#copy-email');
  var emailLink = $('#email-link');
  var copyStatus = $('#copy-status');
  var flashTimer;
  function flash(msg) {
    if (!copyStatus) return;
    copyStatus.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { copyStatus.textContent = ''; }, 2500);
  }
  if (copyBtn && emailLink && navigator.clipboard) {
    copyBtn.hidden = false;
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(emailLink.textContent.trim()).then(
        function () { flash('Email copied'); },
        function () { flash('Copy failed. Select the address instead.'); }
      );
    });
  }

  /* ---------- Current section in nav ---------- */
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
        var link = map[entry.target.id];
        if (link) { link.classList.add('is-current'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) navObs.observe(s); });
  }

  render();
})();
