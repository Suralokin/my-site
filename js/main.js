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
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

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

/* ===== PORTFOLIO SLIDER ===== */
var sliderIndex = 0;
var sliderAutoTimer = null;
var sliderPaused = false;

function initSlider() {
  var track = document.getElementById('portfolioTrack');
  var dots = document.getElementById('portfolioDots');
  if (!track || !dots) return;

  var cards = track.querySelectorAll('.portfolio-card');
  if (cards.length === 0) return;

  dots.innerHTML = '';
  for (var i = 0; i < cards.length; i++) {
    var dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('data-i', i);
    dot.addEventListener('click', function() {
      goToSlide(parseInt(this.getAttribute('data-i')));
    });
    dots.appendChild(dot);
  }

  sliderIndex = 0;
  updateSlider();
  startAutoSlide();

  var wrap = document.querySelector('.slider-wrap');
  if (wrap) {
    wrap.addEventListener('mouseenter', function() { sliderPaused = true; stopAutoSlide(); });
    wrap.addEventListener('mouseleave', function() { sliderPaused = false; startAutoSlide(); });
  }

  // Touch swipe
  var vp = document.querySelector('.slider-viewport');
  var touchStartX = 0;
  if (vp) {
    vp.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    vp.addEventListener('touchend', function(e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) slidePortfolio(diff > 0 ? 1 : -1);
    }, { passive: true });
  }
}

function updateSlider() {
  var track = document.getElementById('portfolioTrack');
  var dots = document.querySelectorAll('#portfolioDots .dot');
  if (!track) return;

  var cards = track.querySelectorAll('.portfolio-card');
  var count = cards.length;
  if (count === 0) return;

  if (sliderIndex >= count) sliderIndex = 0;
  if (sliderIndex < 0) sliderIndex = count - 1;

  track.style.transform = 'translateX(-' + (sliderIndex * 100) + '%)';

  cards.forEach(function(c, i) {
    c.classList.toggle('active-slide', i === sliderIndex);
  });

  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === sliderIndex);
  });
}

function slidePortfolio(dir) {
  var track = document.getElementById('portfolioTrack');
  if (!track) return;
  var count = track.querySelectorAll('.portfolio-card').length;
  if (count === 0) return;

  sliderIndex += dir;
  if (sliderIndex >= count) sliderIndex = 0;
  if (sliderIndex < 0) sliderIndex = count - 1;

  updateSlider();
  resetAutoSlide();
}

function goToSlide(i) {
  sliderIndex = i;
  updateSlider();
  resetAutoSlide();
}

function startAutoSlide() {
  stopAutoSlide();
  sliderAutoTimer = setInterval(function() {
    if (!sliderPaused) slidePortfolio(1);
  }, 4000);
}

function stopAutoSlide() {
  if (sliderAutoTimer) { clearInterval(sliderAutoTimer); sliderAutoTimer = null; }
}

function resetAutoSlide() {
  stopAutoSlide();
  startAutoSlide();
}

document.addEventListener('DOMContentLoaded', initSlider);
