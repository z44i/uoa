// frontend/js/activities.js
'use strict';

const Activities = (() => {
  let _state = { activities: [], votes: [], members: [], memberCount: 0, votingOpen: true };
  let _fStatus = 'all', _fMember = 'all', _fSearch = '';
  let _sortField = 'seq', _sortDir = 1;

  // ─── helpers ───
  function getVotesFor(id)   { return _state.votes.filter(v => v.activity_id === id); }
  function getUserVote(id)   { return _state.votes.find(v => v.activity_id === id && v.user_id === App.getUser().id); }

  function getStatus(act) {
    const mc = _state.memberCount;
    if (!mc) return 'pending';
    const votes = getVotesFor(act.id);
    if (votes.length < mc) return 'pending';
    const app = votes.filter(v => v.vote === 'approve').length;
    const rej = votes.filter(v => v.vote === 'reject').length;
    if (app > rej) return 'approved';
    if (rej > app) return 'rejected';
    return 'pending';
  }

  async function loadState() {
    const [actsRes, votesRes, usersRes] = await Promise.all([
      api.getActivities(),
      api.getVotes(),
      api.getUsers?.() || Promise.resolve({ users: [] })
    ]);
    _state.activities  = actsRes?.activities  || [];
    _state.votes       = votesRes?.votes       || [];
    // memberCount comes from activities endpoint
    _state.memberCount = actsRes?.memberCount  || 0;
    _state.votingOpen  = actsRes?.votingOpen !== undefined ? actsRes.votingOpen : true;
    _state.members     = (usersRes?.users || []).filter(u => u.role === 'member' && u.active);
    return _state;
  }

  // ─── Dashboard ───
  async function pageDashboard() {
    UI.loading('جاري تحميل لوحة التحكم...');
    try {
      await loadState();
    } catch { UI.errorState(); return; }

    const { activities, votes, memberCount } = _state;
    const total    = activities.length;
    const approved = activities.filter(a => getStatus(a) === 'approved').length;
    const rejected = activities.filter(a => getStatus(a) === 'rejected').length;
    const pending  = activities.filter(a => getStatus(a) === 'pending').length;
    const totalVotes = votes.length;
    const completion = total && memberCount
      ? Math.round((totalVotes / (total * memberCount)) * 100) : 0;

    const tableRows = activities.map(act => {
      const avotes = getVotesFor(act.id);
      const app = avotes.filter(v => v.vote === 'approve').length;
      const rej = avotes.filter(v => v.vote === 'reject').length;
      const status  = getStatus(act);
      const reasons = avotes.filter(v => v.vote === 'reject' && v.reason)
        .map(v => `<div class="reason-item">
          <span class="reason-who">${UI.esc(v.user_name || 'عضو')}:</span>
          <span>${UI.esc(v.reason)}</span></div>`).join('');
      return `<tr>
        <td style="font-weight:700">${act.seq}</td>
        <td style="font-weight:600;max-width:160px;cursor:pointer;color:var(--primary-light)"
          onclick="Activities.viewDetail('${act.id}')">${UI.esc(act.name)}</td>
        <td>${UI.esc(act.type || '-')}</td>
        <td>${app}✅ | ${rej}❌ <span style="color:var(--muted2);font-size:.75rem">/${memberCount}</span>
          ${UI.progressBar(app, rej, memberCount)}</td>
        <td>${avotes.length}/${memberCount}</td>
        <td>${UI.statusBadge(status)}</td>
        <td style="max-width:200px">${reasons || '<span class="text-muted">-</span>'}</td>
      </tr>`;
    }).join('');

    UI.setContent(`
      <div class="stats-grid">
        <div class="stat-card" style="--stat-color:#1d4ed8"><div class="stat-num">${total}</div><div class="stat-label">إجمالي الأنشطة</div></div>
        <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-num">${approved}</div><div class="stat-label">معتمدة</div>
          <div class="stat-sub">${total ? Math.round((approved/total)*100) : 0}% من الإجمالي</div></div>
        <div class="stat-card" style="--stat-color:var(--danger)"><div class="stat-num">${rejected}</div><div class="stat-label">غير معتمدة</div></div>
        <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-num">${pending}</div><div class="stat-label">قيد التصويت</div></div>
        <div class="stat-card" style="--stat-color:var(--info)"><div class="stat-num">${memberCount}</div><div class="stat-label">أعضاء الفريق</div></div>
        <div class="stat-card" style="--stat-color:#7c3aed"><div class="stat-num">${completion}%</div><div class="stat-label">اكتمال التصويت</div>
          <div class="stat-sub">${totalVotes} من ${total * memberCount} تصويت</div></div>
      </div>
      <div class="card">
        <div class="card-title">📊 إحصائيات التصويت التفصيلية
          <div class="card-title-actions">
            <button class="btn btn-sm btn-success" onclick="Activities.exportApproved()">📥 تصدير المعتمدة</button>
            <button class="btn btn-sm btn-info" onclick="Activities.exportAll()">📤 تصدير الكل</button>
            <button class="btn btn-sm btn-ghost" onclick="Activities.printApproved()">🖨️ طباعة</button>
          </div>
        </div>
        ${total ? `<div class="table-wrap"><table>
          <thead><tr><th>ت</th><th>اسم النشاط</th><th>النوع</th><th>التصويت</th><th>صوّت</th><th>الحالة</th><th>أسباب الرفض</th></tr></thead>
          <tbody>${tableRows}</tbody></table></div>`
        : `<div class="empty-state"><div class="empty-icon">📭</div>
            <div class="empty-title">لا توجد أنشطة بعد</div>
            <div class="empty-sub">ارفع ملف Excel من قسم رفع الأنشطة</div></div>`}
      </div>`);
  }

  // ─── Activities List ───
  async function pageActivities() {
    _fStatus = 'all'; _fMember = 'all'; _fSearch = '';
    UI.loading('جاري تحميل الأنشطة...');
    try { await loadState(); } catch { UI.errorState(); return; }
    renderActivities();
  }

  function renderActivities() {
    const { activities, votes, memberCount } = _state;
    const memberOpts = _state.members.map(m =>
      `<option value="${m.id}">${UI.esc(m.name)}</option>`).join('');

    let acts = [...activities];
    if (_fStatus !== 'all')  acts = acts.filter(a => getStatus(a) === _fStatus);
    if (_fMember !== 'all')  acts = acts.filter(a => getVotesFor(a.id).some(v => v.user_id === _fMember && v.vote === 'approve'));
    if (_fSearch) {
      const q = _fSearch.toLowerCase();
      acts = acts.filter(a =>
        (a.name || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q) ||
        (a.team_leader || '').toLowerCase().includes(q) || (a.affiliation || '').toLowerCase().includes(q) ||
        String(a.seq).includes(q));
    }

    // Sort
    acts.sort((a, b) => {
      const av = _sortField === 'seq' ? (parseInt(a.seq) || 0) : (a[_sortField] || '').toString().toLowerCase();
      const bv = _sortField === 'seq' ? (parseInt(b.seq) || 0) : (b[_sortField] || '').toString().toLowerCase();
      if (av < bv) return -_sortDir; if (av > bv) return _sortDir; return 0;
    });

    const cards = acts.map(act => {
      const avotes  = getVotesFor(act.id);
      const app = avotes.filter(v => v.vote === 'approve').length;
      const rej = avotes.filter(v => v.vote === 'reject').length;
      const status  = getStatus(act);
      const cls     = status === 'approved' ? 'act-card-approved' : status === 'rejected' ? 'act-card-rejected' : 'act-card-pending';
      const rejReasons = avotes.filter(v => v.vote === 'reject' && v.reason);
      const reasonsHtml = rejReasons.length ? `<div style="margin-top:.5rem">
        <div style="font-size:.75rem;font-weight:700;color:var(--danger);margin-bottom:.3rem">أسباب الرفض:</div>
        ${rejReasons.map(v => `<div class="reason-item">
          <span class="reason-who">👤 ${UI.esc(v.user_name || 'عضو')}:</span>
          <span>${UI.esc(v.reason)}</span></div>`).join('')}</div>` : '';
      const whoVoted = avotes.map(v =>
        `<span class="chip">${UI.esc(v.user_name || 'عضو')} ${v.vote === 'approve' ? '✅' : '❌'}</span>`).join('');
      const extra = act.extra && Object.keys(act.extra).length
        ? `<div class="act-meta-extra">${Object.entries(act.extra).map(([k,v]) =>
            `<div class="meta-row">🔹 <b>${UI.esc(k)}:</b> <span>${UI.linkify(String(v))}</span></div>`).join('')}</div>` : '';

      // Dynamic rendering of fields
      let metaContent = '';
      if (act.extra && typeof act.extra === 'object' && Object.keys(act.extra).length > 0) {
        // If activity came from dynamic form, display all questions/fields as configured!
        metaContent = Object.entries(act.extra).map(([qLabel, qVal]) => {
          if (!qVal) return '';
          return `<div class="meta-row" style="grid-column: 1 / -1">
            <b>${UI.esc(qLabel)}:</b> <span>${UI.linkify(String(qVal))}</span>
          </div>`;
        }).join('');
      } else {
        // Default standard activity fields
        metaContent = `
          <div class="meta-row">🧑‍💼 <b>صاحب النشاط:</b> <span>${UI.esc(act.team_leader || '-')}</span></div>
          <div class="meta-row">🏢 <b>الجهة / التشكيل:</b> <span>${UI.esc(act.affiliation || '-')}</span></div>
          <div class="meta-row" style="grid-column: 1 / -1">👥 <b>الأعضاء المشاركون:</b> <span>${UI.esc(act.team_members || '-')}</span></div>
          ${act.specializations ? `<div class="meta-row" style="grid-column: 1 / -1">🎓 <b>التخصصات:</b> <span>${UI.esc(act.specializations)}</span></div>` : ''}
          ${act.idea ? `<div class="meta-row" style="grid-column: 1 / -1">💡 <b>فكرة النشاط:</b> <span>${UI.esc(act.idea)}</span></div>` : ''}
          ${act.attachment ? `<div class="meta-row" style="grid-column: 1 / -1">📎 <b>المرفق:</b> <span>${UI.linkify(act.attachment)}</span></div>` : ''}
        `;
      }

      return `<div class="act-card ${cls}">
        <div class="act-header">
          <div style="display:flex;align-items:center;gap:1rem;flex:1;min-width:0">
            <div class="act-num">${act.seq}</div>
            <div style="flex:1;min-width:0">
              <div class="act-name">${UI.esc(act.name)}</div>
              <div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem;flex-wrap:wrap">
                <span class="act-type">${UI.esc(act.type || 'عام')}</span>
                ${(act.extra && act.extra['📋 مصدر الاستمارة']) ? `<span style="font-size:.78rem;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:.15rem .6rem;border-radius:6px;font-weight:600">📋 ${UI.esc(act.extra['📋 مصدر الاستمارة'])}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:.6rem;flex-shrink:0">
            ${UI.statusBadge(status)}
            <button class="btn btn-sm btn-info" onclick="Activities.viewDetail('${act.id}')">تفاصيل</button>
            <button class="btn btn-sm btn-outline" onclick="Activities.editModal('${act.id}')">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="Activities.delete('${act.id}')">حذف</button>
          </div>
        </div>
        <div class="act-meta">
          ${metaContent}
        </div>
        <div class="vote-section">
          <div class="vote-bar">
            <span class="vote-count-box approve">✅ ${app} اعتمد</span>
            <span class="vote-count-box reject">❌ ${rej} رفض</span>
            <span class="text-muted">صوّت ${avotes.length} من ${memberCount}</span>
          </div>
          ${UI.progressBar(app, rej, memberCount)}
          <div style="margin-top:.4rem">${whoVoted || '<span class="text-muted">لم يصوّت أحد بعد</span>'}</div>
          ${reasonsHtml}
        </div>
      </div>`;
    }).join('');

    UI.setContent(`
      <div class="card" style="margin-bottom:.8rem">
        <div class="card-title">📋 الأنشطة والتقييم
          <div class="card-title-actions">
            <button class="btn btn-sm ${_state.votingOpen ? 'btn-warning' : 'btn-success'}" onclick="Activities.toggleVotingSession()">
              ${_state.votingOpen ? '🔒 إيقاف ظهور الأنشطة للأعضاء' : '📢 إظهار الأنشطة وبدء تصويت الأعضاء'}
            </button>
            <button class="btn btn-sm btn-primary" onclick="Activities.addModal()">➕ إضافة نشاط</button>
            <button class="btn btn-sm btn-outline" style="color:#0284c7;border-color:#bae6fd;background:#f0f9ff" onclick="Activities.addSampleData()">🧪 إضافة بيانات تجريبية</button>
            <button class="btn btn-sm btn-success" onclick="Activities.exportApproved()">📥 تصدير المعتمدة</button>
            <button class="btn btn-sm btn-info" onclick="Activities.exportAll()">📤 تصدير الكل</button>
            <button class="btn btn-sm btn-ghost" onclick="Activities.printApproved()">🖨️ طباعة</button>
            <button class="btn btn-sm btn-warning" onclick="Activities.confirmResetVotes()">🔄 تصفير التصويت</button>
            <button class="btn btn-sm btn-danger" onclick="Activities.confirmReset()">🗑️ حذف الكل</button>
          </div>
        </div>
        <div style="background:${_state.votingOpen ? '#ecfdf5' : '#fef2f2'};border:1px solid ${_state.votingOpen ? '#a7f3d0' : '#fecaca'};color:${_state.votingOpen ? '#065f46' : '#991b1b'};padding:.7rem 1rem;border-radius:8px;font-size:.85rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
          <div>
            <b>حالة ظهور الأنشطة للمصوتين:</b> ${_state.votingOpen ? '🟢 مفعّلة وظاهرة حالياً لجميع الأعضاء للتصويت عليها' : '🔴 متوقفة ومحجوبة حالياً عن الأعضاء (يمكنك مراجعة وتعديل وسحب الأنشطة بحرية قبل إظهارها)'}
          </div>
        </div>
        <div class="filter-bar">
          <input type="text" placeholder="🔍 بحث..." value="${UI.esc(_fSearch)}"
            oninput="_fSearch=this.value;Activities.renderActivities()" style="flex:1;min-width:140px">
          <select onchange="_fStatus=this.value;Activities.renderActivities()">
            <option value="all" ${_fStatus==='all'?'selected':''}>كل الحالات</option>
            <option value="approved" ${_fStatus==='approved'?'selected':''}>✅ معتمدة</option>
            <option value="rejected" ${_fStatus==='rejected'?'selected':''}>❌ مرفوضة</option>
            <option value="pending" ${_fStatus==='pending'?'selected':''}>⏳ قيد التصويت</option>
          </select>
          <select onchange="_fMember=this.value;Activities.renderActivities()">
            <option value="all">فرز حسب عضو</option>${memberOpts}
          </select>
          <select onchange="Activities._sort(this.value)" style="min-width:130px">
            <option value="seq" ${_sortField==='seq'?'selected':''}>ترتيب: التسلسل</option>
            <option value="name" ${_sortField==='name'?'selected':''}>ترتيب: الاسم</option>
            <option value="type" ${_sortField==='type'?'selected':''}>ترتيب: النوع</option>
          </select>
        </div>
        <div class="text-muted" style="margin-bottom:.5rem">عرض ${acts.length} من ${activities.length} نشاط</div>
      </div>
      ${acts.length ? cards : `<div class="empty-state"><div class="empty-icon">🔍</div>
        <div class="empty-title">لا توجد نتائج مطابقة</div></div>`}`);
  }

  function _sort(field) {
    if (_sortField === field) _sortDir *= -1; else { _sortField = field; _sortDir = 1; }
    renderActivities();
  }

  // ─── Delete ───
  async function deleteActivity(id) {
    if (!confirm('هل تريد حذف هذا النشاط وجميع تصويتاته؟')) return;
    const res = await api.deleteActivity(id);
    if (res?.success) {
      UI.showToast('تم الحذف', '#dc2626');
      _state.activities = _state.activities.filter(a => a.id !== id);
      _state.votes      = _state.votes.filter(v => v.activity_id !== id);
      renderActivities();
      App.buildSidebar();
    } else {
      UI.showToast(res?.message || 'خطأ في الحذف', '#dc2626');
    }
  }

  // ─── Reset ───
  function confirmReset() {
    UI.openModal(`<div class="modal-title">⚠️ تصفير جدول الأنشطة والتصويت</div>
      <div class="alert alert-warning" style="line-height:1.6">
        📌 <b>اطمئن:</b> هذا الإجراء يفرّغ فقط <b>الصفحة الحالية وجدول التصويت</b> لإفساح المجال لوضع أنشطة أو استمارة جديدة.<br>
        🔒 <b>جميع الاستمارات السابقة وإجاباتها الأصلية في منشئ الاستمارات محفوظة بالكامل ولن تُمس أو تُحذف.</b>
      </div>
      <div class="form-group"><label>اكتب <b>تأكيد</b> للمتابعة وتفريغ الجدول</label>
        <input class="form-control" id="reset-word" placeholder="تأكيد"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-danger" onclick="Activities._doReset()">تفريغ جدول الأنشطة</button>
      </div>`);
  }

  async function _doReset() {
    if (document.getElementById('reset-word').value.trim() !== 'تأكيد') {
      UI.showToast('اكتب كلمة "تأكيد"', '#dc2626'); return;
    }
    const res = await api.resetAll();
    if (res?.success) {
      UI.closeModal(); UI.showToast('✅ تم تفريغ صفحة الأنشطة مع الحفاظ التام على الاستمارات الأصلية', '#059669');
      _state.activities = []; _state.votes = [];
      renderActivities(); App.buildSidebar();
    }
  }

  function confirmResetVotes() {
    UI.openModal(`<div class="modal-title">🔄 إعادة تعيين التصويتات فقط</div>
      <div class="alert alert-warning">سيتم حذف جميع التصويتات مع الإبقاء على الأنشطة.</div>
      <div class="form-group"><label>اكتب <b>تأكيد</b> للمتابعة</label>
        <input class="form-control" id="rv-word" placeholder="تأكيد"></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-warning" onclick="Activities._doResetVotes()">إعادة تعيين</button>
      </div>`);
  }

  async function _doResetVotes() {
    if (document.getElementById('rv-word').value.trim() !== 'تأكيد') {
      UI.showToast('اكتب كلمة "تأكيد"', '#dc2626'); return;
    }
    const res = await api.resetVotesOnly();
    if (res?.success) {
      UI.closeModal(); UI.showToast('تم إعادة تعيين التصويتات', '#d97706');
      _state.votes = []; renderActivities(); App.buildSidebar();
    }
  }

  // ─── Edit Modal ───
  function editModal(id) {
    const act = _state.activities.find(a => a.id === id);
    if (!act) return;
    UI.openModal(`
      <div class="modal-title">✏️ تعديل النشاط</div>
      <div class="col-2">
        <div class="form-group"><label>رقم التسلسل</label>
          <input class="form-control" id="ea-seq" value="${UI.esc(act.seq)}"></div>
        <div class="form-group"><label>اسم النشاط *</label>
          <input class="form-control" id="ea-name" value="${UI.esc(act.name)}"></div>
        <div class="form-group"><label>نوع النشاط</label>
          <input class="form-control" id="ea-type" value="${UI.esc(act.type || '')}"></div>
        <div class="form-group"><label>رئيس الفريق</label>
          <input class="form-control" id="ea-leader" value="${UI.esc(act.team_leader || '')}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>التشكيل / جهة الانتساب</label>
          <input class="form-control" id="ea-aff" value="${UI.esc(act.affiliation || '')}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>أعضاء الفريق</label>
          <textarea class="form-control" id="ea-members">${UI.esc(act.team_members || '')}</textarea></div>
        <div class="form-group" style="grid-column:1/-1"><label>📎 الملف المرفق</label>
          <input class="form-control" id="ea-attachment" value="${UI.esc(act.attachment || '')}" dir="ltr"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="Activities._saveEdit('${id}')">حفظ التعديلات</button>
      </div>`);
  }

  async function _saveEdit(id) {
    const name = document.getElementById('ea-name').value.trim();
    if (!name) { UI.showToast('اسم النشاط مطلوب', '#dc2626'); return; }
    const data = {
      seq:         document.getElementById('ea-seq').value.trim(),
      name,
      type:        document.getElementById('ea-type').value.trim(),
      teamLeader:  document.getElementById('ea-leader').value.trim(),
      affiliation: document.getElementById('ea-aff').value.trim(),
      teamMembers: document.getElementById('ea-members').value.trim(),
      attachment:  document.getElementById('ea-attachment').value.trim()
    };
    const res = await api.updateActivity(id, data);
    if (res?.success) {
      UI.closeModal(); UI.showToast('✅ تم التعديل', '#059669');
      await loadState(); renderActivities();
    } else {
      UI.showToast(res?.message || 'خطأ', '#dc2626');
    }
  }

  // ─── View Detail ───
  function viewDetail(id) {
    const act     = _state.activities.find(a => a.id === id);
    const avotes  = getVotesFor(id);
    const { memberCount, members } = _state;
    const app = avotes.filter(v => v.vote === 'approve').length;
    const rej = avotes.filter(v => v.vote === 'reject').length;

    const voteRows = members.map(m => {
      const v = avotes.find(x => x.user_id === m.id);
      return `<tr>
        <td>${UI.esc(m.name)}</td>
        <td>${v ? (v.vote === 'approve' ? '<span class="status status-approved">✅ اعتمد</span>' : '<span class="status status-rejected">❌ رفض</span>') : '<span class="status status-pending">⏳ لم يصوّت</span>'}</td>
        <td style="font-size:.8rem;color:var(--muted)">${v?.reason ? UI.esc(v.reason) : '-'}</td>
      </tr>`;
    }).join('');

    UI.openModal(`
      <div class="modal-title">📋 تفاصيل النشاط</div>
      <div style="font-size:1.1rem;font-weight:800;margin-bottom:.5rem">${UI.esc(act.name)}</div>
      <div style="margin-bottom:1rem">${UI.statusBadge(getStatus(act))}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem .8rem;margin-bottom:1rem;font-size:.85rem">
        <div><b>ت:</b> ${UI.esc(act.seq)}</div>
        <div><b>النوع:</b> ${UI.esc(act.type || '-')}</div>
        <div><b>رئيس الفريق:</b> ${UI.esc(act.team_leader || '-')}</div>
        <div><b>الجهة:</b> ${UI.esc(act.affiliation || '-')}</div>
        <div style="grid-column:1/-1"><b>الأعضاء:</b> ${UI.esc(act.team_members || '-')}</div>
        ${act.attachment ? `<div style="grid-column:1/-1"><b>📎 المرفق:</b> ${UI.linkify(act.attachment)}</div>` : ''}
      </div>
      <div style="display:flex;gap:.8rem;margin-bottom:1rem">
        <span class="vote-count-box approve">✅ ${app}</span>
        <span class="vote-count-box reject">❌ ${rej}</span>
        <span style="font-size:.8rem;color:var(--muted)">من ${memberCount} عضو</span>
      </div>
      ${members.length ? `<div class="table-wrap"><table>
        <thead><tr><th>العضو</th><th>التصويت</th><th>السبب</th></tr></thead>
        <tbody>${voteRows}</tbody></table></div>` : ''}
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
        <button class="btn btn-ghost" onclick="Activities.editModal('${id}');closeModal()">✏️ تعديل</button>
      </div>`);
  }

  // ─── Form Link Page ───
  function pageFormLink() {
    const fullUrl = window.location.origin + '/submit';
    UI.setContent(`
      <div class="card">
        <div class="card-title">📝 استمارة تقديم الأنشطة الإلكترونية</div>
        <div class="alert alert-info">
          📌 هذا هو الرابط العام للاستمارة المدمجة ضمن نطاق النظام الرسمي. يمكنك نسخ الرابط وتعميمه على كليات ومراكز جامعة الانبار لتقديم المقترحات مباشرة مع المرفقات دون الحاجة لتسجيل دخولهم للنظام.
        </div>
        <div style="background:#f8fafc;padding:1.5rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.5rem">
          <label style="font-weight:700;display:block;margin-bottom:.5rem">رابط الاستمارة المباشر:</label>
          <div style="display:flex;gap:.8rem;align-items:center;flex-wrap:wrap">
            <input class="form-control" id="pub-form-link" value="${fullUrl}" readonly style="flex:1;min-width:250px;direction:ltr;background:#fff;font-weight:600">
            <button class="btn btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('pub-form-link').value);UI.showToast('✅ تم نسخ الرابط بنجاح','#059669')">📋 نسخ الرابط</button>
            <a href="/submit" target="_blank" class="btn btn-outline">👁️ فتح ومعاينة الاستمارة</a>
          </div>
        </div>
        <div style="line-height:1.8;color:#475569;font-size:.9rem">
          <b>مميزات استمارة النظام المدمجة:</b>
          <ul style="margin-right:1.5rem;margin-top:.4rem">
            <li>تعمل بنفس امتداد ورابط النظام الرسمي لجامعة الانبار.</li>
            <li>تحتوي بدقة على الحقول المطلوبة (اسم النشاط، نوعه، فكرته، صاحبه، التشكيل، الأعضاء المشاركون، تخصصاتهم، والمرفقات).</li>
            <li>تدعم رفع المستندات والمرفقات مباشرة (PDF / صور) وتخزينها، أو وضع روابط Google Drive.</li>
            <li>تصل الأنشطة المُرسلة فورياً إلى لوحة تحكم النظام وتدخل مباشرة في جدول التصويت للأعضاء.</li>
          </ul>
        </div>
      </div>`);
  }

  // ─── Upload Page ───
  async function pageUpload() {
    UI.setContent(`
      <div class="card">
        <div class="card-title">📤 رفع ملف الأنشطة من Excel</div>
        <div class="alert alert-info">
          📌 <b>الأعمدة الأساسية:</b> ت، اسم النشاط، نوع النشاط، اسم رئيس الفريق، اسم التشكيل / جهة الانتساب، أعضاء الفريق، الملف المرفق.<br>
          ✨ أي أعمدة إضافية ستظهر تلقائياً في بطاقة النشاط.
        </div>
        <div class="upload-zone" id="upzone"
          onclick="document.getElementById('excel-inp').click()"
          ondragover="event.preventDefault();this.classList.add('drag')"
          ondragleave="this.classList.remove('drag')"
          ondrop="event.preventDefault();this.classList.remove('drag');Activities._handleFile(event.dataTransfer.files[0])">
          <div class="upload-icon">📊</div>
          <div class="upload-title">اضغط هنا أو اسحب ملف Excel</div>
          <div class="upload-sub">يدعم xlsx و xls</div>
          <input type="file" id="excel-inp" accept=".xlsx,.xls" style="display:none"
            onchange="Activities._handleFile(this.files[0])">
        </div>
        <div id="upload-preview" style="margin-top:1.5rem"></div>
      </div>`);
  }

  function _handleFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) { UI.showToast('يرجى رفع ملف Excel فقط', '#dc2626'); return; }
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
        if (!data.length) { UI.showToast('الملف فارغ', '#dc2626'); return; }
        window._xlData = data;
        _showPreview(data);
      } catch { UI.showToast('خطأ في قراءة الملف', '#dc2626'); }
    };
    r.readAsBinaryString(file);
  }

  const STD_COLS = ['ت','اسم النشاط','نوع النشاط','اسم رئيس الفريق','رئيس الفريق','رئيس',
    'اسم التشكيل','جهة الانتساب','التشكيل','الانتساب','جهة','أعضاء الفريق','الأعضاء',
    'الملف المرفق','مرفق','ملف','رابط'];

  function isStdCol(k) { return STD_COLS.some(s => k.trim().includes(s) || s.includes(k.trim())); }

  function mapRow(row, idx) {
    const keys = Object.keys(row);
    const get = (...aa) => { for (const a of aa) { const k = keys.find(k => k.trim().includes(a.trim())); if (k !== undefined && String(row[k]).trim() !== '') return String(row[k]); } return ''; };
    const extra = {};
    keys.forEach(k => { if (!isStdCol(k) && String(row[k]).trim() !== '') extra[k] = String(row[k]); });
    return {
      seq: get('ت') || String(idx + 1), name: get('اسم النشاط', 'النشاط'),
      type: get('نوع النشاط', 'النوع'), teamLeader: get('اسم رئيس الفريق', 'رئيس الفريق', 'رئيس'),
      affiliation: get('اسم التشكيل', 'جهة الانتساب', 'التشكيل', 'الانتساب', 'جهة'),
      teamMembers: get('أعضاء الفريق', 'الأعضاء'), attachment: get('الملف المرفق', 'مرفق', 'ملف', 'رابط'),
      extra: Object.keys(extra).length ? extra : null
    };
  }

  function _showPreview(data) {
    const keys = Object.keys(data[0] || {});
    window._xlKeys = keys;
    
    // Auto-detect best column matches
    const findMatch = (terms) => {
      return keys.find(k => terms.some(t => k.toLowerCase().includes(t.toLowerCase()))) || '';
    };

    const detected = {
      name: findMatch(['اسم النشاط', 'عنوان النشاط', 'النشاط', 'البحث', 'المبادرة', 'الدورة', 'الفعالية', 'الاسم', 'العنوان']),
      seq: findMatch(['ت', 'تسلسل', 'الرقم', 'م', 'seq', 'id']),
      type: findMatch(['نوع النشاط', 'نوع الفعالية', 'النوع', 'المحور', 'التصنيف']),
      leader: findMatch(['رئيس الفريق', 'صاحب النشاط', 'المسؤول', 'مقدم الطلب', 'المحاضر', 'الباحث']),
      affiliation: findMatch(['الجهة', 'التشكيل', 'الكلية', 'القسم', 'جهة الانتساب', 'المركز']),
      members: findMatch(['أعضاء الفريق', 'المشاركون', 'الأعضاء', 'فريق العمل']),
      attachment: findMatch(['الملف المرفق', 'المرفق', 'الملف', 'رابط', 'drive', 'pdf', 'الأوليات'])
    };

    const makeSelect = (id, label, matchedKey, isRequired = false) => {
      const opts = keys.map(k => `<option value="${UI.esc(k)}" ${k === matchedKey ? 'selected' : ''}>${UI.esc(k)}</option>`).join('');
      return `
        <div style="background:#fff;padding:.8rem;border-radius:10px;border:1px solid #e2e8f0">
          <label style="display:block;font-size:.84rem;font-weight:700;color:#0f172a;margin-bottom:.3rem">
            ${label} ${isRequired ? '<span style="color:#ef4444">*</span>' : '<span style="color:#94a3b8;font-size:.75rem">(اختياري)</span>'}
          </label>
          <select class="form-control" id="${id}" style="font-size:.85rem;padding:.4rem .6rem">
            ${isRequired ? '<option value="">-- اختر العمود المقابل --</option>' : '<option value="">-- تجاهل هذا الحقل --</option>'}
            ${opts}
          </select>
        </div>
      `;
    };

    const headers = keys.map(k => `<th style="white-space:nowrap">${UI.esc(k)}</th>`).join('');
    const rows = data.slice(0, 4).map(r => `<tr>${keys.map(k =>
      `<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(String(r[k] !== undefined ? r[k] : ''))}</td>`).join('')}</tr>`).join('');

    document.getElementById('upload-preview').innerHTML = `
      <div class="alert alert-success" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.2rem">
        <div>✅ تم فحص الملف وقراءة <b>${data.length}</b> نشاط و <b>${keys.length}</b> أعمدة بنجاح</div>
        <span style="font-size:.82rem;background:#dcfce7;color:#166534;padding:.2rem .6rem;border-radius:6px;font-weight:600">مولّد الخانات الذكي</span>
      </div>

      <!-- Smart Column Mapping Section -->
      <div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:14px;padding:1.4rem;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:.6rem;font-weight:700;color:#0f172a;margin-bottom:.4rem;font-size:1.05rem">
          <span>🎯 مطابقة وتحديد أعمدة الإكسل (Column Mapping):</span>
        </div>
        <p style="color:#64748b;font-size:.85rem;margin-bottom:1.2rem;line-height:1.5">
          قام النظام بالتعرف التلقائي على الأعمدة، ويمكنك تعديلها وتحديد ما تريد سحبه من الملف، وبقية الأعمدة سيتم توليدها وعرضها تلقائياً كخانات إضافية:
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(230px, 1fr));gap:.8rem;margin-bottom:1rem">
          ${makeSelect('map-name', 'اسم النشاط / البحث', detected.name, true)}
          ${makeSelect('map-type', 'نوع النشاط / التصنيف', detected.type)}
          ${makeSelect('map-seq', 'رقم التسلسل (ت)', detected.seq)}
          ${makeSelect('map-leader', 'رئيس الفريق / صاحب النشاط', detected.leader)}
          ${makeSelect('map-affiliation', 'الجهة / الكلية / التشكيل', detected.affiliation)}
          ${makeSelect('map-members', 'الأعضاء المشاركون', detected.members)}
          ${makeSelect('map-attachment', 'الملف المرفق / رابط Drive', detected.attachment)}
        </div>

        <div style="display:flex;align-items:center;gap:.6rem;background:#fff;padding:.7rem 1rem;border-radius:8px;border:1px dashed #94a3b8;font-size:.84rem;color:#475569">
          <input type="checkbox" id="map-include-all-extra" checked style="width:16px;height:16px;cursor:pointer">
          <label for="map-include-all-extra" style="cursor:pointer;font-weight:600">
            توليد جميع الأعمدة الأخرى المتبقية في ملف Excel كخانات تفصيلية تلقائياً دون إهمال أي معلومة
          </label>
        </div>
      </div>

      <div style="font-weight:700;font-size:.88rem;margin-bottom:.5rem;color:#334155">معاينة أولية لبيانات الملف:</div>
      <div class="table-wrap" style="margin-bottom:1.5rem;max-height:220px;overflow:auto">
        <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      </div>

      <div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary" style="padding:.7rem 1.8rem" onclick="Activities._importMappedXl(false)">
          ➕ اعتماد وسحب كأنشطة جديدة
        </button>
        <button class="btn btn-warning" style="padding:.7rem 1.8rem" onclick="if(confirm('⚠️ سيتم مسح جدول الأنشطة الحالي واستبداله ببيانات هذا الملف. هل أنت متأكد؟'))Activities._importMappedXl(true)">
          🔄 استبدال جدول الأنشطة بالكامل
        </button>
      </div>
    `;
  }

  async function _importMappedXl(replace) {
    const data = window._xlData;
    if (!data || !data.length) return;

    const nameCol = document.getElementById('map-name')?.value;
    const typeCol = document.getElementById('map-type')?.value;
    const seqCol = document.getElementById('map-seq')?.value;
    const leaderCol = document.getElementById('map-leader')?.value;
    const affCol = document.getElementById('map-affiliation')?.value;
    const membersCol = document.getElementById('map-members')?.value;
    const attachCol = document.getElementById('map-attachment')?.value;
    const includeExtra = document.getElementById('map-include-all-extra')?.checked;

    if (!nameCol) {
      UI.showToast('يرجى تحديد العمود الخاص باسم النشاط على الأقل', '#dc2626');
      return;
    }

    const mappedCols = [nameCol, typeCol, seqCol, leaderCol, affCol, membersCol, attachCol].filter(Boolean);

    const activities = data.map((row, idx) => {
      const actName = String(row[nameCol] || '').trim();
      if (!actName) return null;

      const actSeq = seqCol && row[seqCol] ? String(row[seqCol]).trim() : String(idx + 1);
      const actType = typeCol && row[typeCol] ? String(row[typeCol]).trim() : 'ملف Excel';
      const actLeader = leaderCol && row[leaderCol] ? String(row[leaderCol]).trim() : '';
      const actAff = affCol && row[affCol] ? String(row[affCol]).trim() : '';
      const actMembers = membersCol && row[membersCol] ? String(row[membersCol]).trim() : '';
      const actAttach = attachCol && row[attachCol] ? String(row[attachCol]).trim() : '';

      // Collect any other remaining columns as extra fields dynamically
      const extra = {};
      extra['📋 مصدر الاستيراد'] = 'ملف Excel مخصص';
      if (includeExtra) {
        Object.keys(row).forEach(k => {
          if (!mappedCols.includes(k) && row[k] !== undefined && String(row[k]).trim() !== '') {
            extra[k] = String(row[k]);
          }
        });
      }

      return {
        seq: actSeq,
        name: actName,
        type: actType,
        teamLeader: actLeader,
        affiliation: actAff,
        teamMembers: actMembers,
        attachment: actAttach,
        extra: Object.keys(extra).length ? extra : null
      };
    }).filter(Boolean);

    if (!activities.length) {
      UI.showToast('لم يتم العثور على أنشطة صالحة في العمود المحدد', '#dc2626');
      return;
    }

    UI.loading('جاري سحب وتوليد الخانات في جدول الأنشطة...');
    const res = await api.bulkImport(activities, replace);
    if (res?.success) {
      UI.showToast(`✅ تم استيراد وتوليد ${res.count || activities.length} نشاط بنجاح`, '#059669');
      App.buildSidebar();
      setTimeout(() => App.navigate('activities'), 500);
    } else {
      UI.showToast(res?.message || 'خطأ في الاستيراد', '#dc2626');
    }
  }

  async function _addManual() {
    const name = document.getElementById('mn-name').value.trim();
    if (!name) { UI.showToast('اسم النشاط مطلوب', '#dc2626'); return; }
    const data = {
      seq: document.getElementById('mn-seq').value.trim(), name,
      type: document.getElementById('mn-type').value.trim(),
      teamLeader: document.getElementById('mn-leader').value.trim(),
      affiliation: document.getElementById('mn-aff').value.trim(),
      teamMembers: document.getElementById('mn-members').value.trim(),
      attachment: document.getElementById('mn-attachment').value.trim()
    };
    const res = await api.createActivity(data);
    if (res?.success) {
      UI.showToast('✅ تمت الإضافة', '#059669');
      ['mn-seq','mn-name','mn-type','mn-leader','mn-aff','mn-members','mn-attachment']
        .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      App.buildSidebar();
    } else {
      UI.showToast(res?.message || 'خطأ', '#dc2626');
    }
  }

  // ─── Export / Print ───
  function exportApproved() {
    const approved = _state.activities.filter(a => getStatus(a) === 'approved');
    if (!approved.length) { UI.showToast('لا توجد أنشطة معتمدة', '#d97706'); return; }
    _writeExcel(_buildRows(approved), 'الأنشطة المعتمدة', `approved_${_today()}.xlsx`);
    UI.showToast(`✅ تم تصدير ${approved.length} نشاط`, '#059669');
  }

  function exportAll() {
    if (!_state.activities.length) { UI.showToast('لا توجد أنشطة', '#d97706'); return; }
    _writeExcel(_buildRows(_state.activities), 'جميع الأنشطة', `all_${_today()}.xlsx`);
    UI.showToast(`📤 تم تصدير ${_state.activities.length} نشاط`, '#0891b2');
  }

  function _buildRows(acts) {
    return acts.map(a => {
      const avotes = getVotesFor(a.id);
      const app = avotes.filter(v => v.vote === 'approve').length;
      const rej = avotes.filter(v => v.vote === 'reject').length;
      const reasons = avotes.filter(v => v.vote === 'reject' && v.reason)
        .map(v => `${v.user_name || 'عضو'}: ${v.reason}`).join(' | ');
      const row = { 'ت': a.seq, 'اسم النشاط': a.name, 'نوع النشاط': a.type || '',
        'رئيس الفريق': a.team_leader || '', 'التشكيل/جهة الانتساب': a.affiliation || '',
        'أعضاء الفريق': a.team_members || '', 'عدد المعتمدين': app, 'عدد الرافضين': rej,
        'إجمالي المصوّتين': avotes.length, 'إجمالي الأعضاء': _state.memberCount,
        'الحالة': getStatus(a) === 'approved' ? 'معتمد' : getStatus(a) === 'rejected' ? 'غير معتمد' : 'قيد التصويت',
        'الملف المرفق': a.attachment || '', 'أسباب الرفض': reasons };
      if (a.extra) Object.assign(row, a.extra);
      return row;
    });
  }

  function _writeExcel(rows, sheetName, filename) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 16;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
        if (cell && cell.v) {
          const str = String(cell.v);
          if (str.length > maxLen) maxLen = Math.min(str.length + 3, 50);
        }
      }
      colWidths.push({ wch: maxLen });
    }
    ws['!cols'] = colWidths;

    // Set Right-to-Left orientation for Arabic sheets
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    const wb = XLSX.utils.book_new();
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Views) wb.Workbook.Views = [];
    wb.Workbook.Views[0] = { RTL: true };

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  }

  function _today() { return new Date().toISOString().slice(0, 10); }

  function printApproved() {
    const approved = _state.activities.filter(a => getStatus(a) === 'approved');
    if (!approved.length) { UI.showToast('لا توجد أنشطة معتمدة', '#d97706'); return; }
    const rows = approved.map(a => `<tr>
      <td>${UI.esc(a.seq)}</td><td>${UI.esc(a.name)}</td><td>${UI.esc(a.type||'-')}</td>
      <td>${UI.esc(a.team_leader||'-')}</td><td>${UI.esc(a.affiliation||'-')}</td><td>${UI.esc(a.team_members||'-')}</td>
    </tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
      <title>الأنشطة المعتمدة</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
      table{width:100%;border-collapse:collapse}th{background:#0f2744;color:#fff;padding:8px;text-align:right}
      td{padding:7px 8px;border:1px solid #ddd}tr:nth-child(even)td{background:#f8fafc}</style></head><body>
      <h2>🏛️ الأنشطة المعتمدة</h2>
      <table><thead><tr><th>ت</th><th>اسم النشاط</th><th>النوع</th><th>رئيس الفريق</th><th>الجهة</th><th>الأعضاء</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print()}<\/script></body></html>`);
    w.document.close();
  }

  // ─── Stats Page ───
  async function pageStats() {
    UI.loading('جاري تحميل الإحصائيات...');
    try { await loadState(); } catch { UI.errorState(); return; }
    const { activities, votes, memberCount, members } = _state;
    const total = activities.length;

    const rows = members.map(m => {
      const mv  = votes.filter(v => v.user_id === m.id);
      const app = mv.filter(v => v.vote === 'approve').length;
      const rej = mv.filter(v => v.vote === 'reject').length;
      const done = mv.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      return `<tr>
        <td style="font-weight:700">${UI.esc(m.name)}</td>
        <td><div style="display:flex;align-items:center;gap:.5rem">
          <div class="progress-wrap" style="width:90px;height:7px">
            <div class="progress-fill-approve" style="width:${pct}%"></div>
          </div><span style="font-size:.8rem">${done}/${total}</span></div></td>
        <td style="color:var(--success);font-weight:700">${app}</td>
        <td style="color:var(--danger);font-weight:700">${rej}</td>
        <td style="color:var(--warning)">${total - done}</td>
        <td><b>${pct}%</b></td>
        <td><div style="display:flex;gap:.3rem;flex-wrap:wrap">
          <button class="btn btn-xs btn-success" onclick="Activities._exportMember('${m.id}','all')">📥 الكل</button>
          <button class="btn btn-xs btn-info" onclick="Activities._exportMember('${m.id}','approve')">✅</button>
          <button class="btn btn-xs btn-danger" onclick="Activities._exportMember('${m.id}','reject')">❌</button>
        </div></td>
      </tr>`;
    }).join('');

    UI.setContent(`<div class="card">
      <div class="card-title">📈 إحصائيات التصويت لكل عضو</div>
      ${members.length ? `<div class="table-wrap"><table>
        <thead><tr><th>العضو</th><th>التقدم</th><th>اعتمد</th><th>رفض</th><th>لم يصوّت</th><th>النسبة</th><th>تصدير</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
      : `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">لا يوجد أعضاء</div></div>`}
    </div>`);
  }

  function _exportMember(memberId, filter) {
    const m = _state.members.find(x => x.id === memberId); if (!m) return;
    let mv = _state.votes.filter(v => v.user_id === memberId);
    if (filter !== 'all') mv = mv.filter(v => v.vote === filter);
    if (!mv.length) { UI.showToast('لا توجد تصويتات', '#d97706'); return; }
    const rows = mv.map(v => {
      const a = _state.activities.find(x => x.id === v.activity_id); if (!a) return null;
      const row = { 'ت': a.seq, 'اسم النشاط': a.name, 'نوع النشاط': a.type || '',
        'رئيس الفريق': a.team_leader || '', 'التشكيل': a.affiliation || '',
        'تصويت العضو': v.vote === 'approve' ? 'معتمد' : 'غير معتمد', 'السبب': v.reason || '' };
      if (a.extra) Object.assign(row, a.extra); return row;
    }).filter(Boolean);
    const label = filter === 'approve' ? 'معتمدة' : filter === 'reject' ? 'مرفوضة' : 'الكل';
    _writeExcel(rows, `${label} - ${m.name}`, `votes_${m.name}_${_today()}.xlsx`);
    UI.showToast(`✅ تم التصدير`, '#059669');
  }

  // ─── My Votes ───
  async function pageMyVotes() {
    UI.loading('جاري تحميل الأنشطة...');
    try {
      const [actsRes, votesRes] = await Promise.all([api.getActivities(), api.getVotes()]);
      _state.activities  = actsRes?.activities  || [];
      _state.votes       = votesRes?.votes       || [];
      _state.memberCount = actsRes?.memberCount  || 0;
      _state.votingOpen  = actsRes?.votingOpen !== undefined ? actsRes.votingOpen : true;
    } catch { UI.errorState(); return; }

    if (!_state.votingOpen) {
      UI.setContent(`
        <div class="card" style="text-align:center;padding:3rem 1.5rem">
          <div style="font-size:3.5rem;margin-bottom:1rem">⏳</div>
          <div style="font-size:1.4rem;font-weight:800;color:#0f172a;margin-bottom:.8rem">جلسة التصويت غير متاحة حالياً</div>
          <div style="max-width:550px;margin:0 auto;line-height:1.7;color:#64748b;font-size:.95rem">
            بانتظار إيعاز مدير النظام لفتح جلسة التصويت وإظهار الأنشطة المقترحة.<br>
            سيتم إشعاركم أو فتح القائمة فور انتهاء مرحلة استلام وتدقيق الاستمارات من قِبل الإدارة.
          </div>
          <div style="margin-top:2rem">
            <button class="btn btn-outline" onclick="Activities.pageMyVotes()">🔄 تحديث الصفحة</button>
          </div>
        </div>
      `);
      return;
    }

    const pending = _state.activities.filter(a => !getUserVote(a.id));
    const voted   = _state.activities.length - pending.length;
    const total   = _state.activities.length;
    const pct     = total ? Math.round((voted / total) * 100) : 0;

    const cards = pending.map(act => {
      let metaContent = '';
      if (act.extra && typeof act.extra === 'object' && Object.keys(act.extra).length > 0) {
        metaContent = Object.entries(act.extra).map(([qLabel, qVal]) => {
          if (!qVal) return '';
          return `<div class="meta-row" style="grid-column: 1 / -1">
            <b>${UI.esc(qLabel)}:</b> <span>${UI.linkify(String(qVal))}</span>
          </div>`;
        }).join('');
      } else {
        metaContent = `
          <div class="meta-row">🧑‍💼 <b>رئيس الفريق:</b> <span>${UI.esc(act.team_leader||'-')}</span></div>
          <div class="meta-row">🏢 <b>التشكيل/الجهة:</b> <span>${UI.esc(act.affiliation||'-')}</span></div>
          <div class="meta-row">👥 <b>أعضاء الفريق:</b> <span>${UI.esc(act.team_members||'-')}</span></div>
          ${act.attachment ? `<div class="meta-row">📎 <b>الملف المرفق:</b> <span>${UI.linkify(act.attachment)}</span></div>` : ''}
        `;
      }

      return `
      <div class="act-card act-card-pending">
        <div class="act-header">
          <div style="display:flex;align-items:flex-start;gap:.8rem;flex:1;min-width:0">
            <div class="act-num">${act.seq}</div>
            <div><div class="act-name">${UI.esc(act.name)}</div><div class="act-type">${UI.esc(act.type||'')}</div></div>
          </div>
          <span class="status status-pending">⏳ لم تصوّت</span>
        </div>
        <div class="act-meta">
          ${metaContent}
        </div>
        <div class="vote-section">
          <div class="row-flex">
            <button class="btn btn-success" onclick="Activities._castVote('${act.id}','approve')">✅ اعتماد النشاط</button>
            <button class="btn btn-danger" onclick="Activities._openRejectModal('${act.id}')">❌ عدم الاعتماد مع السبب</button>
          </div>
        </div>
      </div>`;
    }).join('');

    UI.setContent(`
      <div class="card" style="margin-bottom:.8rem">
        <div class="card-title">🗳️ التصويت على الأنشطة</div>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div><div style="font-size:.85rem;color:var(--muted)">تقدمك في التصويت</div>
            <div style="font-weight:700;font-size:1.1rem">${voted} من ${total} نشاط</div></div>
          <div class="progress-wrap" style="flex:1;min-width:100px;height:8px">
            <div class="progress-fill-approve" style="width:${pct}%"></div>
          </div>
          <div style="font-weight:700;color:var(--primary-light)">${pct}%</div>
        </div>
      </div>
      ${pending.length ? cards : `<div class="empty-state"><div class="empty-icon">🎉</div>
        <div class="empty-title">أحسنت! صوّتت على جميع الأنشطة</div>
        <button class="btn btn-outline" style="margin-top:1rem" onclick="App.navigate('my-history')">📜 عرض السجل</button>
      </div>`}`);
  }

  function _openRejectModal(actId) {
    const act = _state.activities.find(a => a.id === actId);
    UI.openModal(`<div class="modal-title">❌ عدم اعتماد النشاط</div>
      <div style="font-weight:700;margin-bottom:.3rem">${UI.esc(act.name)}</div>
      <div class="form-group"><label>السبب *</label>
        <textarea class="form-control" id="rej-reason" style="min-height:110px" placeholder="اذكر السبب..."></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-danger" onclick="Activities._submitReject('${actId}')">تأكيد عدم الاعتماد</button>
      </div>`);
  }

  async function _submitReject(actId) {
    const reason = document.getElementById('rej-reason').value.trim();
    if (!reason) { UI.showToast('السبب مطلوب', '#dc2626'); return; }
    await _castVote(actId, 'reject', reason);
    UI.closeModal();
  }

  async function _castVote(actId, type, reason = '') {
    const res = await api.castVote({ activityId: actId, vote: type, reason });
    if (res?.success) {
      UI.showToast(type === 'approve' ? '✅ تم تسجيل اعتمادك' : '❌ تم تسجيل رفضك',
        type === 'approve' ? '#059669' : '#dc2626');
      App.buildSidebar();
      pageMyVotes();
    } else {
      UI.showToast(res?.message || 'خطأ', '#dc2626');
    }
  }

  // ─── My History ───
  async function pageMyHistory() {
    UI.loading('جاري تحميل سجل تصويتاتك...');
    try {
      const [actsRes, votesRes] = await Promise.all([api.getActivities(), api.getVotes()]);
      _state.activities  = actsRes?.activities || [];
      _state.votes       = votesRes?.votes || [];
      _state.memberCount = actsRes?.memberCount || 0;
    } catch { UI.errorState(); return; }

    const myVotes = _state.votes.filter(v => v.user_id === App.getUser().id);
    const app = myVotes.filter(v => v.vote === 'approve').length;
    const rej = myVotes.filter(v => v.vote === 'reject').length;

    const cards = myVotes.map(v => {
      const act = _state.activities.find(a => a.id === v.activity_id); if (!act) return '';
      const isApp = v.vote === 'approve';
      return `<div class="act-card ${isApp ? 'act-card-approved' : 'act-card-rejected'}">
        <div class="act-header">
          <div style="display:flex;align-items:center;gap:.8rem;flex:1;min-width:0">
            <div class="act-num">${act.seq}</div>
            <div><div class="act-name">${UI.esc(act.name)}</div><div class="act-type">${UI.esc(act.type||'')}</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
            ${isApp ? '<span class="status status-approved">✅ اعتمدت</span>' : '<span class="status status-rejected">❌ رفضت</span>'}
            <button class="btn btn-xs btn-outline" onclick="Activities._editVoteModal('${v.id}')">✏️ تعديل</button>
          </div>
        </div>
        <div class="act-meta">
          <div class="meta-row">🧑‍💼 <b>رئيس الفريق:</b> <span>${UI.esc(act.team_leader||'-')}</span></div>
          <div class="meta-row">🏢 <b>التشكيل/الجهة:</b> <span>${UI.esc(act.affiliation||'-')}</span></div>
        </div>
        ${v.reason ? `<div style="font-size:.82rem;background:#fff1f2;border-right:3px solid var(--danger);
          padding:.5rem .8rem;border-radius:0 6px 6px 0;margin-top:.4rem">
          <b style="color:var(--danger)">سبب عدم الاعتماد:</b> ${UI.esc(v.reason)}</div>` : ''}
        <div style="font-size:.72rem;color:var(--muted2);margin-top:.5rem">
          🕐 ${new Date(v.updated_at || v.created_at).toLocaleString('ar-SA')}
        </div>
      </div>`;
    }).join('');

    UI.setContent(`
      <div class="stats-grid" style="margin-bottom:1rem">
        <div class="stat-card" style="--stat-color:var(--primary-light)"><div class="stat-num">${myVotes.length}</div><div class="stat-label">إجمالي تصويتاتي</div></div>
        <div class="stat-card" style="--stat-color:var(--success)"><div class="stat-num">${app}</div><div class="stat-label">اعتمدت</div></div>
        <div class="stat-card" style="--stat-color:var(--danger)"><div class="stat-num">${rej}</div><div class="stat-label">رفضت</div></div>
        <div class="stat-card" style="--stat-color:var(--warning)"><div class="stat-num">${_state.activities.length - myVotes.length}</div><div class="stat-label">لم أصوّت بعد</div></div>
      </div>
      <div class="card" style="margin-bottom:.8rem">
        <div class="card-title">📜 سجل تصويتاتي</div>
      </div>
      ${myVotes.length ? cards : `<div class="empty-state"><div class="empty-icon">📋</div>
        <div class="empty-title">لم تصوّت على أي نشاط بعد</div>
        <button class="btn btn-primary" style="margin-top:1rem" onclick="App.navigate('my-votes')">🗳️ ابدأ التصويت</button>
      </div>`}`);
  }

  function _editVoteModal(voteId) {
    const v = _state.votes.find(x => x.id === voteId); if (!v) return;
    const act = _state.activities.find(a => a.id === v.activity_id); if (!act) return;
    UI.openModal(`
      <div class="modal-title">✏️ تعديل التصويت</div>
      <div style="font-weight:700;margin-bottom:.2rem">${UI.esc(act.name)}</div>
      <div style="display:flex;gap:.7rem;margin-bottom:1rem">
        <button id="ev-btn-approve" class="btn ${v.vote==='approve'?'btn-success':'btn-ghost'}" style="flex:1"
          onclick="Activities._selectVote('approve')">✅ اعتماد</button>
        <button id="ev-btn-reject" class="btn ${v.vote==='reject'?'btn-danger':'btn-ghost'}" style="flex:1"
          onclick="Activities._selectVote('reject')">❌ عدم اعتماد</button>
      </div>
      <div id="ev-reason-wrap" style="display:${v.vote==='reject'?'block':'none'}">
        <div class="form-group"><label>سبب عدم الاعتماد *</label>
          <textarea class="form-control" id="ev-reason" style="min-height:100px">${UI.esc(v.reason||'')}</textarea></div>
      </div>
      <input type="hidden" id="ev-vote-id" value="${voteId}">
      <input type="hidden" id="ev-selected" value="${v.vote}">
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="Activities._saveVoteEdit()">💾 حفظ</button>
      </div>`);
  }

  function _selectVote(type) {
    document.getElementById('ev-selected').value = type;
    document.getElementById('ev-btn-approve').className = `btn flex:1 ${type==='approve'?'btn-success':'btn-ghost'}`;
    document.getElementById('ev-btn-reject').className  = `btn flex:1 ${type==='reject'?'btn-danger':'btn-ghost'}`;
    document.getElementById('ev-reason-wrap').style.display = type === 'reject' ? 'block' : 'none';
  }

  async function _saveVoteEdit() {
    const voteId = document.getElementById('ev-vote-id').value;
    const type   = document.getElementById('ev-selected').value;
    const reason = document.getElementById('ev-reason')?.value?.trim() || '';
    if (type === 'reject' && !reason) { UI.showToast('يرجى ذكر سبب عدم الاعتماد', '#dc2626'); return; }
    const res = await api.updateVote(voteId, { vote: type, reason });
    if (res?.success) {
      UI.closeModal();
      UI.showToast(type === 'approve' ? '✅ تم التعديل إلى اعتماد' : '❌ تم التعديل إلى رفض',
        type === 'approve' ? '#059669' : '#dc2626');
      pageMyHistory();
    } else {
      UI.showToast(res?.message || 'خطأ', '#dc2626');
    }
  }

  function addModal() {
    UI.openModal(`
      <div class="modal-title">➕ إضافة نشاط جديد</div>
      <div class="col-2">
        <div class="form-group" style="grid-column:1/-1"><label>اسم النشاط *</label>
          <input class="form-control" id="mn-name" placeholder="اسم النشاط الكامل"></div>
        <div class="form-group"><label>رقم التسلسل (ت)</label>
          <input class="form-control" id="mn-seq" placeholder="يُحسب تلقائياً"></div>
        <div class="form-group"><label>نوع النشاط</label>
          <input class="form-control" id="mn-type" placeholder="تدريبي / ترفيهي / ..."></div>
        <div class="form-group"><label>رئيس الفريق / صاحب النشاط</label>
          <input class="form-control" id="mn-leader" placeholder="الاسم الكامل"></div>
        <div class="form-group"><label>التشكيل / جهة الانتساب</label>
          <input class="form-control" id="mn-aff" placeholder="اسم الجهة"></div>
        <div class="form-group" style="grid-column:1/-1"><label>أعضاء الفريق</label>
          <textarea class="form-control" id="mn-members" placeholder="أسماء الأعضاء..."></textarea></div>
        <div class="form-group" style="grid-column:1/-1"><label>📎 الملف المرفق (رابط)</label>
          <input class="form-control" id="mn-attachment" placeholder="رابط الملف" dir="ltr"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="Activities._saveModalManual()">حفظ النشاط</button>
      </div>`);
  }

  async function _saveModalManual() {
    const name = document.getElementById('mn-name').value.trim();
    if (!name) { UI.showToast('اسم النشاط مطلوب', '#dc2626'); return; }
    const data = {
      seq: document.getElementById('mn-seq').value.trim(), name,
      type: document.getElementById('mn-type').value.trim(),
      teamLeader: document.getElementById('mn-leader').value.trim(),
      affiliation: document.getElementById('mn-aff').value.trim(),
      teamMembers: document.getElementById('mn-members').value.trim(),
      attachment: document.getElementById('mn-attachment').value.trim()
    };
    const res = await api.createActivity(data);
    if (res?.success) {
      UI.closeModal();
      UI.showToast('✅ تمت إضافة النشاط بنجاح', '#059669');
      await loadState();
      renderActivities();
      App.buildSidebar();
    } else {
      UI.showToast(res?.message || 'خطأ', '#dc2626');
    }
  }

  async function addSampleData() {
    const samples = [
      {
        seq: '1',
        name: 'مبادرة زراعة 1000 شجرة في حرم الجامعة',
        type: 'مبادرة بيئية',
        teamLeader: 'أ.د. حسام عبد اللطيف',
        affiliation: 'كلية الزراعة - جامعة الانبار',
        teamMembers: 'م.م. سارة كمال، رائد محمود، عمر شاكر',
        attachment: 'https://uoanbar.edu.iq/initiatives/green-campus.pdf'
      },
      {
        seq: '2',
        name: 'ورشة عمل حول ترشيد الطاقة والمباني الخضراء',
        type: 'ورشة عمل',
        teamLeader: 'د. مصطفى خالد الفهداوي',
        affiliation: 'كلية الهندسة - جامعة الانبار',
        teamMembers: 'م. هند علي، علي يوسف، نور الدين',
        attachment: 'https://uoanbar.edu.iq/workshops/green-energy.pdf'
      },
      {
        seq: '3',
        name: 'معرض الابتكارات الطلابية للحلول المستدامة',
        type: 'معرض علمي',
        teamLeader: 'أ.م.د. إيناس طارق',
        affiliation: 'كلية العلوم - قسم البيئة',
        teamMembers: 'أحمد فؤاد، ياسمين جاسم، كرار سعد',
        attachment: 'https://uoanbar.edu.iq/exhibitions/eco-innovations'
      },
      {
        seq: '4',
        name: 'ندوة التغير المناخي وإدارة الموارد المائية في محافظة الانبار',
        type: 'ندوة تخصصية',
        teamLeader: 'د. زياد حامد الدليمي',
        affiliation: 'مركز دراسات الصحراء',
        teamMembers: 'د. مروان فرحان، نادية كريم',
        attachment: 'https://uoanbar.edu.iq/seminars/water-climate-2026'
      }
    ];

    UI.showToast('⏳ جاري إضافة الأنشطة التجريبية...', '#0284c7');
    try {
      const res = await api.bulkImport(samples, false);
      if (res?.success) {
        UI.showToast(`✅ تم إضافة ${res.added || samples.length} أنشطة تجريبية بنجاح`, '#059669');
        await loadState();
        renderActivities();
        App.buildSidebar();
      } else {
        UI.showToast(res?.message || 'خطأ في إضافة البيانات', '#dc2626');
      }
    } catch (e) {
      UI.showToast('تعذر الاتصال بالسيرفر', '#dc2626');
    }
  }

  async function toggleVotingSession() {
    UI.showToast('⏳ جاري تحديث حالة جلسة التصويت...', '#0284c7');
    const res = await api.toggleVoting();
    if (res?.success) {
      UI.showToast(`✅ ${res.message}`, res.voting_open ? '#059669' : '#d97706');
      await loadState();
      renderActivities();
    } else {
      UI.showToast(res?.message || 'خطأ في تغيير الحالة', '#dc2626');
    }
  }

  // Public API
  return {
    pageDashboard, pageActivities, renderActivities: () => renderActivities(),
    pageUpload, pageStats, pageMyVotes, pageMyHistory, toggleVotingSession,
    viewDetail, editModal, addModal, addSampleData, _saveModalManual, delete: deleteActivity,
    confirmReset, _doReset, confirmResetVotes, _doResetVotes,
    _saveEdit, exportApproved, exportAll, printApproved,
    _handleFile, _importMappedXl, _addManual,
    _openRejectModal, _submitReject, _castVote,
    _editVoteModal, _selectVote, _saveVoteEdit,
    _exportMember, _sort,
    getState: () => _state
  };
})();

window.Activities = Activities;
window._fSearch = '';
window._fStatus = 'all';
window._fMember = 'all';
