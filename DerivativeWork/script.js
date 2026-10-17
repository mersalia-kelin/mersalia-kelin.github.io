(function () {
  /* ===== 主题切换 ===== */
  var dots = document.querySelectorAll('.theme-dot');
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var theme = dot.getAttribute('data-theme');
      document.body.setAttribute('data-theme', theme);
      dots.forEach(function (d) {
        d.classList.toggle('active', d === dot);
      });
    });
  });

  /* ===== 通用弹窗（首页创作者工具） ===== */
  var modal = document.getElementById('creatorModal');
  if (modal) {
    var lastFocus = null;
    function openModal(trigger) {
      lastFocus = trigger || null;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      var first = modal.querySelector('.modal-btn, .modal-close');
      if (first) first.focus();
    }
    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      if (lastFocus) { lastFocus.focus(); lastFocus = null; }
    }
    document.querySelectorAll('[data-modal-open="creator"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn); });
    });
    modal.querySelectorAll('[data-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', closeModal);
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  /* ================= 分类列表页（hero / tower / enemy 通用） ================= */
  var listEl = document.getElementById('entryList');
  if (!listEl || !window.WIKI_ENTRIES) return;

  var ALL = window.WIKI_ENTRIES;
  var TITLES = { hero: '英雄列表', tower: '防御塔列表', enemy: '敌人列表', all: '词条列表' };
  var SIZE_MAP = { ten: 10, twenty: 20, fifty: 50, onehundred: 100 };

  /* ---------- 元素 ---------- */
  var pageTitleEl = document.getElementById('pageTitle');
  var formEl = document.getElementById('searchForm');
  var inputEl = document.getElementById('searchInput');
  var resetBtn = document.getElementById('resetBtn');
  var infoEl = document.getElementById('resultInfo');
  var emptyEl = document.getElementById('emptyState');
  var pagerInfoEl = document.getElementById('pagerInfo');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var sizeSelect = document.querySelector('.pager-select');
  var modeBtns = Array.prototype.slice.call(document.querySelectorAll('.mode-btn'));

  /* ---------- 分类识别：?type=hero 优先，其次按文件名 ---------- */
  function detectCategory() {
    var type = '';
    try { type = (new URLSearchParams(location.search).get('type') || '').toLowerCase(); } catch (e) {}
    if (TITLES[type]) return type;
    var p = location.pathname.toLowerCase();
    if (p.indexOf('hero') > -1) return 'hero';
    if (p.indexOf('tower') > -1) return 'tower';
    if (p.indexOf('enemy') > -1) return 'enemy';
    return 'all';
  }

  /* ---------- 状态 ---------- */
  var state = { category: detectCategory(), q: '', mode: 'title', page: 1, size: 20 };

  /* ---------- 从 URL 读取初始参数 ---------- */
  try {
    var params = new URLSearchParams(location.search);
    state.q = params.get('q') || '';
    if (params.get('mode') === 'tag') state.mode = 'tag';
    var sKey = params.get('size');
    if (sKey && SIZE_MAP[sKey]) state.size = SIZE_MAP[sKey];
    var p = Number(params.get('page'));
    if (p > 0) state.page = p;
  } catch (e) {}

  /* ---------- 标题 ---------- */
  pageTitleEl.textContent = TITLES[state.category];
  document.title = TITLES[state.category] + ' · 王国保卫战自创百科';

  /* ---------- 工具函数 ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    try {
      var re = new RegExp('(' + escapeRegExp(q) + ')', 'gi');
      return safe.replace(re, '<mark>$1</mark>');
    } catch (e) { return safe; }
  }

  /* ---------- 打分 ---------- */
  function titleScore(title, q) {
    var t = String(title).toLowerCase();
    if (!q) return 1;
    if (t === q) return 1000;
    var idx = t.indexOf(q);
    if (idx === 0) return 800 - Math.min(q.length / t.length, 1) * 100;
    if (idx > 0) return 500 - Math.min(idx, 200);
    var i = 0, j = 0;
    while (i < t.length && j < q.length) {
      if (t.charAt(i) === q.charAt(j)) j++;
      i++;
    }
    return j === q.length ? 60 : 0;
  }
  function tagScore(tags, q) {
    var best = 0;
    for (var i = 0; i < tags.length; i++) {
      var t = String(tags[i]).toLowerCase();
      if (t === q) best = Math.max(best, 1000);
      else if (t.indexOf(q) > -1) best = Math.max(best, 400);
    }
    return best;
  }

  /* ---------- 渲染列表 ---------- */
  function renderList(entries) {
    listEl.innerHTML = '';
    var frag = document.createDocumentFragment();

    entries.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'entry-item';

      var head = document.createElement('div');
      head.className = 'entry-head';

      /* 标题：始终为 <a>；优先用 entry.url，否则用 ./标题名称.html */
      var titleEl = document.createElement('a');
      titleEl.className = 'entry-title';
      titleEl.setAttribute('href', entry.url || ('/DerivativeWork/list/' + entry.title + '.html'));
      titleEl.innerHTML = state.mode === 'title'
        ? highlight(entry.title, state.q)
        : escapeHtml(entry.title);

      var timeEl = document.createElement('time');
      timeEl.className = 'entry-time';
      timeEl.setAttribute('datetime', (entry.time || '').replace(/\//g, '-'));
      timeEl.textContent = entry.time || '';

      head.appendChild(titleEl);
      head.appendChild(timeEl);

      var tagWrap = document.createElement('div');
      tagWrap.className = 'entry-tags';

      (entry.tags || []).forEach(function (tag, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'entry-tag ' + (i === 0 ? 'tag-author' : i === 1 ? 'tag-series' : 'tag-cat');
        btn.innerHTML = state.mode === 'tag'
          ? highlight(tag, state.q)
          : escapeHtml(tag);
        btn.addEventListener('click', function () {
          state.mode = 'tag';
          state.q = tag;
          state.page = 1;
          inputEl.value = tag;
          render();
        });
        tagWrap.appendChild(btn);
      });

      li.appendChild(head);
      li.appendChild(tagWrap);
      frag.appendChild(li);
    });

    listEl.appendChild(frag);
  }

  /* ---------- 同步模式按钮 ---------- */
  function syncModeBtns() {
    modeBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === state.mode);
    });
  }

  /* ---------- URL 同步 ---------- */
  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    try {
      var params = new URLSearchParams(location.search);
      if (state.q) params.set('q', state.q); else params.delete('q');
      if (state.mode === 'tag') params.set('mode', 'tag'); else params.delete('mode');
      if (state.size !== 20) {
        var key = Object.keys(SIZE_MAP).filter(function (k) { return SIZE_MAP[k] === state.size; })[0];
        if (key) params.set('size', key);
      } else {
        params.delete('size');
      }
      if (state.page > 1) params.set('page', state.page); else params.delete('page');
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    } catch (e) {}
  }

  /* ---------- 主渲染 ---------- */
  function render() {
    var q = state.q.trim().toLowerCase();

    var pool = ALL.filter(function (e) {
      return state.category === 'all' || e.category === state.category;
    });

    var scored = pool.map(function (e) {
      var score;
      if (!q) score = 1;
      else score = state.mode === 'tag' ? tagScore(e.tags || [], q) : titleScore(e.title, q);
      return { entry: e, score: score };
    }).filter(function (x) { return x.score > 0; });

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.entry.time || '').localeCompare(String(a.entry.time || ''));
    });

    var total = scored.length;
    var totalPages = Math.max(1, Math.ceil(total / state.size));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var start = (state.page - 1) * state.size;
    renderList(scored.slice(start, start + state.size).map(function (x) { return x.entry; }));

    if (total === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = state.mode === 'tag' && q
        ? '没有与该 Tag 匹配的词条，试试切换到「标题相关度」。'
        : '没有找到相关词条，换个关键词试试。';
    } else {
      emptyEl.hidden = true;
      emptyEl.textContent = '';
    }

    var parts = ['共 ' + total + ' 条'];
    if (state.q) parts.push('关键词“' + state.q + '”');
    parts.push(state.mode === 'tag' ? '按 Tag 匹配度排序' : (q ? '按标题相关度排序' : '按上传时间倒序'));
    infoEl.textContent = parts.join(' · ');

    pagerInfoEl.textContent = '第 ' + state.page + ' / ' + totalPages + ' 页';
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= totalPages;

    syncModeBtns();
    syncUrl();
  }

  /* ---------- 事件 ---------- */
  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    state.q = inputEl.value;
    state.page = 1;
    render();
  });

  var timer = null;
  inputEl.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.q = inputEl.value;
      state.page = 1;
      render();
    }, 220);
  });

  resetBtn.addEventListener('click', function () {
    state.q = '';
    state.mode = 'title';
    state.page = 1;
    inputEl.value = '';
    render();
    inputEl.focus();
  });

  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.mode = btn.getAttribute('data-mode');
      state.page = 1;
      render();
    });
  });

  if (sizeSelect) {
    sizeSelect.addEventListener('change', function () {
      var v = SIZE_MAP[sizeSelect.value];
      if (v) {
        state.size = v;
        state.page = 1;
        render();
      }
    });
  }

  prevBtn.addEventListener('click', function () {
    if (state.page > 1) { state.page--; render(); }
  });
  nextBtn.addEventListener('click', function () {
    state.page++;
    render();
  });

  /* ---------- 初始化 ---------- */
  inputEl.value = state.q;
  if (sizeSelect) {
    var initKey = Object.keys(SIZE_MAP).filter(function (k) { return SIZE_MAP[k] === state.size; })[0];
    if (initKey) sizeSelect.value = initKey;
  }
  render();
})();