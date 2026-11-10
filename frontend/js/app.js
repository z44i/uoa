// frontend/js/app.js
'use strict';

const App = (() => {
  let _user = null;

  async function boot(user) {
    _user = user;
    const loginEl = document.getElementById('login-page');
    if (loginEl) loginEl.style.display = 'none';

    const appEl = document.getElementById('app');
    if (appEl) appEl.style.display = 'block';

    const nameEl = document.getElementById('topbar-name');
    if (nameEl) nameEl.textContent = user.name;

    const subEl = document.getElementById('topbar-sub');
    if (subEl) subEl.textContent = user.role === 'admin' ? 'المدير الرئيسي' : 'عضو فريق';

    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) avatarEl.textContent = (user.name || 'م').charAt(0);

    const badgeEl = document.getElementById('topbar-badge');
    if (badgeEl) {
      badgeEl.innerHTML =
        user.role === 'admin'
          ? '<span class="badge badge-admin">مدير</span>'
          : '<span class="badge badge-member">عضو</span>';
    }

    const mobMenu = document.getElementById('mob-menu');
    if (mobMenu && window.innerWidth <= 768) {
      mobMenu.style.display = 'flex';
    }

    const fab = document.getElementById('fab-create-form');
    if (fab) {
      fab.style.display = user.role === 'admin' ? 'flex' : 'none';
    }

    try {
      const res = await api.getSettings();
      if (res && res.success) UI.applyBranding(res.settings);
    } catch(e) {}

    buildSidebar();
    
    // Restore current page from URL hash or localStorage, default to dashboard/my-votes
    const savedHash = window.location.hash.replace('#', '').trim();
    const savedPage = savedHash || localStorage.getItem('last_active_page');
    const defaultPage = user.role === 'admin' ? 'dashboard' : 'my-votes';
    const targetPage = (savedPage && mapHasPage(savedPage, user.role)) ? savedPage : defaultPage;
    
    navigate(targetPage);
  }

  function mapHasPage(p, role) {
    const adminPages = ['dashboard', 'activities', 'form-builder', 'upload', 'members', 'stats', 'settings'];
    const memberPages = ['my-votes', 'my-history', 'settings'];
    return role === 'admin' ? adminPages.includes(p) : memberPages.includes(p);
  }

  function buildSidebar() {
    const isAdmin = _user && _user.role === 'admin';
    const adminItems = [
      { icon: '📊', label: 'لوحة التحكم',             page: 'dashboard' },
      { icon: '📋', label: 'الأنشطة والتقييم',         page: 'activities' },
      { icon: '📑', label: 'منشئ الاستمارات (Forms)',  page: 'form-builder' },
      { icon: '📤', label: 'رفع أنشطة Excel',         page: 'upload' },
      { icon: '👥', label: 'إدارة الأعضاء والصلاحيات', page: 'members' },
      { icon: '📈', label: 'إحصائيات الأعضاء',        page: 'stats' },
      { icon: '⚙️', label: 'الإعدادات والهوية',       page: 'settings' }
    ];
    const memberItems = [
      { icon: '🗳️', label: 'التصويت',      page: 'my-votes' },
      { icon: '📜', label: 'سجل تصويتاتي', page: 'my-history' },
      { icon: '⚙️', label: 'الإعدادات',    page: 'settings' }
    ];
    const items = isAdmin ? adminItems : memberItems;
    const targetEl = document.getElementById('sidebar-nav-container') || document.getElementById('sidebar');
    targetEl.innerHTML =
      '<div class="sidebar-section">' + (isAdmin ? 'إدارة النظام' : 'لوحة العضو') + '</div>' +
      items.map(i =>
        '<button class="nav-item" id="nav-' + i.page + '" onclick="App.navigate(\'' + i.page + '\')">' +
        '<span class="nav-icon">' + i.icon + '</span>' + i.label + '</button>'
      ).join('');
  }

  function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById('nav-' + page);
    if (el) el.classList.add('active');
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    if (sb) sb.classList.remove('open');
    if (bd) bd.classList.remove('show');

    // Save active page to localStorage and URL hash so refresh keeps the user on the exact same page!
    localStorage.setItem('last_active_page', page);
    if (window.location.hash !== '#' + page) {
      window.history.replaceState(null, '', '#' + page);
    }

    const map = {
      'dashboard':   function(){ Activities.pageDashboard(); },
      'activities':  function(){ Activities.pageActivities(); },
      'form-link':   function(){ Activities.pageFormLink(); },
      'form-builder':function(){ FormBuilder.page(); },
      'upload':      function(){ Activities.pageUpload(); },
      'members':     function(){ Members.page(); },
      'stats':       function(){ Activities.pageStats(); },
      'my-votes':    function(){ Activities.pageMyVotes(); },
      'my-history':  function(){ Activities.pageMyHistory(); },
      'settings':    function(){ Settings.page(); }
    };
    if (map[page]) map[page]();
  }

  function getUser() { return _user; }

  return { getUser: getUser, boot: boot, buildSidebar: buildSidebar, navigate: navigate };
})();

window.App = App;

// ─── MEMBERS ───
var Members = (function() {

  async function page() {
    UI.loading('جاري تحميل الأعضاء...');
    var res = await api.getUsers();
    if (!res || !res.success) { UI.errorState('تعذّر تحميل الأعضاء'); return; }
    var users   = res.users || [];
    var members = users.filter(function(u){ return u.role === 'member'; });

    var rows = members.map(function(m) {
      var done  = m.voteCount || 0;
      var total = m.totalActivities || 0;
      var pct   = total ? Math.round((done / total) * 100) : 0;
      return '<tr>' +
        '<td><div style="font-weight:700">' + UI.esc(m.name) + '</div>' +
        '<div style="font-size:.75rem;color:var(--muted)">' + UI.esc(m.username) + '</div></td>' +
        '<td><span class="status ' + (m.active ? 'status-approved' : 'status-rejected') + '">' + (m.active ? 'مفعّل' : 'موقوف') + '</span></td>' +
        '<td><div style="font-size:.8rem;margin-bottom:3px">' + done + '/' + total + '</div>' +
        '<div class="progress-wrap" style="width:80px;height:5px">' +
        '<div class="progress-fill-approve" style="width:' + pct + '%"></div></div></td>' +
        '<td><div class="td-actions">' +
        '<button class="btn btn-xs btn-outline" onclick="Members.editModal(\'' + m.id + '\')">✏️</button>' +
        '<button class="btn btn-xs btn-ghost" onclick="Members.toggle(\'' + m.id + '\')">' + (m.active ? '⏸' : '▶') + '</button>' +
        '<button class="btn btn-xs btn-danger" onclick="Members.del(\'' + m.id + '\')">🗑️</button>' +
        '</div></td></tr>';
    }).join('');

    UI.setContent(
      '<div class="card">' +
      '<div class="card-title">👥 إدارة الأعضاء' +
      '<div class="card-title-actions"><button class="btn btn-sm btn-primary" onclick="Members.addModal()">➕ عضو جديد</button></div></div>' +
      (members.length
        ? '<div class="table-wrap"><table><thead><tr><th>العضو</th><th>الحالة</th><th>التصويت</th><th>إجراءات</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">لا يوجد أعضاء</div>' +
          '<button class="btn btn-primary" style="margin-top:1rem" onclick="Members.addModal()">➕ إضافة عضو</button></div>') +
      '</div>'
    );
  }

  function formHtml(m) {
    return '<div class="col-2">' +
      '<div class="form-group" style="grid-column:1/-1"><label>الاسم الكامل *</label>' +
      '<input class="form-control" id="mf-name" value="' + (m ? UI.esc(m.name) : '') + '" placeholder="الاسم الكامل"></div>' +
      '<div class="form-group"><label>اسم المستخدم *</label>' +
      '<input class="form-control" id="mf-user" value="' + (m ? UI.esc(m.username) : '') + '" placeholder="username" dir="ltr"></div>' +
      '<div class="form-group"><label>' + (m ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور *') + '</label>' +
      '<input class="form-control" type="password" id="mf-pass" placeholder="••••••"></div></div>';
  }

  function addModal() {
    UI.openModal(
      '<div class="modal-title">➕ إضافة عضو جديد</div>' + formHtml(null) +
      '<div class="modal-footer">' +
      '<button class="btn btn-outline" onclick="UI.closeModal()">إلغاء</button>' +
      '<button class="btn btn-primary" onclick="Members.save(null)">حفظ</button></div>'
    );
  }

  async function editModal(id) {
    var res = await api.getUsers();
    var m   = (res && res.users ? res.users : []).find(function(u){ return u.id === id; });
    if (!m) return;
    UI.openModal(
      '<div class="modal-title">✏️ تعديل العضو</div>' + formHtml(m) +
      '<div class="modal-footer">' +
      '<button class="btn btn-outline" onclick="UI.closeModal()">إلغاء</button>' +
      '<button class="btn btn-primary" onclick="Members.save(\'' + id + '\')">حفظ التعديلات</button></div>'
    );
  }

  async function save(id) {
    var name     = document.getElementById('mf-name').value.trim();
    var username = document.getElementById('mf-user').value.trim();
    var password = document.getElementById('mf-pass').value;
    if (!name || !username) { UI.showToast('الاسم واسم المستخدم مطلوبان', '#dc2626'); return; }
    if (!id && !password)   { UI.showToast('كلمة المرور مطلوبة', '#dc2626'); return; }
    var data = { name: name, username: username };
    if (password) data.password = password;
    var res = id ? await api.updateUser(id, data) : await api.createUser(Object.assign({}, data, { role: 'member' }));
    if (res && res.success) { UI.closeModal(); UI.showToast('✅ تم الحفظ', '#059669'); page(); }
    else UI.showToast((res && res.message) || 'خطأ', '#dc2626');
  }

  async function toggle(id) {
    var res = await api.toggleUser(id);
    if (res && res.success) {
      UI.showToast(res.active ? '✅ تم التفعيل' : '⏸ تم التعطيل', res.active ? '#059669' : '#d97706');
      page();
    }
  }

  async function del(id) {
    if (!confirm('سيتم حذف العضو وجميع تصويتاته. متأكد؟')) return;
    var res = await api.deleteUser(id);
    if (res && res.success) { UI.showToast('تم الحذف', '#dc2626'); page(); }
    else UI.showToast((res && res.message) || 'خطأ', '#dc2626');
  }

  return { page: page, addModal: addModal, editModal: editModal, save: save, toggle: toggle, del: del };
})();
window.Members = Members;

// ─── SETTINGS ───
var Settings = (function() {

  async function page() {
    UI.loading('جاري تحميل الإعدادات...');
    var res = await api.getSettings();
    var s   = (res && res.settings) ? res.settings : {};
    var isAdmin = App.getUser() && App.getUser().role === 'admin';

    var adminHtml = '';
    if (isAdmin) {
      var logoPreview = (s.logo_type === 'image' && s.logo_image)
        ? '<img src="' + s.logo_image + '" style="width:60px;height:60px;object-fit:contain;border-radius:10px;border:1px solid var(--border)">'
        : '<div style="width:60px;height:60px;background:linear-gradient(135deg,var(--primary),var(--primary-light));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:2rem">' + UI.esc(s.logo_emoji || '🏛️') + '</div>';

      adminHtml =
        '<div class="card"><div class="card-title">🎨 هوية النظام ومظهره</div>' +
        '<div class="form-group"><label>عنوان النظام</label><input class="form-control" id="st-title" value="' + UI.esc(s.system_title || 'نظام إدارة الأنشطة') + '"></div>' +
        '<div class="form-group"><label>العنوان الفرعي</label><input class="form-control" id="st-sub" value="' + UI.esc(s.system_subtitle || 'وحدة التنمية المستدامة - جامعة الانبار') + '"></div>' +
        '<div class="form-group"><label>نوع خط النظام (الخط العربي)</label>' +
        '<select class="form-control" id="st-font" onchange="UI.setSystemFont(this.value)">' +
        '<option value="ibm"' + ((s.font_family||'ibm')==='ibm'?' selected':'') + '>IBM Plex Sans Arabic (حديث ورسمي)</option>' +
        '<option value="cairo"' + (s.font_family==='cairo'?' selected':'') + '>Cairo (واضح وعريض)</option>' +
        '<option value="tajawal"' + (s.font_family==='tajawal'?' selected':'') + '>Tajawal (ناعم وهادئ)</option>' +
        '<option value="almarai"' + (s.font_family==='almarai'?' selected':'') + '>Almarai (أنيق ومقروء)</option>' +
        '<option value="kufi"' + (s.font_family==='kufi'?' selected':'') + '>Noto Kufi Arabic (خط كوفي عصري)</option>' +
        '</select></div>' +
        '<div style="display:flex;align-items:center;gap:1.2rem;margin-bottom:1rem">' +
        '<div id="logo-preview">' + logoPreview + '</div>' +
        '<div><div style="display:flex;gap:.5rem;margin-bottom:.5rem">' +
        '<button class="btn btn-sm ' + (s.logo_type === 'emoji' ? 'btn-primary' : 'btn-ghost') + '" onclick="Settings.switchLogo(\'emoji\')">😀 إيموجي</button>' +
        '<button class="btn btn-sm ' + (s.logo_type === 'image' ? 'btn-primary' : 'btn-ghost') + '" onclick="Settings.switchLogo(\'image\')">🖼️ صورة</button>' +
        '</div></div></div>' +
        '<div id="emoji-sec" style="display:' + (s.logo_type !== 'image' ? 'block' : 'none') + '">' +
        '<div class="form-group"><label>إيموجي الشعار</label>' +
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">' +
        ['🏛️','🎯','🏆','⭐','🔰','🌟','💎','🛡️','📋','🏅','🎖️','🔷','🌐','⚡','🎗️','🏢'].map(function(e){
          return '<button onclick="Settings.pickEmoji(\'' + e + '\')" style="font-size:1.6rem;background:' + (s.logo_emoji===e?'var(--bg)':'transparent') + ';border:2px solid ' + (s.logo_emoji===e?'var(--primary-light)':'var(--border)') + ';border-radius:8px;padding:.2rem .4rem;cursor:pointer">' + e + '</button>';
        }).join('') +
        '</div><input class="form-control" id="st-emoji" value="' + UI.esc(s.logo_emoji || '🏛️') + '" style="max-width:120px;font-size:1.3rem;text-align:center" oninput="Settings.previewEmoji(this.value)"></div></div>' +
        '<div id="image-sec" style="display:' + (s.logo_type === 'image' ? 'block' : 'none') + '">' +
        '<div class="upload-zone" style="padding:1.2rem" onclick="document.getElementById(\'logo-inp\').click()">' +
        '<div>🖼️ اضغط لرفع الصورة</div>' +
        '<input type="file" id="logo-inp" accept="image/*" style="display:none" onchange="Settings.uploadLogo(this)"></div></div>' +
        '<button class="btn btn-primary" style="margin-top:1rem" onclick="Settings.saveIdentity()">💾 حفظ هوية ومظهر النظام</button></div>' +

        '<div class="card"><div class="card-title">☁️ ربط خدمات Google Drive & Sheets العامة</div>' +
        '<div style="font-size:0.88rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">' +
        'اربط النظام مرة واحدة هنا بحساب Google Drive الخاص بك (أو بريدك الإلكتروني). عند رفع أي استمارة أو ملفات PDF سيتم فرزها وتخزينها تلقائياً داخل مجلد باسم الاستمارة وتسمية الملفات بأسماء أصحابها أو أنشطتهم، ويمكنك تغيير أو فك الرابط في أي وقت.' +
        '</div>' +
        '<div class="form-group">' +
        '<label>رابط Google Apps Script Webhook العام للنظام</label>' +
        '<input class="form-control" id="st-google-webhook" placeholder="https://script.google.com/macros/s/.../exec" value="' + UI.esc(s.google_webhook_url || '') + '" dir="ltr">' +
        '<div style="font-size:0.75rem;color:var(--muted);margin-top:0.35rem">💡 عند ضبط هذا الرابط، ستعتمد عليه جميع الاستمارات تلقائياً بدون الحاجة لإدخاله في كل استمارة على حدة.</div>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="Settings.saveIdentity()">💾 حفظ إعدادات الربط مع Google</button></div>' +

        '<div class="card"><div class="card-title">👤 حساب المدير</div>' +
        '<div id="adm-alert"></div>' +
        '<div class="col-2">' +
        '<div class="form-group" style="grid-column:1/-1"><label>الاسم الكامل</label><input class="form-control" id="adm-name" value="' + UI.esc((App.getUser() && App.getUser().name) || '') + '"></div>' +
        '<div class="form-group"><label>اسم المستخدم</label><input class="form-control" id="adm-user" value="' + UI.esc((App.getUser() && App.getUser().username) || '') + '" dir="ltr"></div>' +
        '<div class="form-group"><label>كلمة المرور الحالية</label><input class="form-control" type="password" id="adm-old"></div>' +
        '<div class="form-group"><label>كلمة المرور الجديدة</label><input class="form-control" type="password" id="adm-new" placeholder="اتركها فارغة للإبقاء"></div>' +
        '<div class="form-group"><label>تأكيد كلمة المرور</label><input class="form-control" type="password" id="adm-conf"></div></div>' +
        '<button class="btn btn-primary" onclick="Settings.saveAdmin()">💾 حفظ بيانات الحساب</button></div>' +

        '<div class="card" style="border-color:var(--danger)"><div class="card-title" style="color:var(--danger)">⚠️ تصفير النظام</div>' +
        '<div class="alert alert-danger">تحذير: لا يمكن التراجع</div>' +
        '<div style="display:flex;flex-direction:column;gap:.8rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border);flex-wrap:wrap;gap:.5rem">' +
        '<div><div style="font-weight:700">تصفير التصويتات فقط</div><div style="font-size:.78rem;color:var(--muted)">مع الإبقاء على الأنشطة</div></div>' +
        '<button class="btn btn-sm btn-warning" onclick="Activities.confirmResetVotes()">🔄 تصفير التصويتات</button></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border);flex-wrap:wrap;gap:.5rem">' +
        '<div><div style="font-weight:700">حذف جميع الأنشطة والتصويتات</div></div>' +
        '<button class="btn btn-sm btn-danger" onclick="Activities.confirmReset()">🗑️ حذف الأنشطة</button></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;background:#fff0f0;border-radius:var(--radius-sm);border:1px solid #fca5a5;flex-wrap:wrap;gap:.5rem">' +
        '<div><div style="font-weight:700;color:var(--danger)">تصفير كامل للنظام</div></div>' +
        '<button class="btn btn-sm btn-danger" onclick="Settings.confirmFull()">💥 تصفير كامل</button></div></div></div>' +

        '<div class="card"><div class="card-title">💾 النسخ الاحتياطي</div>' +
        '<div style="display:flex;gap:.7rem;flex-wrap:wrap">' +
        '<button class="btn btn-ghost" onclick="Settings.backup()">💾 تحميل نسخة احتياطية</button>' +
        '<button class="btn btn-ghost" onclick="Settings.restore()">📂 استعادة من نسخة</button></div></div>';
    }

    UI.setContent(
      '<div style="max-width:680px">' + adminHtml +
      '<div class="card"><div class="card-title">🔑 تغيير كلمة المرور</div>' +
      '<div id="cp-alert"></div>' +
      '<div class="col-2">' +
      '<div class="form-group"><label>كلمة المرور الحالية</label><input class="form-control" type="password" id="cp-old"></div>' +
      '<div class="form-group"><label>كلمة المرور الجديدة</label><input class="form-control" type="password" id="cp-new"></div>' +
      '<div class="form-group"><label>تأكيد كلمة المرور</label><input class="form-control" type="password" id="cp-conf"></div></div>' +
      '<button class="btn btn-primary" onclick="Settings.changePass()">حفظ كلمة المرور</button></div></div>'
    );
  }

  async function saveIdentity() {
    var logoType = document.getElementById('image-sec').style.display === 'block' ? 'image' : 'emoji';
    var fontChoice = document.getElementById('st-font') ? document.getElementById('st-font').value : 'ibm';
    var googleWebhook = document.getElementById('st-google-webhook') ? document.getElementById('st-google-webhook').value.trim() : '';
    var data = {
      system_title:       (document.getElementById('st-title').value.trim()) || 'نظام إدارة الأنشطة',
      system_subtitle:    document.getElementById('st-sub').value.trim(),
      font_family:        fontChoice,
      logo_type:          logoType,
      logo_emoji:         (document.getElementById('st-emoji') ? document.getElementById('st-emoji').value.trim() : '') || '🏛️',
      logo_image:         window._logoImg || '',
      google_webhook_url: googleWebhook
    };
    var res = await api.saveSettings(data);
    if (res && res.success) {
      UI.showToast('✅ تم حفظ الإعدادات بنجاح', '#059669');
      UI.applyBranding({ system_title: data.system_title, system_subtitle: data.system_subtitle, logo_type: data.logo_type, logo_emoji: data.logo_emoji, logo_image: data.logo_image, font_family: data.font_family });
    } else UI.showToast((res && res.message) || 'خطأ', '#dc2626');
  }

  function switchLogo(type) {
    document.getElementById('emoji-sec').style.display = type === 'emoji' ? 'block' : 'none';
    document.getElementById('image-sec').style.display = type === 'image' ? 'block' : 'none';
  }

  function pickEmoji(e) {
    var el = document.getElementById('st-emoji'); if (el) el.value = e;
    previewEmoji(e);
  }

  function previewEmoji(e) {
    var p = document.getElementById('logo-preview');
    if (p) p.innerHTML = '<div style="width:60px;height:60px;background:linear-gradient(135deg,var(--primary),var(--primary-light));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:2rem">' + UI.esc(e || '🏛️') + '</div>';
  }

  function uploadLogo(input) {
    var file = input.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { UI.showToast('يرجى رفع صورة', '#dc2626'); return; }
    if (file.size > 500000) { UI.showToast('الصورة كبيرة جداً (الحد 500KB)', '#d97706'); return; }
    var r = new FileReader();
    r.onload = function(ev) {
      window._logoImg = ev.target.result;
      var p = document.getElementById('logo-preview');
      if (p) p.innerHTML = '<img src="' + ev.target.result + '" style="width:60px;height:60px;object-fit:contain;border-radius:10px">';
      UI.showToast('✅ تم رفع الشعار', '#059669');
    };
    r.readAsDataURL(file);
  }

  async function saveAdmin() {
    var name    = document.getElementById('adm-name').value.trim();
    var username= document.getElementById('adm-user').value.trim();
    var oldPass = document.getElementById('adm-old').value;
    var newPass = document.getElementById('adm-new').value;
    var confPass= document.getElementById('adm-conf').value;
    var alertEl = document.getElementById('adm-alert');
    if (!name || !username) { alertEl.innerHTML = '<div class="alert alert-danger">الاسم واسم المستخدم مطلوبان</div>'; return; }
    if (newPass) {
      if (newPass.length < 6) { alertEl.innerHTML = '<div class="alert alert-warning">كلمة المرور قصيرة جداً</div>'; return; }
      if (newPass !== confPass) { alertEl.innerHTML = '<div class="alert alert-danger">كلمتا المرور غير متطابقتتين</div>'; return; }
      var cpRes = await api.changePassword(oldPass, newPass);
      if (!cpRes || !cpRes.success) { alertEl.innerHTML = '<div class="alert alert-danger">' + ((cpRes && cpRes.message) || 'خطأ في تغيير كلمة المرور') + '</div>'; return; }
    }
    var res = await api.updateUser(App.getUser().id, { name: name, username: username });
    if (res && res.success) {
      document.getElementById('topbar-name').textContent = name;
      alertEl.innerHTML = '<div class="alert alert-success">✅ تم الحفظ بنجاح</div>';
      UI.showToast('✅ تم حفظ بيانات المدير', '#059669');
    } else alertEl.innerHTML = '<div class="alert alert-danger">' + ((res && res.message) || 'خطأ') + '</div>';
  }

  async function changePass() {
    var old  = document.getElementById('cp-old').value;
    var nw   = document.getElementById('cp-new').value;
    var conf = document.getElementById('cp-conf').value;
    var el   = document.getElementById('cp-alert');
    if (nw.length < 6) { el.innerHTML = '<div class="alert alert-warning">يجب أن تكون 6 أحرف على الأقل</div>'; return; }
    if (nw !== conf) { el.innerHTML = '<div class="alert alert-danger">كلمتا المرور غير متطابقتتين</div>'; return; }
    var res = await api.changePassword(old, nw);
    if (res && res.success) {
      el.innerHTML = '<div class="alert alert-success">✅ تم تغيير كلمة المرور</div>';
      ['cp-old','cp-new','cp-conf'].forEach(function(id){ document.getElementById(id).value = ''; });
    } else el.innerHTML = '<div class="alert alert-danger">' + ((res && res.message) || 'خطأ') + '</div>';
  }

  function confirmFull() {
    UI.openModal(
      '<div class="modal-title" style="color:var(--danger)">💥 تصفير كامل للنظام</div>' +
      '<div class="alert alert-danger">سيتم حذف <b>جميع البيانات</b>: الأنشطة، التصويتات، الأعضاء.</div>' +
      '<div class="form-group"><label>اكتب <b>تصفير كامل</b> للمتابعة</label>' +
      '<input class="form-control" id="fr-word" placeholder="تصفير كامل"></div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-outline" onclick="UI.closeModal()">إلغاء</button>' +
      '<button class="btn btn-danger" onclick="Settings.doFull()">💥 تصفير كامل</button></div>'
    );
  }

  async function doFull() {
    if (document.getElementById('fr-word').value.trim() !== 'تصفير كامل') { UI.showToast('اكتب "تصفير كامل" للمتابعة', '#dc2626'); return; }
    await api.resetAll();
    var usersRes = await api.getUsers();
    var members  = ((usersRes && usersRes.users) || []).filter(function(u){ return u.role === 'member'; });
    for (var i = 0; i < members.length; i++) await api.deleteUser(members[i].id);
    await api.saveSettings({ system_title: 'نظام إدارة الأنشطة', system_subtitle: 'وحدة التنمية المستدامة', logo_type: 'emoji', logo_emoji: '🏛️', logo_image: '' });
    UI.closeModal(); UI.showToast('تم التصفير الكامل', '#dc2626');
    App.buildSidebar(); App.navigate('dashboard');
  }

  async function backup() {
    var results = await Promise.all([api.getActivities(), api.getVotes(), api.getUsers(), api.getSettings()]);
    var data = {
      activities: (results[0] && results[0].activities) || [],
      votes:      (results[1] && results[1].votes)      || [],
      users:      ((results[2] && results[2].users) || []).filter(function(u){ return u.role === 'member'; }),
      settings:   (results[3] && results[3].settings)   || {},
      exportDate: new Date().toISOString()
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    UI.showToast('✅ تم تحميل النسخة الاحتياطية', '#059669');
  }

  function restore() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async function(e) {
      var file = e.target.files[0]; if (!file) return;
      var r = new FileReader();
      r.onload = async function(ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          if (!parsed.activities) { UI.showToast('ملف غير صالح', '#dc2626'); return; }
          if (!confirm('سيتم استبدال جميع البيانات الحالية. متأكد؟')) return;
          if (parsed.activities.length) await api.bulkImport(parsed.activities, true);
          if (parsed.settings) await api.saveSettings(parsed.settings);
          UI.showToast('✅ تم استعادة البيانات', '#059669');
          App.buildSidebar(); App.navigate('dashboard');
        } catch(ex) { UI.showToast('خطأ في قراءة الملف', '#dc2626'); }
      };
      r.readAsText(file);
    };
    input.click();
  }

  return {
    page: page, saveIdentity: saveIdentity, switchLogo: switchLogo,
    pickEmoji: pickEmoji, previewEmoji: previewEmoji, uploadLogo: uploadLogo,
    saveAdmin: saveAdmin, changePass: changePass,
    confirmFull: confirmFull, doFull: doFull, backup: backup, restore: restore
  };
})();
window.Settings = Settings;

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async function() {
  var mc  = document.getElementById('main-content');
  var btn = document.getElementById('scroll-top');
  if (mc && btn) {
    mc.addEventListener('scroll', function() {
      btn.style.display = mc.scrollTop > 300 ? 'block' : 'none';
    });
  }
  var ok = await Auth.tryAutoLogin();
  if (!ok) {
    try {
      var res = await api.getSettings();
      if (res && res.success) UI.applyBranding(res.settings);
    } catch(e) {}
  }
});
