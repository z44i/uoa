// frontend/js/auth.js
'use strict';

const Auth = (() => {
  function getUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
  }
  function setUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
  function getToken() { return localStorage.getItem('token'); }

  async function doLogin() {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const alertEl  = document.getElementById('login-alert');

    if (!username || !password) {
      alertEl.innerHTML = '<div class="alert alert-danger">⚠️ يرجى إدخال اسم المستخدم وكلمة المرور</div>';
      return;
    }

    // Show loading
    const btn = document.querySelector('#login-page .btn-primary');
    const origText = btn.innerHTML;
    btn.innerHTML = '⏳ جاري الدخول...';
    btn.disabled  = true;

    try {
      const res = await api.login(username, password);
      if (!res || !res.success) {
        alertEl.innerHTML = `<div class="alert alert-danger">❌ ${res?.message || 'بيانات خاطئة'}</div>`;
        return;
      }

      localStorage.setItem('token', res.token);
      setUser(res.user);

      // Boot app
      App.boot(res.user);
    } catch (err) {
      alertEl.innerHTML = '<div class="alert alert-danger">❌ تعذّر الاتصال بالسيرفر</div>';
    } finally {
      btn.innerHTML = origText;
      btn.disabled  = false;
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    document.getElementById('app').style.display        = 'none';
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-alert').innerHTML = '';
  }

  // Auto-login if token exists
  async function tryAutoLogin() {
    if (!getToken()) return false;
    try {
      const res = await api.getMe();
      if (res && res.success) {
        setUser(res.user);
        App.boot(res.user);
        return true;
      }
    } catch {}
    localStorage.removeItem('token');
    return false;
  }

  return { doLogin, logout, getUser, tryAutoLogin };
})();

window.Auth = Auth;
window.doLogin  = Auth.doLogin;
window.logout   = Auth.logout;
