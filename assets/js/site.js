(function () {
  var content = document.getElementById('post-content');

  // ===== 阅读进度条 =====
  var bar = document.getElementById('reading-progress-bar');
  if (bar && content) {
    var updateProgress = function () {
      var rect = content.getBoundingClientRect();
      var viewport = window.innerHeight;
      var total = content.offsetHeight - viewport + 200;
      var scrolled = -rect.top + 120;
      var pct = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  // ===== 文章目录 =====
  var toc = document.getElementById('post-toc');
  if (toc && content) {
    var headings = Array.prototype.slice.call(content.querySelectorAll('h2, h3'));
    if (headings.length >= 2) {
      var nav = document.getElementById('post-toc-nav');
      var links = [];
      headings.forEach(function (h, i) {
        if (!h.id) h.id = 'section-' + i;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        a.className = 'toc-link toc-' + h.tagName.toLowerCase();
        nav.appendChild(a);
        links.push({ a: a, h: h });
      });
      toc.hidden = false;

      var setActive = function (target) {
        links.forEach(function (l) {
          l.a.classList.toggle('is-active', l.h === target);
        });
      };
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) setActive(entry.target);
          });
        }, { rootMargin: '-90px 0px -65% 0px', threshold: 0 });
        headings.forEach(function (h) { observer.observe(h); });
      }
    }
  }


  // ===== 标题锚点 =====
  if (content) {
    content.querySelectorAll('h2, h3').forEach(function (h) {
      if (!h.id) return;
      var a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + h.id;
      a.textContent = '#';
      a.setAttribute('aria-label', '本小节链接');
      h.appendChild(a);
    });
  }

  // ===== 代码复制 =====
  if (content) {
    content.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      var lang = '';
      var scope = pre.parentElement ? pre.parentElement.className : '';
      var match = (pre.className + ' ' + scope + ' ' + (code ? code.className : '')).match(/language-([\w+#-]+)/);
      if (match) lang = match[1];
      if (lang && lang !== 'plaintext' && lang !== 'text') {
        var label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = lang;
        pre.appendChild(label);
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        var text = code ? code.innerText : pre.innerText;
        var done = function () {
          btn.textContent = '已复制';
          btn.classList.add('is-done');
          setTimeout(function () {
            btn.textContent = '复制';
            btn.classList.remove('is-done');
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        } else {
          var range = document.createRange();
          range.selectNodeContents(code || pre);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          try { document.execCommand('copy'); done(); } catch (e) {}
          sel.removeAllRanges();
        }
      });
      pre.appendChild(btn);
    });

    // ===== 图片点击放大 =====
    content.querySelectorAll('img').forEach(function (img) {
      img.loading = 'lazy';
      img.addEventListener('click', function () {
        var overlay = document.createElement('div');
        overlay.className = 'img-lightbox';
        var big = document.createElement('img');
        big.src = img.currentSrc || img.src;
        big.alt = img.alt || '';
        overlay.appendChild(big);
        overlay.addEventListener('click', function () { overlay.remove(); });
        document.body.appendChild(overlay);
      });
    });
  }

  // ===== 首页分类筛选 =====
  var chips = document.getElementById('filter-chips');
  if (chips) {
    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-chip');
      if (!btn) return;
      chips.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var filter = btn.getAttribute('data-filter');
      document.querySelectorAll('#post-grid .post-card').forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.style.display = show ? '' : 'none';
      });
    });
  }
})();

// ===== 站内搜索（首页与搜索页共用） =====
function initSearch(opts) {
  var input = document.getElementById(opts.input);
  var results = document.getElementById(opts.results);
  if (!input || !results) return null;

  var hint = document.getElementById(opts.hint);
  var hideWhenEmpty = opts.hideWhenEmpty ? document.querySelectorAll(opts.hideWhenEmpty) : [];
  var clearBtn = opts.clear ? document.getElementById(opts.clear) : null;
  var indexUrl = results.getAttribute('data-index') || '/search.json';
  var idleHint = hint ? hint.textContent : '';
  var posts = null;
  var loading = false;
  var timer = null;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, terms) {
    var html = escapeHtml(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      html = html.replace(re, '<mark>$1</mark>');
    });
    return html;
  }

  function load(done) {
    if (posts) return done();
    if (loading) return;
    loading = true;
    if (hint) hint.textContent = '正在加载索引…';
    fetch(indexUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        posts = data;
        if (hint) hint.textContent = idleHint;
        done();
      })
      .catch(function () {
        if (hint) hint.textContent = '索引加载失败，请刷新页面重试';
      });
  }

  function snippet(post, terms) {
    var text = post.content || post.description || '';
    var idx = -1;
    terms.forEach(function (t) {
      var i = text.toLowerCase().indexOf(t);
      if (i >= 0 && (idx < 0 || i < idx)) idx = i;
    });
    if (idx < 0) idx = 0;
    var start = Math.max(0, idx - 50);
    return (start > 0 ? '…' : '') + text.slice(start, start + 160) + '…';
  }

  function toggleEmpty(empty) {
    Array.prototype.forEach.call(hideWhenEmpty, function (el) {
      el.hidden = !empty;
    });
  }

  function render(list, terms) {
    if (!terms.length) {
      results.innerHTML = '';
      toggleEmpty(true);
      if (hint) hint.textContent = idleHint;
      if (clearBtn) clearBtn.hidden = true;
      return;
    }
    toggleEmpty(false);
    if (clearBtn) clearBtn.hidden = false;
    if (!list.length) {
      results.innerHTML = '';
      if (hint) hint.textContent = '没有找到匹配的文章，换个关键词试试';
      return;
    }
    if (hint) hint.textContent = '找到 ' + list.length + ' 篇文章';
    results.innerHTML = list.map(function (post) {
      return '<a class="search-result" href="' + post.url + '">' +
        '<div class="search-result-top">' +
          '<span class="search-result-cat">' + escapeHtml(post.category) + '</span>' +
          '<time>' + escapeHtml(post.date) + '</time>' +
        '</div>' +
        '<h2 class="search-result-title">' + highlight(post.title, terms) + '</h2>' +
        '<p class="search-result-snippet">' + highlight(snippet(post, terms), terms) + '</p>' +
      '</a>';
    }).join('');
  }

  function run() {
    var q = input.value.trim().toLowerCase();
    if (!q) return render([], []);
    load(function () {
      var terms = q.split(/\s+/).filter(Boolean);
      var scored = [];
      posts.forEach(function (post) {
        var title = (post.title || '').toLowerCase();
        var cat = (post.category || '').toLowerCase();
        var desc = (post.description || '').toLowerCase();
        var body = (post.content || '').toLowerCase();
        var haystack = title + ' ' + cat + ' ' + desc + ' ' + body;
        if (!terms.every(function (t) { return haystack.indexOf(t) >= 0; })) return;
        var score = 0;
        terms.forEach(function (t) {
          if (title.indexOf(t) >= 0) score += 12;
          if (cat.indexOf(t) >= 0) score += 6;
          if (desc.indexOf(t) >= 0) score += 4;
          if (body.indexOf(t) >= 0) score += 1;
        });
        scored.push({ post: post, score: score });
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      render(scored.map(function (s) { return s.post; }), terms);
    });
  }

  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      run();
      input.focus();
    });
  }

  var preset = new URLSearchParams(location.search).get('q');
  if (preset) {
    input.value = preset;
    run();
  }

  return { run: run, input: input };
}

initSearch({
  input: 'search-input',
  results: 'search-results',
  hint: 'search-hint',
  clear: 'search-clear'
});

initSearch({
  input: 'home-search-input',
  results: 'home-search-results',
  hint: 'home-search-hint',
  clear: 'home-search-clear',
  hideWhenEmpty: '#home-posts, .home-toolbar'
});

// 按下 "/" 聚焦首页搜索框
document.addEventListener('keydown', function (e) {
  var homeInput = document.getElementById('home-search-input');
  if (!homeInput || e.key !== '/' || /input|textarea/i.test(document.activeElement.tagName)) return;
  e.preventDefault();
  homeInput.focus();
});
