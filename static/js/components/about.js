document.addEventListener('scroll', () => {
  const features = document.querySelector('.features-container');
  const aboutSection = document.querySelector('.about-section');
  const scrollY = window.scrollY;
  const aboutHeight = aboutSection.offsetHeight;
  
  // Much higher sensitivity - moves container faster with less scroll
  const sensitivity = 8;
  
  // Calculate how far to move based on scroll position
  const moveDistance = Math.min(scrollY * sensitivity, aboutHeight);
  
  // Move the features container and everything below it up smoothly
  features.style.transform = `translateY(-${moveDistance}px)`;
  
  // Smooth transition
  features.style.transition = 'transform 0.05s ease-out';
});