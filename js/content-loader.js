/* ===== CMS CONTENT LOADER ===== */
(function() {
  var API = '/api/content';
  var STATIC_PREFIX = '/content/';

  function fetchApi() {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '__public__', action: 'read' })
    }).then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).catch(function() { return null; });
  }

  /* Резервный источник: статические JSON рядом с сайтом.
     Работает даже если GitHub-токен истёк и /api/content недоступен. */
  function fetchStatic(name) {
    return fetch(STATIC_PREFIX + name + '.json', { cache: 'no-store' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; });
  }

  function isFilled(v) {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  function publishedFilter(item) {
    return !item || !item.publishAt || item.publishAt <= new Date().toISOString();
  }

  function fetchStaticServices() {
    var LIMIT = 12;
    var found = [];
    function step(i) {
      if (i > LIMIT) return Promise.resolve(found);
      return fetchStatic('services/service-' + i).then(function(s) {
        if (!s || typeof s !== 'object') return found;
        found.push(s);
        return step(i + 1);
      });
    }
    return step(1);
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ===== SETTINGS (hero section) ===== */
  function applySettings(d) {
    if (!d) return;
    if (d.name) {
      var h1 = document.querySelector('.hero-text h1');
      if (h1) h1.innerHTML = 'Привет, я <span class="gradient">' + esc(d.name) + '</span>';
    }
    if (d.subtitle) {
      var sub = document.querySelector('.hero-text .subtitle');
      if (sub) sub.textContent = d.subtitle;
    }
    if (d.tagline) {
      var tag = document.querySelector('.hero-text .tagline');
      if (tag) tag.textContent = d.tagline;
    }
    if (d.photo) {
      var img = document.querySelector('.hero-photo');
      if (img) img.src = d.photo;
    }
  }

  /* ===== SERVICES ===== */
  function applyServices(items) {
    if (!items || !items.length) return;
    items.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    var grid = document.querySelector('.services-grid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      var tags = '';
      if (s.tags && s.tags.length) {
        tags = '<div class="service-tags">';
        for (var t = 0; t < s.tags.length; t++) {
          tags += '<span class="tag">' + esc(s.tags[t]) + '</span>';
        }
        tags += '</div>';
      }
      html += '<div class="service-card animate-on-scroll delay-' + (i + 1) + '">'
        + '<div class="service-icon">' + (s.icon || '🔧') + '</div>'
        + '<h3>' + esc(s.title) + '</h3>'
        + '<p>' + esc(s.description) + '</p>'
        + tags + '</div>';
    }
    grid.innerHTML = html;
  }

  /* ===== ABOUT ===== */
  function applyAbout(d) {
    if (!d) return;
    if (d.text) {
      var aboutText = document.querySelector('.about-text');
      if (aboutText) {
        var paragraphs = d.text.split('\n').filter(function(p) { return p.trim(); });
        var html = '';
        for (var i = 0; i < paragraphs.length; i++) {
          html += '<p>' + esc(paragraphs[i]) + '</p>';
        }
        aboutText.innerHTML = html;
      }
    }
    if (d.stats && d.stats.length) {
      var statsGrid = document.querySelector('.stats-grid');
      if (statsGrid) {
        var html = '';
        for (var i = 0; i < d.stats.length; i++) {
          html += '<div class="stat-card">'
            + '<div class="stat-number">' + esc(d.stats[i].number) + '</div>'
            + '<div class="stat-label">' + esc(d.stats[i].label) + '</div></div>';
        }
        statsGrid.innerHTML = html;
      }
    }
  }

  /* ===== PORTFOLIO (GRID) ===== */
  var PF_CAT_LABELS = {
    site: 'Сайты',
    landing: 'Лендинги',
    ai: 'AI и боты',
    app: 'Приложения',
    service: 'Услуги'
  };

  function pfLinkHtml(p) {
    var link = p.link || '';
    var external = link && link.indexOf('#') !== 0 && link.indexOf('tel:') !== 0 &&
      link.indexOf('mailto:') !== 0;

    if (external) {
      var last = link.split('/').pop();
      var isSamePage = last === 'portfolio.html' ||
        last === location.pathname.split('/').pop() ||
        link === location.href || link === location.pathname;
      if (isSamePage) {
        return '<a class="btn btn-outline work-card-btn" href="index.html#contacts">Обсудить проект &rarr;</a>';
      }
      return '<a class="btn btn-primary work-card-btn" href="' + esc(link) + '" target="_blank" rel="noopener">Смотреть проект &rarr;</a>';
    }

    if (link.indexOf('tel:') === 0) {
      return '<a class="btn btn-primary work-card-btn" href="' + esc(link) + '">Позвонить</a>';
    }
    return '<a class="btn btn-outline work-card-btn" href="index.html#contacts">Обсудить проект &rarr;</a>';
  }

  function applyPortfolio(items) {
    if (!items || !items.length) return;
    items.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    var grid = document.getElementById('portfolioGrid');
    if (!grid) return;

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var cat = PF_CAT_LABELS[p.category] ? p.category : 'site';
      var num = (i + 1) < 10 ? '0' + (i + 1) : '' + (i + 1);
      var tags = '';
      if (Array.isArray(p.tags)) {
        for (var t = 0; t < p.tags.length; t++) {
          if (!p.tags[t]) continue;
          tags += '<span class="tag">' + esc(p.tags[t]) + '</span>';
        }
      }
      var desc = esc(p.description || '').replace(/\n/g, '<br>');

      html += '<article class="work-card animate-on-scroll delay-' + (i % 3 + 1) + '" data-cat="' + cat + '">'
        + '<div class="work-card-preview ' + esc(p.bg_class || '') + '">'
        + '<span class="work-card-num" aria-hidden="true">' + num + '</span>'
        + '<span class="work-card-emoji">' + esc(p.icon || '📁') + '</span>'
        + '</div>'
        + '<div class="work-card-info">'
        + '<span class="work-card-tag">' + esc(PF_CAT_LABELS[cat]) + '</span>'
        + '<h3>' + esc(p.title || '') + '</h3>'
        + (desc ? '<p>' + desc + '</p>' : '')
        + (tags ? '<div class="work-card-techs">' + tags + '</div>' : '')
        + '<div class="work-card-actions">' + pfLinkHtml(p) + '</div>'
        + '</div></article>';
    }

    grid.innerHTML = html;

    if (typeof window.observeScrollAnimations === 'function') {
      window.observeScrollAnimations(grid);
    }
    if (typeof window.applyPortfolioFilter === 'function') {
      window.applyPortfolioFilter();
    }
  }

  /* ===== CONTACTS ===== */
  function applyContacts(d) {
    if (!d) return;
    if (d.heading) {
      var h = document.querySelector('.contact-info h3');
      if (h) h.textContent = d.heading;
    }
    if (d.description) {
      var p = document.querySelector('.contact-info > p');
      if (p) p.textContent = d.description;
    }
    if (d.telegram) {
      var tg = document.querySelector('.contact-method-text p');
      if (tg) tg.textContent = d.telegram;
    }
    if (d.email) {
      var em = document.querySelectorAll('.contact-method-text p');
      if (em.length > 1) em[1].textContent = d.email;
    }
    if (d.telegram_url) {
      var link = document.querySelector('a[href*="t.me"]');
      if (link) link.href = d.telegram_url;
    }
  }

  /* ===== CMS SECTIONS (динамические разделы) ===== */
  function buildCardLink(card) {
    if (!card || !card.link) return '';
    var label = card.link_label || 'Подробнее';
    var href = esc(card.link);
    if (card.link.indexOf('#') === 0) {
      return '<a class="cms-link" href="' + href + '">' + esc(label) + ' &rarr;</a>';
    }
    return '<a class="cms-link" href="' + href + '" target="_blank" rel="noopener">' + esc(label) + ' &rarr;</a>';
  }

  function buildCardHtml(card) {
    var type = card.type || 'text';
    if (type === 'stat') {
      return '<article class="cms-card cms-stat">'
        + '<div class="cms-stat-number">' + esc(card.number || '') + '</div>'
        + '<div class="cms-stat-label">' + esc(card.label || '') + '</div>'
        + '</article>';
    }
    if (type === 'banner') {
      return '<article class="cms-banner">'
        + (card.title ? '<h3>' + esc(card.title) + '</h3>' : '')
        + (card.text ? '<p>' + esc(card.text) + '</p>' : '')
        + buildCardLink(card)
        + '</article>';
    }
    return '<article class="cms-card">'
      + (card.icon ? '<div class="cms-icon">' + esc(card.icon) + '</div>' : '')
      + (card.title ? '<h3>' + esc(card.title) + '</h3>' : '')
      + (card.text ? '<p>' + esc(card.text) + '</p>' : '')
      + buildCardLink(card)
      + '</article>';
  }

  function buildSectionHtml(section) {
    var cards = (section.cards || []).filter(function(c) { return c && c.visible !== false; })
      .sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    if (!cards.length) return '';
    var html = '<section class="section cms-section' + (section.style === 'alt' ? ' alt' : '') + '">'
      + '<div class="section-container">'
      + '<div class="section-title">'
      + '<h2>' + (section.icon ? '<span class="cms-section-icon">' + esc(section.icon) + '</span>' : '')
      + esc(section.title || '') + '</h2>'
      + (section.subtitle ? '<p>' + esc(section.subtitle) + '</p>' : '')
      + '<div class="section-divider"></div>'
      + '</div>'
      + '<div class="cms-cards' + (section.layout === 'list' ? ' list' : '') + '">';
    for (var i = 0; i < cards.length; i++) {
      html += buildCardHtml(cards[i]);
    }
    html += '</div></div></section>';
    return html;
  }

  function applySections(sections) {
    var mount = document.getElementById('cmsSections');
    if (!mount) return;
    var page = window.location.pathname.indexOf('portfolio.html') !== -1 ? 'portfolio' : 'index';
    var list = (sections || []).filter(function(s) {
      return s && s.visible !== false && (s.page || 'index') === page;
    }).sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    if (!list.length) {
      mount.innerHTML = '';
      mount.style.display = 'none';
      return;
    }
    var html = '';
    for (var i = 0; i < list.length; i++) {
      html += buildSectionHtml(list[i]);
    }
    mount.style.display = '';
    mount.innerHTML = html;
  }

  /* ===== LOAD ALL ===== */
  function fillFromStatic(data) {
    var jobs = [];
    if (!isFilled(data.settings)) {
      jobs.push(fetchStatic('settings').then(function(v) { if (v) data.settings = v; }));
    }
    if (!isFilled(data.about)) {
      jobs.push(fetchStatic('about').then(function(v) { if (v) data.about = v; }));
    }
    if (!isFilled(data.contacts)) {
      jobs.push(fetchStatic('contacts').then(function(v) { if (v) data.contacts = v; }));
    }
    if (!isFilled(data.sections)) {
      jobs.push(fetchStatic('sections').then(function(v) { if (Array.isArray(v)) data.sections = v; }));
    }
    if (!isFilled(data.services) && document.querySelector('.services-grid')) {
      jobs.push(fetchStaticServices().then(function(v) { if (v.length) data.services = v; }));
    }
    if (!isFilled(data.portfolio) && document.getElementById('portfolioGrid')) {
      jobs.push(fetchStatic('portfolio').then(function(v) {
        if (Array.isArray(v)) data.portfolio = v.filter(publishedFilter);
      }));
    }
    return Promise.all(jobs).then(function() { return data; });
  }

  function loadAll() {
    return fetchApi().then(function(apiData) {
      return fillFromStatic(apiData || {});
    }).then(function(data) {
      if (!data) return;
      applySettings(data.settings);
      applyAbout(data.about);
      applyContacts(data.contacts);
      applyServices(data.services);
      applySections(data.sections);
      if (window.location.pathname.indexOf('portfolio.html') !== -1) {
        applyPortfolio(data.portfolio);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }
})();
