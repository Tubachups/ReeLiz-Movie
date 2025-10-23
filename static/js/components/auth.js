// auth.js - handles subtitle change between Login and Sign Up

document.addEventListener("DOMContentLoaded", () => {
  const subtitle = document.getElementById('tabSubtitle');
  const loginTab = document.getElementById('login-tab');
  const signupTab = document.getElementById('signup-tab');

  if (loginTab && signupTab && subtitle) {
    loginTab.addEventListener('click', () => {
      subtitle.textContent = 'Welcome back!';
    });

    signupTab.addEventListener('click', () => {
      subtitle.textContent = 'Create your account';
    });
  }
});
