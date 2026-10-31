/* Victor Mawira — portfolio behaviour (vanilla JS, no dependencies).
   Everything here is progressive enhancement: the page is fully
   readable without it. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Theme toggle (persisted) ---------- */
  var themeBtn = $('#theme-toggle');

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0B0F14');
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(theme === 'light'));
      var label = $('.theme-label', themeBtn);
      if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
    }
  }

  applyTheme(currentTheme());

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
    });
  }

  /* ---------- Footer year ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Project filtering (category buttons + tech tags) ---------- */
  var projectList = $('#project-list');
  var projects = projectList ? $$('.project', projectList) : [];
  var projectFilters = $('[data-filter-target="projects"]');
  var tagStatus = $('#tag-status');
  var tagStatusName = $('#tag-status-name');
  var tagClear = $('#tag-clear');
  var emptyMsg = $('#projects-empty');
  var live = $('#projects-live');

  var state = { cat: 'all', tag: '' };

  function words(str) { return (str || '').split(/\s+/).filter(Boolean); }

  function renderProjects() {
    var shown = 0;
    projects.forEach(function (card) {
      var catOk = state.cat === 'all' || words(card.getAttribute('data-cat')).indexOf(state.cat) !== -1;
      var tagOk = !state.tag || words(card.getAttribute('data-tags')).indexOf(state.tag) !== -1;
      var visible = catOk && tagOk;
      card.hidden = !visible;
      if (visible) shown++;
    });

    if (projectFilters) {
      $$('.filter-btn', projectFilters).forEach(function (btn) {
        var on = !state.tag && btn.getAttribute('data-filter') === state.cat;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    }

    $$('[data-tag]').forEach(function (el) {
      el.classList.toggle('is-active', !!state.tag && el.getAttribute('data-tag') === state.tag);
    });

    if (tagStatus) {
      tagStatus.hidden = !state.tag;
      if (tagStatusName) tagStatusName.textContent = state.tag;
    }
    if (emptyMsg) emptyMsg.hidden = shown !== 0;
    if (live) live.textContent = shown + (shown === 1 ? ' project shown' : ' projects shown');
  }

  if (projectFilters) {
    projectFilters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      state.cat = btn.getAttribute('data-filter');
      state.tag = '';
      renderProjects();
    });
  }

  function selectTag(tag) {
    state.tag = state.tag === tag ? '' : tag;
    state.cat = 'all';
    renderProjects();
    if (state.tag) {
      var target = $('#projects');
      if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Upgrade chips and card tags into keyboard-accessible buttons
  $$('[data-tag]').forEach(function (el) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('title', 'Filter projects by ' + el.textContent.trim());
    el.addEventListener('click', function () { selectTag(el.getAttribute('data-tag')); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTag(el.getAttribute('data-tag'));
      }
    });
  });

  if (tagClear) {
    tagClear.addEventListener('click', function () {
      state.tag = '';
      renderProjects();
    });
  }

  /* ---------- Certification filtering ---------- */
  var certFilters = $('[data-filter-target="certs"]');
  var certGroups = $$('.cert-group');

  if (certFilters) {
    certFilters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      $$('.filter-btn', certFilters).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      certGroups.forEach(function (g) {
        g.hidden = !(f === 'all' || g.getAttribute('data-cat') === f);
      });
    });
  }

  /* ---------- Copy email to clipboard ---------- */
  var copyBtn = $('#copy-email');
  var emailLink = $('#email-link');
  var copyStatus = $('#copy-status');
  var statusTimer;

  function flash(msg) {
    if (!copyStatus) return;
    copyStatus.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { copyStatus.textContent = ''; }, 2500);
  }

  function fallbackCopy(text) {
    var ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(ta);
    return ok;
  }

  if (copyBtn && emailLink) {
    copyBtn.hidden = false; // only shown when JS is available
    copyBtn.addEventListener('click', function () {
      var text = emailLink.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { flash('Copied!'); },
          function () { flash(fallbackCopy(text) ? 'Copied!' : 'Copy failed'); }
        );
      } else {
        flash(fallbackCopy(text) ? 'Copied!' : 'Copy failed');
      }
    });
  }

  /* ---------- Highlight current section in nav ---------- */
  var navLinks = $$('.primary-nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
        var link = map[entry.target.id];
        if (link) { link.classList.add('is-current'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var sec = doc.getElementById(id);
      if (sec) observer.observe(sec);
    });
  }

  /* ---------- Smooth scroll: CSS handles it (scroll-behavior), disabled
     under prefers-reduced-motion. Move focus to the target for keyboard users. */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;                // "#" placeholder links (blog TODOs)
      var target = doc.getElementById(id);
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      setTimeout(function () { target.focus({ preventScroll: true }); }, 0);
    });
  });

  renderProjects();
})();
