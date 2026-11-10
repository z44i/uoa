// backend/utils/helpers.js

// Standard column names (Arabic) from Excel
const STD_COLS = [
  'ت', 'اسم النشاط', 'نوع النشاط', 'اسم رئيس الفريق', 'رئيس الفريق', 'رئيس',
  'اسم التشكيل', 'جهة الانتساب', 'التشكيل', 'الانتساب', 'جهة',
  'أعضاء الفريق', 'الأعضاء', 'الملف المرفق', 'مرفق', 'ملف', 'رابط'
];

function isStdCol(k) {
  return STD_COLS.some(s => k.trim().includes(s) || s.includes(k.trim()));
}

/**
 * Map a raw Excel row to activity object
 */
function mapExcelRow(row, idx) {
  const keys = Object.keys(row);
  const get = (...aa) => {
    for (const a of aa) {
      const k = keys.find(k => k.trim().includes(a.trim()));
      if (k !== undefined && String(row[k]).trim() !== '') return String(row[k]);
    }
    return '';
  };

  const extra = {};
  keys.forEach(k => {
    if (!isStdCol(k) && String(row[k]).trim() !== '') extra[k] = String(row[k]);
  });

  return {
    seq:         get('ت') || String(idx + 1),
    name:        get('اسم النشاط', 'النشاط'),
    type:        get('نوع النشاط', 'النوع'),
    teamLeader:  get('اسم رئيس الفريق', 'رئيس الفريق', 'رئيس'),
    affiliation: get('اسم التشكيل', 'جهة الانتساب', 'التشكيل', 'الانتساب', 'جهة'),
    teamMembers: get('أعضاء الفريق', 'الأعضاء'),
    attachment:  get('الملف المرفق', 'مرفق', 'ملف', 'رابط'),
    extra:       Object.keys(extra).length ? extra : null
  };
}

/**
 * Compute activity status from votes
 */
function computeStatus(votes, memberCount) {
  if (!memberCount) return 'pending';
  if (votes.length < memberCount) return 'pending';
  const app = votes.filter(v => v.vote === 'approve').length;
  const rej = votes.filter(v => v.vote === 'reject').length;
  if (app > rej) return 'approved';
  if (rej > app) return 'rejected';
  return 'pending';
}

module.exports = { mapExcelRow, computeStatus };
