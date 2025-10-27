document.addEventListener("DOMContentLoaded", () => {
  const subtitle = document.getElementById('tabSubtitle');
  const loginTab = document.getElementById('login-tab');
  const signupTab = document.getElementById('signup-tab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const successAlert = document.querySelector('.alert-success');

  function setSubtitleFor(tabName) {
    if (!subtitle) return;
    subtitle.textContent = tabName === 'signup' ? 'Create your account.' : 'Welcome back!';
  }

  const imageContainer = document.querySelector('.auth-image-container');
  function updateImageState(tabName) {
    if (!imageContainer) return;
    imageContainer.classList.toggle('signup-active', tabName === 'signup');
    imageContainer.classList.toggle('login-active', tabName !== 'signup');
  }

  if (loginTab) {
    loginTab.addEventListener('click', () => {
      setSubtitleFor('login');
      localStorage.setItem('authActiveTab', 'login');
      updateImageState('login');
    });
  }
  if (signupTab) {
    signupTab.addEventListener('click', () => {
      setSubtitleFor('signup');
      localStorage.setItem('authActiveTab', 'signup');
      updateImageState('signup');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', () => {
      localStorage.setItem('authActiveTab', 'login');
    });
  }
  if (signupForm) {
    signupForm.addEventListener('submit', () => {
      localStorage.setItem('authActiveTab', 'signup');
    });
  }

  if (successAlert) {
    localStorage.removeItem('authActiveTab');
  }

  const saved = localStorage.getItem('authActiveTab');
  if (saved) {
    const targetBtn = document.querySelector(`#authTabs button[data-bs-target="#${saved}"]`);
    if (targetBtn && typeof bootstrap !== 'undefined') {
      const bsTab = new bootstrap.Tab(targetBtn);
      bsTab.show();
      setSubtitleFor(saved);
      updateImageState(saved);
    } else {
      updateImageState('login');
    }
  } else {
    updateImageState('login');
  }

  // --- Synchronized transition logic ---
  const tabContent = document.getElementById('authTabsContent');
  const tabs = document.querySelectorAll('#authTabs button');
  const card = document.querySelector('.card');

  // Helper that animates both content height and image height in the same frame
  function setTabHeight(activeTabId) {
    const activePane = document.querySelector(activeTabId);
    if (!activePane || !tabContent) return;

    // current heights (starting values)
    const fromContentHeight = tabContent.clientHeight || tabContent.offsetHeight || 0;
    const toContentHeight = activePane.scrollHeight;

    const fromImageHeight = imageContainer ? (imageContainer.clientHeight || imageContainer.offsetHeight || 0) : 0;
    const delta = toContentHeight - fromContentHeight;
    const toImageHeight = imageContainer && card ? Math.max(0, card.offsetHeight + delta) : fromImageHeight;

    // ensure both elements have an explicit start height before transitioning
    tabContent.classList.add('no-transition');
    if (imageContainer) imageContainer.classList.add('no-transition');

    tabContent.style.height = fromContentHeight + 'px';
    if (imageContainer) imageContainer.style.height = fromImageHeight + 'px';

    // next frame: remove no-transition and set target heights so transitions start together
    requestAnimationFrame(() => {
      // force reflow
      void tabContent.offsetHeight;
      tabContent.classList.remove('no-transition');
      if (imageContainer) imageContainer.classList.remove('no-transition');

      // set target heights (this starts the CSS transitions simultaneously)
      tabContent.style.height = toContentHeight + 'px';
      if (imageContainer) imageContainer.style.height = toImageHeight + 'px';
    });
  }

  function recompute() {
    const activePane = document.querySelector('#authTabsContent .tab-pane.active');
    if (activePane) setTabHeight('#' + activePane.id);
  }

  // run once on load (use rAF for reliable timing)
  requestAnimationFrame(recompute);

  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', e => {
      const target = e.target.getAttribute('data-bs-target');
      // update image state immediately and then animate heights synchronously
      const targetName = target.replace('#', '');
      updateImageState(targetName);
      setTabHeight(target);
    });
  });

  // Observe alert changes and recompute immediately on mutation (use rAF)
  const cardBody = document.querySelector('.card-body');
  if (cardBody && typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => requestAnimationFrame(recompute));
    mo.observe(cardBody, { childList: true, subtree: true });
  }

  // listen for Bootstrap alert events and recompute in next rAF
  document.querySelectorAll('.alert').forEach(a => {
    a.addEventListener('closed.bs.alert', () => requestAnimationFrame(recompute));
    a.addEventListener('shown.bs.alert', () => requestAnimationFrame(recompute));
  });

  // Recompute on resize (debounced slightly using rAF)
  let resizeScheduled = false;
  window.addEventListener('resize', () => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
      recompute();
      resizeScheduled = false;
    });
  });
});