// frontend/js/ui.js
'use strict';

const UI = (() => {
  let _toastTimer;

  function showToast(msg, bg = '#0f2744') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = bg;
    t.style.display = 'block';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.style.display = 'none', 2800);
  }

  function setContent(html) {
    document.getElementById('main-content').innerHTML = html;
  }

  function openModal(html) {
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal').classList.add('show');
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('show');
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function linkify(s) {
    if (!s) return '';
    const str = String(s).trim();
    if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/uploads/')) {
      const isDrive = str.includes('drive.google.com') || str.includes('docs.google.com');
      const isPdf = str.toLowerCase().endsWith('.pdf');
      const icon = isDrive ? '📁' : isPdf ? '📄' : '📎';
      const label = isDrive ? 'مستند Google Drive' : isPdf ? 'ملف PDF المرفق' : 'عرض الملف المرفق';
      return `<a href="${str}" target="_blank" rel="noopener noreferrer" class="attachment-pill" title="${str}">
        <span class="attachment-icon">${icon}</span>
        <span class="attachment-text">${label}</span>
        <span class="attachment-arrow">↗</span>
      </a>`;
    }
    return str.replace(
      /(https?:\/\/[^\s<>]+)/g,
      u => `<a href="${u}" target="_blank" rel="noopener noreferrer" class="attachment-pill" title="${u}">
        <span class="attachment-icon">📎</span>
        <span class="attachment-text">فتح المرفق</span>
        <span class="attachment-arrow">↗</span>
      </a>`
    );
  }

  function statusBadge(s) {
    return s === 'approved'
      ? '<span class="status status-approved">✅ معتمد</span>'
      : s === 'rejected'
      ? '<span class="status status-rejected">❌ غير معتمد</span>'
      : '<span class="status status-pending">⏳ قيد التصويت</span>';
  }

  function progressBar(app, rej, total) {
    const pA = total ? Math.round((app / total) * 100) : 0;
    const pR = total ? Math.round((rej / total) * 100) : 0;
    return `<div class="progress-wrap">
      <div class="progress-fill-approve" style="width:${pA}%"></div>
      <div class="progress-fill-reject" style="width:${pR}%"></div>
    </div>`;
  }

  function loading(msg = 'جاري التحميل...') {
    setContent(`<div class="empty-state"><div class="empty-icon">⏳</div>
      <div class="empty-title">${msg}</div></div>`);
  }

  function errorState(msg = 'حدث خطأ') {
    setContent(`<div class="empty-state"><div class="empty-icon">❌</div>
      <div class="empty-title">${msg}</div>
      <div class="empty-sub">تحقق من اتصالك بالسيرفر</div></div>`);
  }

  function toggleSidebar() {
    if (window.innerWidth <= 860) {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('sidebar-backdrop');
      if (sb) sb.classList.toggle('open');
      if (bd) bd.classList.toggle('show');
    } else {
      // Desktop collapse / expand
      const layout = document.querySelector('.main-layout');
      if (layout) layout.classList.toggle('sidebar-collapsed');
    }
  }

  function setSystemFont(fontKey) {
    const fonts = {
      'ibm': "'IBM Plex Sans Arabic', sans-serif",
      'cairo': "'Cairo', sans-serif",
      'tajawal': "'Tajawal', sans-serif",
      'almarai': "'Almarai', sans-serif",
      'kufi': "'Noto Kufi Arabic', sans-serif"
    };
    const chosen = fonts[fontKey] || fonts['ibm'];
    document.documentElement.style.setProperty('--font-main', chosen);
    document.body.style.fontFamily = chosen;
  }

  function setFavicon(iconUrl) {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;
  }

  function applyBranding(settings) {
    if (!settings) return;
    const title = settings.system_title || 'نظام إدارة الأنشطة';

    if (settings.font_family) {
      setSystemFont(settings.font_family);
    }

    // Set Dynamic Favicon in Browser Tab
    if (settings.logo_type === 'image' && settings.logo_image) {
      setFavicon(settings.logo_image);
    } else {
      // Create SVG favicon from emoji
      const emoji = settings.logo_emoji || '🏛️';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
      setFavicon('data:image/svg+xml,' + encodeURIComponent(svg));
    }

    const brandSpan = document.querySelector('.topbar-brand span');
    if (brandSpan) brandSpan.textContent = title;

    const brandIcon = document.querySelector('.topbar-brand-icon');
    if (brandIcon) {
      if (settings.logo_type === 'image' && settings.logo_image) {
        brandIcon.innerHTML = `<img src="${settings.logo_image}" style="width:26px;height:26px;object-fit:contain;border-radius:4px">`;
      } else {
        brandIcon.textContent = settings.logo_emoji || '🏛️';
      }
    }

    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) {
      if (settings.logo_type === 'image' && settings.logo_image) {
        loginLogo.innerHTML = `<img src="${settings.logo_image}" style="width:44px;height:44px;object-fit:contain;border-radius:8px">`;
      } else {
        loginLogo.textContent = settings.logo_emoji || '🏛️';
      }
    }

    const loginTitle = document.querySelector('.login-title');
    if (loginTitle) loginTitle.textContent = title;

    const loginSub = document.querySelector('.login-sub');
    if (loginSub) loginSub.textContent = settings.system_subtitle || 'وحدة التنمية المستدامة - جامعة الانبار';

    const univSub = document.querySelector('.univ-sub');
    if (univSub) univSub.textContent = settings.system_subtitle || 'وحدة التنمية المستدامة - جامعة الانبار';

    const loginMeta = document.querySelector('.login-meta-note');
    if (loginMeta) loginMeta.textContent = settings.system_subtitle || 'وحدة التنمية المستدامة - جامعة الانبار';

    document.title = title;
  }

  return { showToast, setContent, openModal, closeModal, esc, linkify, statusBadge, progressBar, loading, errorState, toggleSidebar, applyBranding, setSystemFont };
})();

window.UI = UI;
window.showToast   = UI.showToast;
window.closeModal  = UI.closeModal;
window.toggleSidebar = UI.toggleSidebar;
