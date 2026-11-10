// frontend/js/forms.js
'use strict';

const FormBuilder = (() => {
  let _forms = [];
  let _currentSubs = [];
  let _currentForm = null;

  async function page() {
    UI.loading('جاري تحميل الاستمارات...');
    try {
      const res = await request('GET', '/forms');
      _forms = (res && res.forms) || [];
      renderList();
    } catch (e) {
      UI.errorState('تعذر تحميل الاستمارات');
    }
  }

  function renderList() {
    const totalForms = _forms.length;
    const activeForms = _forms.filter(f => f.is_active).length;
    const totalResponses = _forms.reduce((sum, f) => sum + (f.submissionCount || 0), 0);

    const statsHeader = `
      <div class="stats-grid" style="margin-bottom:1.5rem">
        <div class="stat-card" style="--stat-color:#2563eb">
          <div class="stat-num">${totalForms}</div>
          <div class="stat-label">إجمالي الاستمارات المنشأة</div>
        </div>
        <div class="stat-card" style="--stat-color:#10b981">
          <div class="stat-num">${activeForms}</div>
          <div class="stat-label">استمارات تستقبل الردود حالياً</div>
        </div>
        <div class="stat-card" style="--stat-color:#8b5cf6">
          <div class="stat-num">${totalResponses}</div>
          <div class="stat-label">إجمالي الردود المستلمة</div>
        </div>
      </div>
    `;

    const cards = _forms.map(f => {
      // Use the concise short URL: /s/:short_code or fallback to /f/:id
      const formUrl = window.location.origin + (f.short_code ? ('/s/' + f.short_code) : ('/f/' + f.id));
      return `
        <div class="card" style="margin-bottom:1.4rem;border-right:6px solid ${f.is_active ? '#10b981' : '#ef4444'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
            <div style="flex:1;min-width:280px">
              <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem;flex-wrap:nowrap">
                <span style="display:inline-block;width:12px;height:12px;min-width:12px;border-radius:50%;background:${f.is_active ? '#10b981' : '#ef4444'};box-shadow:0 0 0 3px ${f.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}" title="${f.is_active ? 'استقبال الردود مفتوح' : 'الردود متوقفة'}"></span>
                <span style="font-size:1.2rem;font-weight:700;color:#0f172a">${UI.esc(f.title)}</span>
                ${f.header_color ? `<span style="display:inline-block;width:12px;height:12px;min-width:12px;border-radius:50%;background:${f.header_color};border:1px solid #cbd5e1" title="سمة ولون الاستمارة"></span>` : ''}
              </div>
              <div style="font-size:.88rem;color:#64748b;margin-bottom:1rem">${UI.esc(f.description || 'بدون وصف')}</div>
              <div style="display:flex;gap:1.5rem;font-size:.85rem;color:#334155;background:#f8fafc;padding:.8rem 1.2rem;border-radius:10px;border:1px solid #e2e8f0;flex-wrap:wrap;align-items:center">
                <div>📊 <b>الردود المسجلة:</b> <span style="font-weight:700;color:#2563eb">${f.submissionCount || 0}</span></div>
                <div>📅 <b>تاريخ الإنشاء:</b> ${f.created_at.slice(0,10)}</div>
                <div style="display:flex;align-items:center;gap:.6rem;flex:1;min-width:320px">
                  <span style="white-space:nowrap;font-weight:700;color:#475569">🔗 الرابط المختصر:</span>
                  <div style="display:flex;align-items:center;flex:1;border:1.5px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff">
                    <input class="form-control" style="border:none;box-shadow:none;padding:.35rem .8rem;font-size:.88rem;height:auto;direction:ltr;font-weight:700;color:#1d4ed8;background:transparent;cursor:pointer" value="${formUrl}" readonly onclick="this.select();FormBuilder.copyLink('${formUrl}')">
                    <a href="${formUrl}" target="_blank" class="btn btn-sm" style="background:#f1f5f9;color:#0f172a;border-radius:0;border:none;border-right:1px solid #cbd5e1;padding:.35rem .9rem;font-size:.82rem;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:.3rem" title="معاينة وفتح الاستمارة في تبويب جديد">
                      <span>فتح الاستمارة</span>
                      <span style="font-size:1rem;line-height:1">↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
              <button class="btn btn-sm btn-outline" onclick="FormBuilder.copyLink('${formUrl}')">📋 نسخ الرابط</button>
              <button class="btn btn-sm ${f.is_active ? 'btn-warning' : 'btn-success'}" onclick="FormBuilder.toggle('${f.id}')">
                ${f.is_active ? '⏸️ إيقاف الردود' : '▶️ فتح الردود'}
              </button>
              <button class="btn btn-sm btn-info" onclick="FormBuilder.viewSubmissions('${f.id}')">📊 الردود (${f.submissionCount})</button>
              <button class="btn btn-sm btn-primary" style="background:#1d4ed8;border-color:#1e40af" onclick="FormBuilder.importToVotingModal('${f.id}')" title="سحب ردود هذه الاستمارة إلى جدول التصويت">🗳️ سحب للتصويت</button>
              <button class="btn btn-sm btn-outline" style="color:#0284c7;border-color:#bae6fd;background:#f0f9ff" onclick="FormBuilder.duplicate('${f.id}')">📑 نسخ وتكرار</button>
              <button class="btn btn-sm btn-ghost" onclick="FormBuilder.editModal('${f.id}')">✏️ تعديل</button>
              <button class="btn btn-sm btn-danger" onclick="FormBuilder.delete('${f.id}')">🗑️ حذف</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    UI.setContent(`
      ${statsHeader}
      <div class="card" style="margin-bottom:1.5rem">
        <div class="card-title">📑 منشئ وإدارة الاستمارات الإلكترونية
          <div class="card-title-actions">
            <button class="btn btn-primary" onclick="FormBuilder.createModal()">➕ إنشاء استمارة جديدة</button>
          </div>
        </div>
        <p style="color:#64748b;font-size:.9rem;line-height:1.6">
          يمكنك كمدير إنشاء أي استمارة بنظام أسئلة مرن ومفتوح، تخصيص كل سؤال (نص، أرقام، تواريخ، قوائم، أو مرفقات PDF)، نشر الرابط، التحكم بفتح وإغلاق الردود، وتصدير النتائج إلى Excel أو سحبها مباشرة إلى جدول الأنشطة ليبدأ الأعضاء بالتصويت عليها فوراً.
        </p>
      </div>
      ${_forms.length ? cards : `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">لا توجد استمارات منشأة بعد</div>
          <div class="empty-sub">اضغط على الزر العائم (+) بالأسفل أو زر "إنشاء استمارة جديدة" للبدء.</div>
        </div>
      `}
    `);
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url);
    UI.showToast('✅ تم نسخ رابط الاستمارة بنجاح', '#059669');
  }

  async function toggle(id) {
    const res = await request('PATCH', `/forms/${id}/toggle`);
    if (res && res.success) {
      UI.showToast(res.message, res.is_active ? '#059669' : '#d97706');
      page();
    }
  }

  let currentQuestions = [];

  function createModal() {
    currentQuestions = [
      { id: '1', label: 'اسم النشاط أو الفعالية', question_type: 'text', options: '', is_required: 1 },
      { id: '2', label: 'الجهة / الكلية / القسم', question_type: 'text', options: '', is_required: 1 },
      { id: '3', label: 'فكرة النشاط وأهدافه', question_type: 'textarea', options: '', is_required: 0 },
      { id: '4', label: 'نوع النشاط', question_type: 'select', options: 'ورشة عمل\nندوة علمية\nمؤتمر\nدورة تدريبية\nنشاط تطوعي', is_required: 0 },
      { id: '5', label: 'المرفقات أو الأوليات (PDF أو صور)', question_type: 'file', options: '', is_required: 0 }
    ];
    showEditorPage('إنشاء استمارة ومتطلبات جديدة', {
      header_color: '#1e293b',
      bg_color: '#f1f5f9',
      font_family: 'ibm',
      header_image: ''
    });
  }

  async function editModal(id) {
    UI.loading('جاري تحميل الاستمارة...');
    const res = await request('GET', '/forms/' + id);
    if (!res || !res.success) { UI.showToast('تعذر جلب الاستمارة', '#dc2626'); return; }
    currentQuestions = res.questions || [];
    showEditorPage('تعديل الاستمارة وتصميمها', res.form);
  }

  async function duplicate(id) {
    UI.loading('جاري نسخ الاستمارة...');
    const res = await request('GET', '/forms/' + id);
    if (!res || !res.success) { UI.showToast('تعذر جلب بيانات الاستمارة', '#dc2626'); return; }
    // Clone questions with new temporary IDs
    currentQuestions = (res.questions || []).map((q, idx) => ({
      ...q,
      id: String(idx + 1)
    }));
    // Clone form info with duplicate label and NO ID so it saves as a brand new form
    const clonedForm = {
      title: (res.form.title || 'استمارة') + ' (نسخة)',
      description: res.form.description || '',
      header_color: res.form.header_color || '#1e293b',
      bg_color: res.form.bg_color || '#f1f5f9',
      font_family: res.form.font_family || 'ibm',
      header_image: res.form.header_image || ''
    };
    showEditorPage('تكرار وإنشاء نسخة من الاستمارة', clonedForm);
  }

  function showEditorPage(titleText, form) {
    window._formHeaderImg = form?.header_image || '';
    const activeHeaderColor = form?.header_color || '#1e293b';
    const activeBgColor = form?.bg_color || '#f1f5f9';
    const activeFont = form?.font_family || 'ibm';

    const colorPalettes = [
      { name: 'كحلي رسمي', header: '#0f172a', bg: '#f1f5f9' },
      { name: 'أزرق جامعي', header: '#1e40af', bg: '#eff6ff' },
      { name: 'أخضر مستدام', header: '#065f46', bg: '#ecfdf5' },
      { name: 'عنابي أنيق', header: '#831843', bg: '#fdf2f8' },
      { name: 'بنفسجي ملكي', header: '#581c87', bg: '#faf5ff' },
      { name: 'رمادي غامق', header: '#334155', bg: '#f8fafc' },
      { name: 'برتقالي هادئ', header: '#9a3412', bg: '#fff7ed' }
    ];

    const palettePills = colorPalettes.map(p => `
      <button type="button" onclick="FormBuilder.applyTheme('${p.header}', '${p.bg}')"
        style="display:flex;align-items:center;gap:.4rem;padding:.35rem .75rem;border-radius:20px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:.82rem;font-weight:600">
        <span style="width:14px;height:14px;border-radius:50%;background:${p.header}"></span>
        <span>${p.name}</span>
      </button>
    `).join('');

    UI.setContent(`
      <div style="max-width:980px;margin:0 auto">
        
        <!-- Top Action Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
          <div style="display:flex;align-items:center;gap:1rem">
            <button class="btn btn-sm btn-outline" onclick="App.navigate('form-builder')">⬅️ العودة لقائمة الاستمارات</button>
            <div style="font-size:1.3rem;font-weight:800;color:#0f172a">${titleText}</div>
          </div>
          <div style="display:flex;gap:.7rem">
            <button class="btn btn-outline" onclick="App.navigate('form-builder')">إلغاء</button>
            <button class="btn btn-primary" style="padding:.65rem 2rem" onclick="FormBuilder.save('${form?.id || ''}')">💾 حفظ ونشر الاستمارة</button>
          </div>
        </div>

        <!-- General Form Information Card -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="card-title">معلومات وعنوان الاستمارة</div>
          <div class="form-group">
            <label style="font-weight:700">عنوان الاستمارة *</label>
            <input class="form-control" id="ef-title" value="${UI.esc(form?.title || '')}" placeholder="مثال: استمارة تسجيل الأنشطة والمقترحات البحثية" style="font-size:1.05rem;font-weight:600">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label style="font-weight:700">الوصف والتعليمات التوضيحية</label>
            <textarea class="form-control" id="ef-desc" rows="3" placeholder="اكتب نبذة توجيهية للمشاركين والباحثين...">${UI.esc(form?.description || '')}</textarea>
          </div>
        </div>

        <!-- Google Forms Style Theme & Appearance Customizer Card -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="card-title">تنسيق ومظهر الاستمارة (Google Forms Style)</div>

          <div style="margin-bottom:1.2rem">
            <label style="font-size:.88rem;font-weight:700;display:block;margin-bottom:.5rem">سمات الألوان الجاهزة:</label>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem">
              ${palettePills}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1.2rem;align-items:flex-end">
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:.85rem;font-weight:600">لون الترويسة العلوية:</label>
              <div style="display:flex;align-items:center;gap:.6rem">
                <input type="color" id="ef-header-color" value="${activeHeaderColor}" style="width:50px;height:40px;padding:0;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer" onchange="FormBuilder.previewTheme()">
                <input class="form-control" id="ef-header-color-txt" value="${activeHeaderColor}" style="font-size:.88rem" oninput="document.getElementById('ef-header-color').value=this.value;FormBuilder.previewTheme()">
              </div>
            </div>

            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:.85rem;font-weight:600">لون خلفية الصفحة:</label>
              <div style="display:flex;align-items:center;gap:.6rem">
                <input type="color" id="ef-bg-color" value="${activeBgColor}" style="width:50px;height:40px;padding:0;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer" onchange="FormBuilder.previewTheme()">
                <input class="form-control" id="ef-bg-color-txt" value="${activeBgColor}" style="font-size:.88rem" oninput="document.getElementById('ef-bg-color').value=this.value;FormBuilder.previewTheme()">
              </div>
            </div>

            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:.85rem;font-weight:600">نوع الخط:</label>
              <select class="form-control" id="ef-font-family" style="font-size:.88rem">
                <option value="ibm" ${activeFont==='ibm'?'selected':''}>IBM Plex Sans Arabic (افتراضي رسمي)</option>
                <option value="tajawal" ${activeFont==='tajawal'?'selected':''}>Tajawal (ناعم)</option>
                <option value="cairo" ${activeFont==='cairo'?'selected':''}>Cairo (عريض)</option>
                <option value="almarai" ${activeFont==='almarai'?'selected':''}>Almarai (أنيق)</option>
              </select>
            </div>
          </div>

          <div style="margin-top:1.4rem;border-top:1px dashed #cbd5e1;padding-top:1.2rem">
            <label style="font-size:.88rem;font-weight:700;display:block;margin-bottom:.5rem">صورة ترويسة الاستمارة (Header Banner):</label>
            <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
              <div id="header-img-preview" style="flex:1;min-height:70px;max-height:120px;background:${activeHeaderColor};border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #cbd5e1">
                ${window._formHeaderImg ? `<img src="${window._formHeaderImg}" style="width:100%;height:110px;object-fit:cover">` : '<span style="font-size:.85rem;color:#fff">معاينة الترويسة (يتم استخدام شريط اللون)</span>'}
              </div>
              <div style="display:flex;flex-direction:column;gap:.5rem">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('header-img-inp').click()">🖼️ رفع صورة ترويسة</button>
                ${window._formHeaderImg ? `<button type="button" class="btn btn-ghost" style="color:#ef4444" onclick="FormBuilder.removeHeaderImg()">✕ إزالة الصورة</button>` : ''}
                <input type="file" id="header-img-inp" accept="image/*" style="display:none" onchange="FormBuilder.uploadHeaderImg(this)">
              </div>
            </div>
          </div>
        </div>

        <!-- Question List Card -->
        <div class="card" style="margin-bottom:2rem">
          <div class="card-title">
            <span>الحقول والمتطلبات والأسئلة المطلوبة</span>
            <button class="btn btn-sm btn-primary" onclick="FormBuilder.addQuestionRow()">➕ إضافة متطلب/سؤال جديد</button>
          </div>
          <div id="q-rows-container"></div>
          <div style="text-align:center;margin-top:1rem">
            <button class="btn btn-outline" onclick="FormBuilder.addQuestionRow()">➕ إضافة سؤال آخر</button>
          </div>
        </div>

        <!-- Bottom Save Bar -->
        <div style="display:flex;justify-content:flex-end;gap:.8rem;padding-bottom:3rem">
          <button class="btn btn-outline" onclick="App.navigate('form-builder')">إلغاء</button>
          <button class="btn btn-primary" style="padding:.8rem 3rem;font-size:1.05rem" onclick="FormBuilder.save('${form?.id || ''}')">💾 حفظ ونشر الاستمارة</button>
        </div>

      </div>
    `);

    renderQuestionRows();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestionRows() {
    const container = document.getElementById('q-rows-container');
    if (!container) return;
    container.innerHTML = currentQuestions.map((q, idx) => `
      <div style="background:#f8fafc;padding:1.1rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:.9rem">
        <div style="display:flex;gap:.7rem;align-items:center;margin-bottom:.7rem;flex-wrap:wrap">
          <span style="font-weight:700;color:#64748b;min-width:20px">${idx + 1}.</span>
          <input class="form-control" style="flex:1;min-width:220px" value="${UI.esc(q.label)}" placeholder="نص السؤال أو المتطلب..." oninput="FormBuilder.updateQ(${idx}, 'label', this.value)">
          <select class="form-control" style="width:160px" onchange="FormBuilder.updateQ(${idx}, 'question_type', this.value)">
            <option value="text" ${q.question_type==='text'?'selected':''}>نص قصير</option>
            <option value="textarea" ${q.question_type==='textarea'?'selected':''}>فقرة شرح طويلة</option>
            <option value="number" ${q.question_type==='number'?'selected':''}>رقم</option>
            <option value="date" ${q.question_type==='date'?'selected':''}>تاريخ</option>
            <option value="select" ${q.question_type==='select'?'selected':''}>قائمة منسدلة</option>
            <option value="radio" ${q.question_type==='radio'?'selected':''}>خيارات متعددة</option>
            <option value="file" ${q.question_type==='file'?'selected':''}>📎 رفع ملف / PDF</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick="FormBuilder.removeQ(${idx})" title="حذف هذا السؤال">✕</button>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding-top:.6rem;flex-wrap:wrap;gap:1rem;border-top:1px dashed #e2e8f0;margin-top:.6rem">
          <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;color:#334155;cursor:pointer;margin-top:.4rem">
            <input type="checkbox" ${q.is_required ? 'checked' : ''} onchange="FormBuilder.updateQ(${idx}, 'is_required', this.checked ? 1 : 0)">
            <span style="font-weight:600">متطلب إلزامي (مطلوب)</span>
          </label>
          ${['select','radio'].includes(q.question_type) ? `
            <div style="flex:1;min-width:280px;max-width:550px">
              <label style="font-size:.82rem;font-weight:700;color:#0f172a;display:block;margin-bottom:.3rem">
                خيارات القائمة (اكتب كل خيار في سطر منفصل):
              </label>
              <textarea class="form-control" rows="4" style="font-size:.85rem;line-height:1.6" placeholder="اكتب كل خيار في سطر، مثلاً:&#10;ورشة عمل&#10;ندوة علمية&#10;مؤتمر&#10;دورة تدريبية" oninput="FormBuilder.updateQ(${idx}, 'options', this.value)">${UI.esc(q.options || '')}</textarea>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  function addQuestionRow() {
    currentQuestions.push({
      id: Date.now().toString(),
      label: 'متطلب جديد',
      question_type: 'text',
      options: '',
      is_required: 0
    });
    renderQuestionRows();
  }

  function updateQ(idx, key, val) {
    if (currentQuestions[idx]) {
      currentQuestions[idx][key] = val;
      if (key === 'question_type') renderQuestionRows();
    }
  }

  function removeQ(idx) {
    currentQuestions.splice(idx, 1);
    renderQuestionRows();
  }

  function applyTheme(headerColor, bgColor) {
    const hc = document.getElementById('ef-header-color');
    const hct = document.getElementById('ef-header-color-txt');
    const bg = document.getElementById('ef-bg-color');
    const bgt = document.getElementById('ef-bg-color-txt');
    if (hc) hc.value = headerColor;
    if (hct) hct.value = headerColor;
    if (bg) bg.value = bgColor;
    if (bgt) bgt.value = bgColor;
    previewTheme();
  }

  function previewTheme() {
    const preview = document.getElementById('header-img-preview');
    const hc = document.getElementById('ef-header-color')?.value || '#1e293b';
    if (preview && !window._formHeaderImg) {
      preview.style.background = hc;
    }
  }

  function uploadHeaderImg(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      UI.showToast('يرجى رفع ملف صورة صالح', '#dc2626');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      UI.showToast('حجم الصورة كبير جداً (الحد الأقصى 2MB)', '#d97706');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      window._formHeaderImg = e.target.result;
      const preview = document.getElementById('header-img-preview');
      if (preview) {
        preview.innerHTML = `<img src="${window._formHeaderImg}" style="width:100%;height:80px;object-fit:cover">`;
      }
      UI.showToast('✅ تم تحميل صورة الترويسة', '#059669');
    };
    reader.readAsDataURL(file);
  }

  function removeHeaderImg() {
    window._formHeaderImg = '';
    const preview = document.getElementById('header-img-preview');
    const hc = document.getElementById('ef-header-color')?.value || '#1e293b';
    if (preview) {
      preview.style.background = hc;
      preview.innerHTML = '<span style="font-size:.8rem;color:#fff">تمت إزالة الصورة (سيتم استخدام اللون)</span>';
    }
    UI.showToast('تمت إزالة صورة الترويسة', '#059669');
  }

  async function save(formId) {
    const title = document.getElementById('ef-title').value.trim();
    if (!title) { UI.showToast('عنوان الاستمارة مطلوب', '#dc2626'); return; }

    const payload = {
      title,
      description: document.getElementById('ef-desc').value.trim(),
      header_color: document.getElementById('ef-header-color')?.value || '#1e293b',
      bg_color: document.getElementById('ef-bg-color')?.value || '#f1f5f9',
      font_family: document.getElementById('ef-font-family')?.value || 'ibm',
      header_image: window._formHeaderImg || '',
      questions: currentQuestions
    };

    const method = formId ? 'PUT' : 'POST';
    const endpoint = formId ? '/forms/' + formId : '/forms';
    const res = await request(method, endpoint, payload);

    if (res && res.success) {
      UI.closeModal();
      UI.showToast('✅ تم حفظ الاستمارة بنجاح', '#059669');
      page();
    } else {
      UI.showToast((res && res.message) || 'خطأ في الحفظ', '#dc2626');
    }
  }

  async function del(id) {
    if (!confirm('هل تريد حذف هذه الاستمارة وجميع ردودها نهائياً؟')) return;
    const res = await request('DELETE', '/forms/' + id);
    if (res && res.success) {
      UI.showToast('تم حذف الاستمارة', '#dc2626');
      page();
    }
  }

  async function viewSubmissions(id) {
    UI.loading('جاري تحميل الردود...');
    const formRes = await request('GET', '/forms/' + id);
    const res = await request('GET', `/forms/${id}/submissions`);
    if (!res || !res.success) { UI.showToast('تعذر جلب الردود', '#dc2626'); return; }
    _currentSubs = res.submissions || [];
    _currentForm = formRes?.form || { id, title: 'الاستمارة' };

    renderFullSubmissionsPage(id);
  }

  function renderFullSubmissionsPage(id) {
    const total = _currentSubs.length;
    const formUrl = window.location.origin + (_currentForm.short_code ? ('/s/' + _currentForm.short_code) : ('/f/' + _currentForm.id));

    if (!total) {
      UI.setContent(`
        <div style="margin-bottom:1.5rem">
          <button class="btn btn-sm btn-outline" onclick="App.navigate('form-builder')">⬅️ العودة لمنشئ الاستمارات</button>
        </div>
        <div class="card">
          <div class="card-title">📊 ردود: ${UI.esc(_currentForm.title)}</div>
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">لا توجد ردود مسجلة بعد في هذه الاستمارة</div>
            <div class="empty-sub">شارك الرابط المباشر مع المشاركين لتبدأ الردود بالظهور هنا فوراً:</div>
            <div style="max-width:400px;margin:1rem auto 0">
              <input class="form-control" style="direction:ltr;text-align:center;font-weight:700;color:#1d4ed8" value="${formUrl}" readonly onclick="this.select();FormBuilder.copyLink('${formUrl}')">
            </div>
          </div>
        </div>
      `);
      return;
    }

    const firstAnswers = _currentSubs[0].answers || {};
    const cols = Object.keys(firstAnswers);

    const headers = `
      <th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">#</th>
      <th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">اسم مقدم الطلب</th>
      <th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">البريد الإلكتروني</th>
      <th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">الجهة / التشكيل</th>
      <th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">الهاتف</th>
    ` + cols.map(c => `<th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">${UI.esc(c)}</th>`).join('') + `
      <th style="background:#0f172a;color:#fff;position:sticky;top:0;z-index:2">تاريخ التقديم</th>
    `;

    const rows = _currentSubs.map((s, idx) => {
      const respTds = `
        <td style="font-weight:700;color:#0f172a;white-space:nowrap">${UI.esc(s.respondent_name || '-')}</td>
        <td style="direction:ltr;font-weight:600;color:#2563eb;white-space:nowrap">${UI.esc(s.respondent_email || '-')}</td>
        <td style="white-space:nowrap">${UI.esc(s.respondent_org || '-')}</td>
        <td style="direction:ltr;white-space:nowrap">${UI.esc(s.respondent_phone || '-')}</td>
      `;
      const tds = cols.map(c => {
        let val = s.answers[c] || '-';
        if (typeof val === 'string' && val.startsWith('/uploads/')) {
          val = `<a href="${val}" target="_blank" class="attachment-pill" style="display:inline-flex;padding:.2rem .6rem;font-size:.78rem">📎 فتح المرفق</a>`;
        } else if (typeof val === 'string' && val.startsWith('http')) {
          val = `<a href="${val}" target="_blank" class="attachment-pill" style="display:inline-flex;padding:.2rem .6rem;font-size:.78rem">📁 Google Drive</a>`;
        } else {
          val = UI.esc(String(val));
        }
        return `<td style="max-width:280px">${val}</td>`;
      }).join('');
      return `
        <tr style="transition:background 0.2s">
          <td style="font-weight:700;color:#64748b">${idx + 1}</td>
          ${respTds}
          ${tds}
          <td style="font-size:.78rem;color:#64748b;direction:ltr;white-space:nowrap">${s.created_at.slice(0, 16)}</td>
        </tr>
      `;
    }).join('');

    UI.setContent(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
        <div>
          <button class="btn btn-sm btn-outline" onclick="App.navigate('form-builder')">⬅️ العودة لمنشئ الاستمارات</button>
        </div>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button class="btn btn-success" onclick="FormBuilder.exportSubmissionsExcel()">📥 تنزيل شيت Excel</button>
          <button class="btn btn-primary" onclick="FormBuilder.importToVotingModal('${id}')">🗳️ سحب الردود للتصويت</button>
        </div>
      </div>

      <!-- Statistics Banner -->
      <div class="stats-grid" style="margin-bottom:1.5rem">
        <div class="stat-card" style="--stat-color:#2563eb">
          <div class="stat-num">${total}</div>
          <div class="stat-label">إجمالي الردود المستلمة</div>
        </div>
        <div class="stat-card" style="--stat-color:#10b981">
          <div class="stat-num">${new Set(_currentSubs.map(s => s.respondent_email).filter(Boolean)).size}</div>
          <div class="stat-label">مشاركون فريدون مسجلون</div>
        </div>
        <div class="stat-card" style="--stat-color:#8b5cf6">
          <div class="stat-num">${_currentSubs.filter(s => Object.values(s.answers||{}).some(v => typeof v === 'string' && (v.startsWith('/uploads/') || v.startsWith('http')))).length}</div>
          <div class="stat-label">ردود تحتوي مرفقات وملفات</div>
        </div>
      </div>

      <!-- Google Sheets Style Table -->
      <div class="card" style="padding:0;overflow:hidden;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
        <div style="padding:1.2rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <div style="font-size:1.2rem;font-weight:700;color:#0f172a">📊 جدول الردود والإجابات: ${UI.esc(_currentForm.title)}</div>
            <div style="font-size:.82rem;color:#64748b">عرض كامل على نمط Google Sheets مع حفظ وتوثيق الإيميل والبيانات الشخصية تلقائياً</div>
          </div>
          <div>
            <input type="text" placeholder="🔍 تصفية وبحث في الردود..." class="form-control" style="max-width:260px;font-size:.85rem" oninput="FormBuilder.filterSubmissionsTable(this.value)">
          </div>
        </div>

        <div class="table-wrap" style="max-height:68vh;overflow:auto;margin:0">
          <table id="subs-table" style="margin:0;width:100%;border-collapse:collapse">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  function filterSubmissionsTable(keyword) {
    const q = keyword.trim().toLowerCase();
    const rows = document.querySelectorAll('#subs-table tbody tr');
    rows.forEach(r => {
      const txt = r.textContent.toLowerCase();
      r.style.display = txt.includes(q) ? '' : 'none';
    });
  }

  function exportSubmissionsExcel() {
    if (!_currentSubs.length) return;
    const excelRows = _currentSubs.map((s, idx) => {
      const row = {
        'ت': idx + 1,
        'اسم مقدم النشاط': s.full_name || s.respondent_name || '',
        'البريد الإلكتروني': s.email || s.respondent_email || '',
        'الجهة / التشكيل': s.affiliation || s.respondent_org || '',
        'رقم الهاتف': s.phone || s.respondent_phone || '',
        'تاريخ التقديم': s.created_at || ''
      };
      
      // Append each question with proper column name
      if (_currentQuestions && _currentQuestions.length) {
        _currentQuestions.forEach(q => {
          row[q.label] = (s.answers && s.answers[q.label] !== undefined) ? s.answers[q.label] : '';
        });
      } else {
        Object.keys(s.answers || {}).forEach(k => {
          row[k] = s.answers[k];
        });
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    
    // Auto-adjust column widths & add right-to-left flag
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 15;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ c: C, r: R })];
        if (cell && cell.v) {
          const str = String(cell.v);
          if (str.length > maxLen) maxLen = Math.min(str.length + 4, 45);
        }
      }
      colWidths.push({ wch: maxLen });
    }
    ws['!cols'] = colWidths;

    // Set Right-to-Left orientation for Arabic sheets
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الردود');
    
    // Set workbook view RTL
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Views) wb.Workbook.Views = [];
    wb.Workbook.Views[0] = { RTL: true };

    const cleanTitle = (_currentForm.title || 'استمارة').replace(/[\/\\?%*:|"<>]/g, '_');
    const fileName = `سجل_ردود_${cleanTitle}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    UI.showToast('✅ تم تنزيل ملف Excel المنظم بنجاح', '#059669');
  }

  async function importToVotingModal(id) {
    UI.loading('جاري فحص الردود...');
    const formRes = await request('GET', '/forms/' + id);
    const res = await request('GET', `/forms/${id}/submissions`);
    if (!res || !res.success) { UI.showToast('تعذر جلب الردود', '#dc2626'); return; }
    _currentSubs = res.submissions || [];
    _currentForm = formRes?.form || { id, title: 'الاستمارة' };

    if (!_currentSubs.length) {
      UI.openModal(`
        <div class="modal-title">🗳️ سحب الردود إلى جدول التصويت</div>
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-title">لا توجد ردود بعد في هذه الاستمارة</div>
          <div class="empty-sub">يجب أن يقوم المشاركون بإرسال إجابات أولاً لتتمكن من سحبها إلى جدول التصويت.</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
        </div>
      `);
      return;
    }

    UI.openModal(`
      <div class="modal-title">🗳️ سحب الردود إلى جدول التصويت</div>
      <div class="alert alert-info" style="line-height:1.6">
        📌 سيتم تحويل كافة إجابات هذه الاستمارة (${_currentSubs.length} رد) إلى أنشطة رسمية داخل جدول التصويت ليتمكن الأعضاء من تقييمها والتصويت عليها فوراً.<br>
        🔒 <b>ملاحظة أمان:</b> كافة الاستمارات والردود الأصلية ستبقى محفوظة في النظام ولن تُمس.
      </div>
      <div style="background:#f8fafc;padding:1.2rem;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:1.4rem">
        <label style="font-weight:700;display:block;margin-bottom:.6rem;color:#0f172a">كيف تريد سحب الأنشطة؟</label>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          <label style="display:flex;align-items:center;gap:.6rem;cursor:pointer;font-weight:500">
            <input type="radio" name="import-mode" value="replace" checked>
            <span><b>استبدال الأنشطة الحالية بالكامل</b> (إلغاء السابقة من صفحة التصويت مع الاحتفاظ بكل الإجابات والاستمارات)</span>
          </label>
          <label style="display:flex;align-items:center;gap:.6rem;cursor:pointer;font-weight:500">
            <input type="radio" name="import-mode" value="append">
            <span><b>إضافة إلى الأنشطة الحالية</b> (دمج الردود مع الأنشطة المعروضة حالياً)</span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="FormBuilder._executeImport('${id}')">تأكيد وسحب للتصويت</button>
      </div>
    `);
  }

  async function _executeImport(id) {
    const radios = document.getElementsByName('import-mode');
    let replace = true;
    for (const r of radios) {
      if (r.checked && r.value === 'append') replace = false;
    }

    UI.loading('جاري سحب الردود وتحديث جدول التصويت...');
    const res = await request('POST', `/forms/${id}/import-to-voting`, { replaceCurrent: replace });
    if (res && res.success) {
      UI.closeModal();
      UI.showToast(`✅ ${res.message}`, '#059669');
      App.buildSidebar();
      App.navigate('activities');
    } else {
      UI.showToast((res && res.message) || 'خطأ في السحب', '#dc2626');
    }
  }

  return {
    page,
    createModal,
    editModal,
    addQuestionRow,
    updateQ,
    removeQ,
    save,
    toggle,
    delete: del,
    copyLink,
    viewSubmissions,
    exportSubmissionsExcel,
    importToVotingModal,
    duplicate,
    applyTheme,
    previewTheme,
    uploadHeaderImg,
    removeHeaderImg,
    filterSubmissionsTable,
    _executeImport
  };
})();

window.FormBuilder = FormBuilder;
