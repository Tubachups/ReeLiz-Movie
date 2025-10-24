// Subtitle change
document.addEventListener("DOMContentLoaded", () => {
  const subtitle = document.getElementById('tabSubtitle');
  const loginTab = document.getElementById('login-tab');
  const signupTab = document.getElementById('signup-tab');

  if (loginTab && signupTab && subtitle) {
    loginTab.addEventListener('click', () => {
      subtitle.textContent = 'Welcome back!';
    });

    signupTab.addEventListener('click', () => {
      subtitle.textContent = 'Create your account.';
    });
  }
});

// Transition height
const tabContent = document.getElementById('authTabsContent');
const tabs = document.querySelectorAll('#authTabs button');
const imageContainer = document.querySelector('.auth-image-container');
const card = document.querySelector('.card');

function setTabHeight(activeTabId) {
  const activePane = document.querySelector(activeTabId);
  if (!activePane || !tabContent) return;

  const contentHeight = activePane.scrollHeight;

  tabContent.style.height = contentHeight + 'px';

  if (imageContainer && card) {
    const currentContentHeight = tabContent.clientHeight || tabContent.offsetHeight || 0;
    const delta = contentHeight - currentContentHeight;
    const predictedCardHeight = Math.max(0, card.offsetHeight + delta);

    imageContainer.style.height = predictedCardHeight + 'px';
  }
}

window.addEventListener('load', () => {
  const activePane = document.querySelector('#authTabsContent .tab-pane.active');
  setTabHeight('#' + activePane.id);
});

// Update height on tab show
tabs.forEach(tab => {
  tab.addEventListener('shown.bs.tab', e => {
    setTabHeight(e.target.getAttribute('data-bs-target'));
  });
});