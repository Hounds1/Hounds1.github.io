(() => {
  const toggle = document.getElementById('motion-toggle');
  const motion = window.Motion;
  // Start each page in playback mode; the header toggle pauses this visit.
  let reduced = false;
  const animations = new Set();
  const ease = [.22, 1, .36, 1];

  function animate(elements, keyframes, options = {}, group) {
    if (reduced || !motion || !elements) return;
    const control = motion.animate(elements, keyframes, { duration: .55, ease, ...options });
    animations.add(control);
    group?.add(control);
    Promise.resolve(control).then(() => {
      animations.delete(control);
      group?.delete(control);
    });
    return control;
  }

  function complete(group) {
    group.forEach(control => control.complete());
    group.clear();
  }

  window.portfolioMotion = { animate, isReduced: () => reduced };

  if (motion) {
    motion.inView('.hero-copy', element => {
      animate(element.querySelectorAll('.hero-role, h1, .hero-description, .hero-link'), {
        opacity: [0, 1], y: [18, 0]
      }, { duration: .8, delay: motion.stagger(.08) });
    }, { amount: .2 });
    motion.inView('.experience-header, .section-heading, .timeline-item', element => {
      animate(element, { opacity: [0, 1], y: [22, 0] });
    }, { amount: .35 });
    motion.inView('.stack-group', element => {
      animate(element.querySelectorAll('.tech-item'), { opacity: [0, 1], y: [24, 0] }, {
        duration: .5, delay: motion.stagger(.055)
      });
    }, { amount: .3 });

    const lift = element => animate(element, { y: -6, rotate: -2 }, {
      type: 'spring', stiffness: 310, damping: 20
    });
    const rest = element => {
      if (reduced) { element.style.transform = 'none'; return; }
      animate(element, { y: 0, rotate: 0 }, { type: 'spring', stiffness: 310, damping: 20 });
    };
    motion.hover('.tech-item', element => {
      lift(element);
      return () => { if (document.activeElement !== element) rest(element); };
    });
    document.querySelectorAll('.tech-item').forEach(element => {
      element.addEventListener('focus', () => lift(element));
      element.addEventListener('blur', () => rest(element));
    });
  }

  // particles.js owns the canvas and its animation loop.
  let particles;
  let heroVisible = true;
  function updateParticleMotion() {
    if (!particles) return;
    const running = !reduced && heroVisible && !document.hidden;
    cancelAnimationFrame(particles.fn.drawAnimFrame);
    particles.particles.move.enable = running;
    particles.interactivity.events.onhover.enable = running;
    particles.fn.vendors.draw();
  }

  if (window.particlesJS && document.getElementById('hero-particles')) {
    window.particlesJS('hero-particles', {
      particles: {
        number: { value: 110, density: { enable: true, value_area: 800 } },
        color: { value: ['#bdd2f0', '#7f9abb', '#d9e5f7'] },
        shape: { type: 'circle' },
        opacity: { value: .8, random: true },
        size: { value: 2.8, random: true },
        line_linked: { enable: true, distance: 170, color: '#8fa9ce', opacity: .38, width: .8 },
        // v2 initializes line colors after density setup. Start its first frame,
        // then apply the motion preference synchronously below.
        move: { enable: true, speed: .42, direction: 'none', random: true, straight: false, out_mode: 'out', bounce: false }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: !reduced, mode: 'grab' }, onclick: { enable: false }, resize: true },
        modes: { grab: { distance: 180, line_linked: { opacity: .55 } } }
      },
      retina_detect: true
    });
    particles = window.pJSDom?.find(instance => instance.pJS.canvas.el.parentElement.id === 'hero-particles')?.pJS;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        updateParticleMotion();
      }).observe(document.querySelector('.hero'));
    }
    document.addEventListener('visibilitychange', updateParticleMotion);
  }

  function updatePreference() {
    document.documentElement.classList.toggle('motion-reduced', reduced);
    document.documentElement.classList.toggle('motion-full', !reduced);
    toggle.setAttribute('aria-pressed', String(reduced));
    toggle.setAttribute('aria-label', reduced ? '움직임 켜기' : '움직임 줄이기');
    toggle.querySelector('.motion-label').textContent = reduced ? '움직임 켜기' : '움직임 줄이기';
    toggle.querySelector('.motion-icon').textContent = reduced ? '▶' : 'Ⅱ';
    if (reduced) {
      complete(animations);
      document.querySelectorAll('.tech-item').forEach(element => { element.style.transform = 'none'; });
    }
    updateParticleMotion();
    window.dispatchEvent(new CustomEvent('portfolio-motion-change', { detail: { reduced } }));
  }
  toggle.addEventListener('click', () => {
    reduced = !reduced;
    updatePreference();
  });
  updatePreference();
})();
