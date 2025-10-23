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

// Transistion height
const tabContent = document.getElementById('authTabsContent');
const tabs = document.querySelectorAll('#authTabs button');
const imageContainer = document.querySelector('.auth-image-container');

function setTabHeight(activeTabId) {
  const activePane = document.querySelector(activeTabId);
  const height = activePane.scrollHeight;

  tabContent.style.height = height + 'px';
  imageContainer.style.height = height + 'px';
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
