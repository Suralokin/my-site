/* ===== NAVBAR SCROLL ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* ===== SCROLL TO TOP BUTTON ===== */
const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  if (scrollTopBtn) {
    scrollTopBtn.classList.toggle('show', window.scrollY > 120);
  }
});
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== BURGER ===== */
function toggleBurger() {
  document.getElementById('burger').classList.toggle('active');
  document.getElementById('mobileMenu').classList.toggle('active');
}
function closeBurger() {
  document.getElementById('burger').classList.remove('active');
  document.getElementById('mobileMenu').classList.remove('active');
}

/* ===== SCROLL ANIMATIONS (Intersection Observer) ===== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

function observeScrollAnimations(root) {
  const scope = root || document;
  scope.querySelectorAll('.animate-on-scroll').forEach(el => {
    if (el.dataset.observed) return;
    el.dataset.observed = '1';
    observer.observe(el);
  });
}
window.observeScrollAnimations = observeScrollAnimations;
observeScrollAnimations();

/* ===== PARTICLES ===== */
(function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
    p.style.animationDuration = (Math.random() * 10 + 8) + 's';
    p.style.animationDelay = (Math.random() * 5) + 's';
    p.style.opacity = Math.random() * 0.4 + 0.1;
    container.appendChild(p);
  }
})();

/* ===== GLOBE PARALLAX ===== */
(function globeParallax() {
  const hero = document.querySelector('.hero');
  const globe = document.querySelector('.hero-globe-wrap');
  if (!hero || !globe) return;

  hero.addEventListener('mousemove', function(e) {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    globe.style.transform = 'translateY(-50%) translate(' + (x * 20) + 'px, ' + (y * 15) + 'px)';
  });

  hero.addEventListener('mouseleave', function() {
    globe.style.transform = 'translateY(-50%)';
    globe.style.transition = 'transform 0.5s ease';
    setTimeout(function() { globe.style.transition = ''; }, 500);
  });
})();

/* ===== EMAIL LINKS (desktop fallback: copy to clipboard) ===== */
(function() {
  var isDesktop = window.matchMedia && window.matchMedia('(pointer: fine)').matches && !window.navigator.maxTouchPoints;
  if (!isDesktop) return;

  var toastEl = null;
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove('show');
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function() { return true; });
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  }

  var links = document.querySelectorAll('a[href^="mailto:"]');
  for (var i = 0; i < links.length; i++) {
    (function(link) {
      link.addEventListener('click', function(e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        var email = link.getAttribute('href').replace('mailto:', '').split('?')[0];
        e.preventDefault();
        copyText(email).then(function(ok) {
          showToast(ok ? 'Email скопирован: ' + email : email);
        });
      });
    })(links[i]);
  }
})();

/* ===== PORTFOLIO FILTERS ===== */
function pluralRu(n, one, few, many) {
  var m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}

function portfolioProjectWord(n) {
  return pluralRu(n, 'проект', 'проекта', 'проектов');
}

var pfActiveCat = 'all';

function applyPortfolioFilter() {
  var grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  var cards = grid.querySelectorAll('.work-card');
  var shown = 0;

  cards.forEach(function(card) {
    var match = pfActiveCat === 'all' || card.dataset.cat === pfActiveCat;
    card.classList.toggle('is-hidden', !match);
    if (match) shown++;
  });

  var counter = document.getElementById('pfCount');
  if (counter) {
    counter.textContent = shown + ' ' + portfolioProjectWord(shown);
  }

  var empty = document.getElementById('pfEmpty');
  if (empty) empty.hidden = shown !== 0;

  if (typeof window.observeScrollAnimations === 'function') {
    window.observeScrollAnimations(grid);
  }
}
window.applyPortfolioFilter = applyPortfolioFilter;

function initPortfolioFilters() {
  var bar = document.getElementById('pfFilters');
  if (!bar) return;

  bar.addEventListener('click', function(e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;

    pfActiveCat = chip.dataset.cat || 'all';

    bar.querySelectorAll('.chip').forEach(function(c) {
      c.classList.toggle('active', c === chip);
      c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
    });

    applyPortfolioFilter();
  });

  bar.querySelectorAll('.chip').forEach(function(c) {
    c.setAttribute('aria-selected', c.classList.contains('active') ? 'true' : 'false');
  });

  applyPortfolioFilter();
}

document.addEventListener('DOMContentLoaded', initPortfolioFilters);
