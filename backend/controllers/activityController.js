// backend/controllers/activityController.js
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

// GET /api/activities
async function getActivities(req, res) {
  try {
    const [settingsRows] = await pool.query('SELECT voting_open FROM settings WHERE id = 1');
    const votingOpen = settingsRows.length && settingsRows[0].voting_open !== undefined ? Boolean(settingsRows[0].voting_open) : true;

    // If user is a voting member and voting is NOT open, don't show activities to them!
    const isMember = req.user && req.user.role === 'member';
    if (isMember && !votingOpen) {
      return res.json({
        success: true,
        activities: [],
        memberCount: 0,
        votingOpen: false,
        message: 'التصويت وعرض الأنشطة مغلق حالياً بانتظار إيعاز الإدارة'
      });
    }

    const [activities] = await pool.query(
      'SELECT * FROM activities ORDER BY CAST(seq AS UNSIGNED), seq, imported_at ASC'
    );
    const [votes] = await pool.query('SELECT * FROM votes');
    const [members] = await pool.query(
      'SELECT id FROM users WHERE role = "member" AND active = 1'
    );

    const activitiesWithStatus = activities.map(act => {
      const actVotes = votes.filter(v => v.activity_id === act.id);
      const approved = actVotes.filter(v => v.vote === 'approve').length;
      const rejected = actVotes.filter(v => v.vote === 'reject').length;
      let status = 'pending';
      if (members.length && actVotes.length >= members.length) {
        if (approved > rejected) status = 'approved';
        else if (rejected > approved) status = 'rejected';
      }
      return {
        ...act,
        extra: act.extra ? (typeof act.extra === 'string' ? JSON.parse(act.extra) : act.extra) : null,
        votes: actVotes,
        approveCount: approved,
        rejectCount:  rejected,
        status
      };
    });

    res.json({ success: true, activities: activitiesWithStatus, memberCount: members.length, votingOpen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// POST /api/activities  — admin only (single)
async function createActivity(req, res) {
  const { seq, name, type, teamLeader, affiliation, teamMembers, attachment, extra } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'اسم النشاط مطلوب' });
  }

  try {
    const [count] = await pool.query('SELECT COUNT(*) as cnt FROM activities');
    const id  = uuidv4();
    const seqVal = seq || String(count[0].cnt + 1);

    await pool.query(
      `INSERT INTO activities (id, seq, name, type, team_leader, affiliation, team_members, attachment, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, seqVal, name.trim(), type || '', teamLeader || '', affiliation || '',
       teamMembers || '', attachment || '', extra ? JSON.stringify(extra) : null]
    );

    res.status(201).json({ success: true, message: 'تم إضافة النشاط', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// POST /api/activities/bulk  — admin only (import from Excel)
async function bulkImport(req, res) {
  const { activities, replace } = req.body;

  if (!Array.isArray(activities) || !activities.length) {
    return res.status(400).json({ success: false, message: 'لا توجد بيانات للاستيراد' });
  }

  try {
    if (replace) {
      await pool.query('DELETE FROM votes');
      await pool.query('DELETE FROM activities');
    }

    const [countRes] = await pool.query('SELECT COUNT(*) as cnt FROM activities');
    let offset = countRes[0].cnt;
    let added  = 0;

    for (const act of activities) {
      if (!act.name) continue;
      const id = uuidv4();
      await pool.query(
        `INSERT INTO activities (id, seq, name, type, team_leader, affiliation, team_members, attachment, extra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, act.seq || String(offset + added + 1), act.name,
         act.type || '', act.teamLeader || '', act.affiliation || '',
         act.teamMembers || '', act.attachment || '',
         act.extra ? JSON.stringify(act.extra) : null]
      );
      added++;
    }

    res.json({ success: true, message: `تم استيراد ${added} نشاط`, added });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في استيراد البيانات' });
  }
}

// PUT /api/activities/:id  — admin only
async function updateActivity(req, res) {
  const { id } = req.params;
  const { seq, name, type, teamLeader, affiliation, teamMembers, attachment } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'اسم النشاط مطلوب' });
  }

  try {
    await pool.query(
      `UPDATE activities SET seq=?, name=?, type=?, team_leader=?, affiliation=?, team_members=?, attachment=?
       WHERE id=?`,
      [seq || '', name.trim(), type || '', teamLeader || '', affiliation || '',
       teamMembers || '', attachment || '', id]
    );
    res.json({ success: true, message: 'تم تعديل النشاط' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// DELETE /api/activities/:id  — admin only
async function deleteActivity(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM votes WHERE activity_id = ?', [id]);
    await pool.query('DELETE FROM activities WHERE id = ?', [id]);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// DELETE /api/activities  — reset all
async function resetActivities(req, res) {
  try {
    await pool.query('DELETE FROM votes');
    await pool.query('DELETE FROM activities');
    res.json({ success: true, message: 'تم تصفير جميع الأنشطة' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// DELETE /api/activities/votes-only — reset votes only
async function resetVotes(req, res) {
  try {
    await pool.query('DELETE FROM votes');
    res.json({ success: true, message: 'تم تصفير التصويتات' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// GET /api/activities/settings
async function getSettings(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json({ success: true, settings: rows[0] || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// PUT /api/activities/settings
async function updateSettings(req, res) {
  const { system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family, google_webhook_url } = req.body;
  try {
    await pool.query(
      `INSERT INTO settings (id, system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family, google_webhook_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         system_title=VALUES(system_title), system_subtitle=VALUES(system_subtitle),
         logo_type=VALUES(logo_type), logo_emoji=VALUES(logo_emoji), logo_image=VALUES(logo_image),
         font_family=VALUES(font_family), google_webhook_url=VALUES(google_webhook_url)`,
      [system_title || 'نظام إدارة الأنشطة',
       system_subtitle || 'وحدة التنمية المستدامة',
       logo_type || 'emoji', logo_emoji || '🏛️', logo_image || '',
       font_family || 'ibm',
       google_webhook_url !== undefined ? google_webhook_url : '']
    );
    res.json({ success: true, message: 'تم حفظ الإعدادات' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// POST /api/activities/toggle-voting — admin only
async function toggleVoting(req, res) {
  try {
    const [rows] = await pool.query('SELECT voting_open FROM settings WHERE id = 1');
    const current = (rows.length && rows[0].voting_open !== undefined) ? rows[0].voting_open : 1;
    const nextVal = current ? 0 : 1;

    await pool.query('UPDATE settings SET voting_open = ? WHERE id = 1', [nextVal]);

    res.json({
      success: true,
      voting_open: nextVal === 1,
      message: nextVal === 1
        ? 'تم فتح جلسة التصويت وإظهار الأنشطة لجميع الأعضاء المصوتين'
        : 'تم إيقاف جلسة التصويت وحجب الأنشطة عن الأعضاء المصوتين'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ أثناء تغيير حالة جلسة التصويت' });
  }
}

module.exports = {
  getActivities, createActivity, bulkImport,
  updateActivity, deleteActivity, resetActivities,
  resetVotes, getSettings, updateSettings, toggleVoting
};
