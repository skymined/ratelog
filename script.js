(function () {
  'use strict';

  // ---- theme toggle ----
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = current ? current === 'dark' : prefersDark;
      var next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('ratelog-theme', next);
    });
  }

  // ---- mobile nav ----
  var navToggle = document.getElementById('mobile-nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
  }

  // ---- ledger table: filter + sort (progressive enhancement over static rows) ----
  var tbody = document.getElementById('ledger-body');
  if (!tbody) return;

  var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
  var emptyMsg = document.getElementById('ledger-empty');
  var chips = Array.prototype.slice.call(document.querySelectorAll('#filter-chips .chip[data-filter]'));
  var freeToggle = document.getElementById('free-tier-toggle');
  var sortSelect = document.getElementById('sort-select');
  var activeFilter = 'all';
  var freeOnly = false;

  function applyFilterAndSort() {
    var visible = rows.filter(function (row) {
      if (freeOnly && row.getAttribute('data-free') !== '1') return false;
      if (activeFilter === 'all') return true;
      return row.getAttribute('data-category') === activeFilter;
    });

    var sortVal = sortSelect ? sortSelect.value : 'default';
    if (sortVal === 'price-asc') {
      visible.sort(function (a, b) { return (+a.getAttribute('data-price')) - (+b.getAttribute('data-price')); });
    } else if (sortVal === 'price-desc') {
      visible.sort(function (a, b) { return (+b.getAttribute('data-price')) - (+a.getAttribute('data-price')); });
    } else if (sortVal === 'changed') {
      visible.sort(function (a, b) {
        var da = a.getAttribute('data-changed') || '0000-00-00';
        var db = b.getAttribute('data-changed') || '0000-00-00';
        return db.localeCompare(da);
      });
    }

    rows.forEach(function (row) { row.style.display = 'none'; });
    visible.forEach(function (row) { tbody.appendChild(row); row.style.display = ''; });
    if (emptyMsg) emptyMsg.style.display = visible.length ? 'none' : 'block';
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      activeFilter = chip.getAttribute('data-filter');
      applyFilterAndSort();
    });
  });

  if (freeToggle) {
    freeToggle.addEventListener('click', function () {
      freeOnly = !freeOnly;
      freeToggle.setAttribute('aria-pressed', String(freeOnly));
      applyFilterAndSort();
    });
  }

  if (sortSelect) sortSelect.addEventListener('change', applyFilterAndSort);
})();
