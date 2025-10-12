//last resort
document.addEventListener('DOMContentLoaded', function() {
  const aboutOverlay = document.querySelector('.about-overlay');
  const featuresContainer = document.querySelector('.features-container');
  
  function handleScroll() {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const triggerPoint = windowHeight * 0.8; // Increased to 80% - triggers later, more forgiving
    
    // Fade out about section and fade in features section
    if (scrollPosition > triggerPoint) {
      aboutOverlay.classList.add('fade-out');
      featuresContainer.classList.add('fade-in');
    } else {
      aboutOverlay.classList.remove('fade-out');
      featuresContainer.classList.remove('fade-in');
    }
  }
  
  // Listen for scroll events
  window.addEventListener('scroll', handleScroll);
  
  // Initial check
  handleScroll();
});

// // BUGGY TRANSITION
// document.addEventListener('DOMContentLoaded', function() {
//   const aboutOverlay = document.querySelector('.about-overlay');
//   const featuresContainer = document.querySelector('.features-container');
//   const aboutSection = document.querySelector('.about-section');
  
//   function handleScroll() {
//     const scrollPosition = window.scrollY;
//     const windowHeight = window.innerHeight;
//     const aboutHeight = aboutSection.offsetHeight;
//     const triggerPoint = windowHeight * 0.3; // Lower threshold for earlier trigger
    
//     // High sensitivity - moves container faster with less scroll
//     const sensitivity = 8;
    
//     // Calculate how far to move based on scroll position
//     const moveDistance = Math.min(scrollPosition * sensitivity, aboutHeight);
    
//     // Fade out about section and fade in features section
//     if (scrollPosition > triggerPoint) {
//       aboutOverlay.classList.add('fade-out');
//       featuresContainer.classList.add('fade-in');
//     } else {
//       aboutOverlay.classList.remove('fade-out');
//       featuresContainer.classList.remove('fade-in');
//     }
    
//     // Move the features container up smoothly with high sensitivity
//     featuresContainer.style.transform = `translateY(-${moveDistance}px)`;
//     featuresContainer.style.transition = 'transform 0.05s ease-out, opacity 0.8s ease-out';
//   }
  
//   // Listen for scroll events
//   window.addEventListener('scroll', handleScroll);
  
//   // Initial check
//   handleScroll();
// });