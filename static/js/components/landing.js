document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll('.fade-section');

  const heroRoot = document.querySelector('.hero-header');
  let heroObserver = null;
  if (heroRoot) {
    heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const ratio = entry.intersectionRatio;
        const heroChildren = heroRoot.querySelectorAll('.fade-section');
        // Show when at least 25% of the hero is visible.
        if (ratio >= 0.25) {
          heroChildren.forEach(el => el.classList.add('visible'));
        }
        // Hide when less than 5% is visible. This gap avoids rapid toggling.
        else if (ratio <= 0.05) {
          heroChildren.forEach(el => el.classList.remove('visible'));
        }
      });
    }, { threshold: [0, 0.05, 0.25, 0.5], rootMargin: '0px 0px -10% 0px' });

    heroObserver.observe(heroRoot);
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
  // Use a WeakMap of timers so each element has its own removal timer.
  if (!observer._exitTimers) observer._exitTimers = new WeakMap();
  // Small delay before removing visibility to avoid edge jitter
  const REMOVE_DELAY = 150; // ms

        const clearExitTimer = (el) => {
          const t = observer._exitTimers.get(el);
          if (t) {
            clearTimeout(t);
            observer._exitTimers.delete(el);
          }
        };
        // observed separately to avoid per-child jitter.
        if (entry.target.closest('.hero-header')) return;

        // Special handling for the features section: use intersectionRatio
        // thresholds (hysteresis) so the cards don't jitter when the section
        // is near the viewport edge.
        if (entry.target.classList.contains('features')) {
          const ratio = entry.intersectionRatio;
          const cards = entry.target.querySelectorAll('.card');

          // Show when at least 20% visible
          if (ratio >= 0.2) {
            clearExitTimer(entry.target);
            entry.target.classList.add('visible');
            if (window.innerWidth <= 768) {
              cards.forEach((card, index) => {
                card.style.transitionDelay = `${index * 0.2}s`;
                card.classList.add('visible');
              });
            } else {
              cards.forEach(card => {
                card.style.transitionDelay = '0s';
                card.classList.add('visible');
              });
            }
          }
          // Hide when almost out of view (<5%) — gap prevents rapid toggling
          // Remove immediately (no timer delay) so it can re-animate when scrolled back
          else if (ratio < 0.05) {
            clearExitTimer(entry.target);
            entry.target.classList.remove('visible');
            cards.forEach(card => {
              card.classList.remove('visible');
              card.style.transitionDelay = '0s';
            });
          }

          return;
        }

        // Otherwise handle non-hero, non-features sections as before
        if (entry.isIntersecting) {
          // Cancel any pending removal and show immediately
          clearExitTimer(entry.target);
          entry.target.classList.add('visible');
        } else {
          clearExitTimer(entry.target);
          const timer = setTimeout(() => {
            entry.target.classList.remove('visible');
            observer._exitTimers.delete(entry.target);
          }, REMOVE_DELAY);
          observer._exitTimers.set(entry.target, timer);
        }
      });
    },
    { threshold: [0, 0.05, 0.2, 0.5] }
  );

  sections.forEach(section => observer.observe(section));
});
