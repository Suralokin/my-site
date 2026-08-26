/* ===== CMS CONTENT LOADER ===== */
(function() {
  var API = '/api/content';

  function fetchContent() {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '__public__', action: 'read' })
    }).then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).catch(function() { return null; });
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

  /* ===== PORTFOLIO (SLIDER) ===== */
  function applyPortfolio(items) {
    if (!items || !items.length) return;
    items.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    var track = document.getElementById('portfolioTrack');
    if (!track) return;
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      html += '<div class="portfolio-card' + (i === 0 ? ' active-slide' : '') + '">'
        + '<div class="portfolio-preview ' + (p.bg_class || '') + '">' + (p.icon || '📁') + '</div>'
        + '<div class="portfolio-info">'
        + '<h3>' + esc(p.title) + '</h3>'
        + '<p>' + esc(p.description) + '</p>'
        + '<a href="' + esc(p.link || '#') + '" class="portfolio-link">Подробнее &rarr;</a>'
        + '</div></div>';
    }
    track.innerHTML = html;
    if (typeof initSlider === 'function') initSlider();
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

  /* ===== PORTFOLIO GRID (portfolio page) ===== */
  function applyPortfolioGrid(items) {
    if (!items || !items.length) return;
    items.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    var grid = document.getElementById('portfolioGrid');
    if (!grid) return;
    var html = '';
    var delays = ['delay-1','delay-2','delay-3'];
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var link = p.link || '#';
      html += '<div class="work-card animate-on-scroll ' + delays[i % 3] + '">'
        + '<div class="work-card-preview ' + esc(p.bg_class || '') + '">'
        + '<div class="work-card-emoji">' + (p.icon || '📁') + '</div>'
        + '<div class="work-card-overlay">'
        + '<a href="' + esc(link) + '" target="_blank" class="work-card-btn">Открыть проект &nearr;</a>'
        + '</div></div>'
        + '<div class="work-card-info">'
        + '<span class="work-card-tag">' + esc(p.bg_class === 'ai-bg' ? 'AI' : p.bg_class === 'web-bg' ? 'Веб-сайт' : 'Проект') + '</span>'
        + '<h3>' + esc(p.title || 'Без названия') + '</h3>'
        + '<p>' + esc(p.description || '') + '</p>'
        + '</div></div>';
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.animate-on-scroll').forEach(function(el) { observer.observe(el); });
  }

  /* ===== LOAD ALL ===== */
  function loadAll() {
    return fetchContent().then(function(data) {
      if (!data) return;
      applySettings(data.settings);
      applyAbout(data.about);
      applyContacts(data.contacts);
      applyServices(data.services);
      applyPortfolio(data.portfolio);
      applyPortfolioGrid(data.portfolio);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }
})();
