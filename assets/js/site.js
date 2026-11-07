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
