/*
 * Gesture state adapted from Motion's publicly available JavaScript example:
 * https://motion.dev/examples/js-gestures
 * Spring values keep pointer-following transforms continuous between events.
 * The outer button is reserved for entrance and shared-view animations.
 */
(() => {
  window.bindProjectCardMotion = (cards, fx = window.portfolioMotion) => {
    const motion = window.Motion;
    if (!motion?.hover || !motion?.press || !motion?.springValue || !motion?.styleEffect) {
      return () => {};
    }

    const elements = typeof cards === 'string'
      ? [...document.querySelectorAll(cards)]
      : Array.from(cards || []);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = Boolean(fx?.isReduced?.() ?? preference.matches);
    let disposed = false;
    const bindings = [];
    const spring = { stiffness: 420, damping: 32, mass: .8 };
    const followSpring = { stiffness: 240, damping: 27, mass: .6 };
    const isReduced = () => reduced || Boolean(fx?.isReduced?.());
    const clamp = value => Math.max(-1, Math.min(1, value));

    for (const card of elements) {
      const surface = card.querySelector('.card-surface');
      if (!surface) continue;
      const artwork = card.matches('.featured-card')
        ? card.querySelector('.project-cover-image')
        : null;
      const featured = card.matches('.featured-card');
      const values = [];
      const effectCleanups = [];
      const listeners = [];
      const originals = [surface, artwork].filter(Boolean).map(element => ({
        element,
        transform: element.style.getPropertyValue('transform'),
        transformPriority: element.style.getPropertyPriority('transform'),
        transition: element.style.getPropertyValue('transition'),
        transitionPriority: element.style.getPropertyPriority('transition')
      }));
      const state = { hovered: false, focused: false, pressed: false };
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;

      const value = (initial, options = spring) => {
        const item = motion.springValue(initial, options);
        values.push({ item, initial });
        return item;
      };
      const lift = value(0);
      const scale = value(1);
      const surfaceStyle = { y: lift, scale };
      const rotationX = featured ? value(0, followSpring) : null;
      const rotationY = featured ? value(0, followSpring) : null;
      const artworkX = artwork ? value(0, followSpring) : null;
      const artworkY = artwork ? value(0, followSpring) : null;

      if (featured) {
        surfaceStyle.rotateX = rotationX;
        surfaceStyle.rotateY = rotationY;
        // Perspective belongs to the same transform, so no outer style is changed.
        surfaceStyle.transformPerspective = value(900);
      }
      surface.style.transition = 'none';
      effectCleanups.push(motion.styleEffect(surface, surfaceStyle));
      if (artwork) {
        // This inline transform also takes ownership from the old CSS art hover.
        artwork.style.transition = 'none';
        effectCleanups.push(motion.styleEffect(artwork, { x: artworkX, y: artworkY }));
      }

      function listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        listeners.push(() => target.removeEventListener(type, handler, options));
      }

      function cancelPointerFrame() {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      }

      function neutralPointer(immediate = false) {
        cancelPointerFrame();
        [rotationX, rotationY, artworkX, artworkY].forEach(item => {
          if (!item) return;
          if (immediate) item.jump(0);
          else item.set(0);
        });
      }

      function resetImmediately() {
        cancelPointerFrame();
        values.forEach(({ item, initial }) => item.jump(initial));
        // The preference event must be visible immediately, before the next frame.
        surface.style.transform = 'none';
        if (artwork) artwork.style.transform = 'none';
      }

      function updateGesture() {
        if (disposed) return;
        if (isReduced()) {
          resetImmediately();
          return;
        }
        const active = state.hovered || state.focused;
        scale.set(state.pressed ? .985 : active ? 1.01 : 1);
        lift.set(state.pressed ? -2 : active ? -6 : 0);
      }

      function flushPointer() {
        frame = 0;
        if (disposed || isReduced() || !state.hovered || !card.isConnected) return;
        // Measure the stable outer button: inner tilt cannot change this rectangle.
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = clamp(((pointerX - rect.left) / rect.width - .5) * 2);
        const y = clamp(((pointerY - rect.top) / rect.height - .5) * 2);
        rotationX?.set(-y * 2);
        rotationY?.set(x * 2);
        artworkX?.set(x * 4);
        artworkY?.set(y * 4);
      }

      const stopHover = motion.hover(card, () => {
        state.hovered = true;
        updateGesture();
        return () => {
          state.hovered = false;
          neutralPointer(isReduced());
          updateGesture();
        };
      });
      const stopPress = motion.press(card, () => {
        state.pressed = true;
        updateGesture();
        return () => {
          state.pressed = false;
          updateGesture();
        };
      });

      listen(card, 'focus', () => {
        state.focused = card.matches(':focus-visible');
        updateGesture();
      });
      listen(card, 'blur', () => {
        state.focused = false;
        state.pressed = false;
        neutralPointer(isReduced());
        updateGesture();
      });
      // A pointer can focus an already keyboard-focused button without another focus event.
      listen(card, 'pointerdown', () => {
        state.focused = false;
        updateGesture();
      }, { passive: true });

      if (featured) {
        listen(card, 'pointermove', event => {
          if (event.pointerType === 'touch' || isReduced() || !state.hovered) return;
          pointerX = event.clientX;
          pointerY = event.clientY;
          if (!frame) frame = window.requestAnimationFrame(flushPointer);
        }, { passive: true });
        listen(card, 'pointercancel', () => {
          state.hovered = false;
          state.pressed = false;
          neutralPointer(isReduced());
          updateGesture();
        }, { passive: true });
      }

      if (isReduced()) resetImmediately();

      bindings.push({
        reset: resetImmediately,
        refresh() {
          state.pressed = false;
          neutralPointer(true);
          updateGesture();
        },
        cleanup() {
          cancelPointerFrame();
          stopHover();
          stopPress();
          listeners.forEach(remove => remove());
          effectCleanups.forEach(remove => remove());
          values.forEach(({ item }) => item.destroy());
          originals.forEach(({ element, transform, transformPriority, transition, transitionPriority }) => {
            if (transform) element.style.setProperty('transform', transform, transformPriority);
            else element.style.removeProperty('transform');
            if (transition) element.style.setProperty('transition', transition, transitionPriority);
            else element.style.removeProperty('transition');
          });
        }
      });
    }

    function onMotionChange(event) {
      reduced = typeof event.detail?.reduced === 'boolean'
        ? event.detail.reduced
        : Boolean(fx?.isReduced?.() ?? preference.matches);
      bindings.forEach(binding => reduced ? binding.reset() : binding.refresh());
    }

    function onPreferenceChange(event) {
      if (fx?.isReduced) return; // The page owns saved user preferences when available.
      reduced = event.matches;
      bindings.forEach(binding => reduced ? binding.reset() : binding.refresh());
    }

    window.addEventListener('portfolio-motion-change', onMotionChange);
    preference.addEventListener('change', onPreferenceChange);

    return () => {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('portfolio-motion-change', onMotionChange);
      preference.removeEventListener('change', onPreferenceChange);
      bindings.forEach(binding => binding.cleanup());
      bindings.length = 0;
    };
  };
})();
