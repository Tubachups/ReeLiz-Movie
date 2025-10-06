document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll('.fade-section');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          
          if (entry.target.classList.contains('features')) {
            const cards = entry.target.querySelectorAll('.card');

            // MOBILE
            if (window.innerWidth <= 768) {
              cards.forEach((card, index) => {
                card.style.transitionDelay = `${index * 0.2}s`;
                card.classList.add('visible');
              });
            } 
            // DESKTOP
            else {
              cards.forEach(card => {
                card.style.transitionDelay = '0s';
                card.classList.add('visible');
              });
            }
          }

        } else {
          entry.target.classList.remove('visible');
          if (entry.target.classList.contains('features')) {
            const cards = entry.target.querySelectorAll('.card');
            cards.forEach(card => {
              card.classList.remove('visible');
              card.style.transitionDelay = '0s';
            });
          }
        }
      });
    },
    { threshold: 0.2 }
  );

  sections.forEach(section => observer.observe(section));
});
