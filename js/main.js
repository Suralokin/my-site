/* ===== NAVBAR SCROLL ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

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
