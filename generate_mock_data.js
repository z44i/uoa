// generate_mock_data.js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'database/voting_system.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('🚀 بدء تجربة المحاكاة الشاملة للنظام...');

// 1. Create 4 Voting Member Users (Admin/Voting Committee Members)
const voters = [
  { username: 'voter1', name: 'أ.د. حامد عبد الله الكبيسي' },
  { username: 'voter2', name: 'د. يوسف منذر الراوي' },
  { username: 'voter3', name: 'م.د. لمياء سالم الفهداوي' },
  { username: 'voter4', name: 'أ.م.د. علي حسين العاني' }
];

const passHash = bcrypt.hashSync('123456', 10);
const voterIds = [];

for (const v of voters) {
  let user = db.prepare('SELECT id FROM users WHERE username = ?').get(v.username);
  let uid = user ? user.id : uuidv4();
  if (!user) {
    db.prepare("INSERT INTO users (id, name, username, password, role, active) VALUES (?, ?, ?, ?, 'member', 1)")
      .run(uid, v.name, v.username, passHash);
    console.log(`👤 تم إنشاء العضو المصوت: ${v.name} (${v.username})`);
  } else {
    db.prepare("UPDATE users SET role = 'member', active = 1, password = ? WHERE id = ?").run(passHash, uid);
    console.log(`👤 تم تحديث العضو المصوت: ${v.name}`);
  }
  voterIds.push(uid);
}

// 2. Create 3 Distinct University Forms
const formsDefinitions = [
  {
    title: 'استمارة مؤتمر بحوث التنمية المستدامة 2026',
    description: 'استمارة تقديم البحوث وأوراق العمل للمؤتمر السنوي لجامعة الانبار',
    header_color: '#1e3a8a',
    bg_color: '#eff6ff',
    font_family: 'ibm',
    questions: [
      { label: 'عنوان البحث أو الورقة العلمية', question_type: 'text', is_required: 1 },
      { label: 'المحور التنموي المستهدف', question_type: 'select', options: 'التعليم الجيد\nالطاقة النظيفة\nالمدن المستدامة\nالابتكار والصناعة', is_required: 1 },
      { label: 'مستخلص الفكرة وأهم النتائج المتوقعة', question_type: 'textarea', is_required: 1 },
      { label: 'المرفق العلمي أو التقرير الأولي (PDF)', question_type: 'file', is_required: 0 }
    ]
  },
  {
    title: 'استمارة المبادرات المجتمعية والعمل التطوعي',
    description: 'خاصة بالأنشطة والمبادرات التي تقدمها كليات ومراكز الجامعة لخدمة المجتمع',
    header_color: '#065f46',
    bg_color: '#ecfdf5',
    font_family: 'tajawal',
    questions: [
      { label: 'اسم المبادرة أو المشروع المجتمعي', question_type: 'text', is_required: 1 },
      { label: 'الفئة المستفيدة من المبادرة', question_type: 'select', options: 'طلبة المدارس\nالمجتمع المحلي في الرمادي\nدور الرعاية والمسنين\nالمزارعين وأصحاب المشاريع', is_required: 1 },
      { label: 'شرح خطة التنفيذ والمدة الزمنية', question_type: 'textarea', is_required: 1 },
      { label: 'جدول الاحتياجات والأوليات (PDF)', question_type: 'file', is_required: 0 }
    ]
  },
  {
    title: 'استمارة الدورات التدريبية وورش العمل التخصصية',
    description: 'تسجيل الدورات المقترحة لبرنامج التعليم المستمر للفصل الدراسي الثاني',
    header_color: '#701a75',
    bg_color: '#fdf4ff',
    font_family: 'cairo',
    questions: [
      { label: 'عنوان الدورة أو ورشة العمل', question_type: 'text', is_required: 1 },
      { label: 'نوع النشاط ومكانه', question_type: 'select', options: 'دورة حضورية في مركز الحاسبة\nورشة عمل إلكترونية عبر Meet\nتدريب ميداني في المختبرات', is_required: 1 },
      { label: 'المنهاج التفصيلي للدورة', question_type: 'textarea', is_required: 1 },
      { label: 'الحقيبة التدريبية أو المنهاج (PDF)', question_type: 'file', is_required: 0 }
    ]
  }
];

const colleges = [
  'كلية علوم الحاسوب وتكنولوجيا المعلومات',
  'كلية الهندسة',
  'كلية العلوم',
  'كلية الطب',
  'كلية الإدارة والاقتصاد',
  'كلية الآداب',
  'مركز الدراسات الاستراتيجية',
  'مركز بحوث الطاقة المتجددة'
];

const samplePersons = [
  'أحمد عبد الرحيم محمد', 'عمر فاروق الشمري', 'سيف الدين طارق الدليمي', 'مريم خالد الجميلي',
  'فاطمة عبد الرزاق الراوي', 'ياسين خليل إبراهيم', 'بلال قتيبة العسافي', 'نور الهدى حميد العاني',
  'زيد عمار الحديثي', 'حسين عليوي الكبيسي', 'مصطفى قاسم الفهداوي', 'سارة منير عبد اللطيف',
  'مهند نايف مطر', 'رنا صبحي الزوبعي', 'ماجد رياض الدليمي', 'هند صفاء التميمي',
  'عثمان فؤاد الجبوري', 'يحيى فاضل المشهداني', 'عائشة نوري البصام', 'إسماعيل حازم المحمدي',
  'هدى كنعان العبيدي', 'ضرار مروان الراوي', 'أثير عصام السامرائي', 'سنان موفق العاني',
  'بشائر ضياء القيسي', 'إيلاف شاكر الدليمي', 'يوسف طلال النعيمي', 'غيث بشار الحيالي',
  'تقى مؤيد الهاشمي', 'صلاح حاتم الفهداوي'
];

const formIds = [];

for (let fi = 0; fi < formsDefinitions.length; fi++) {
  const fDef = formsDefinitions[fi];
  const formId = uuidv4();
  const shortCode = 'test' + (fi + 1);

  // Insert form
  db.prepare(`
    INSERT INTO forms (id, title, description, short_code, header_color, bg_color, font_family, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(formId, fDef.title, fDef.description, shortCode, fDef.header_color, fDef.bg_color, fDef.font_family);

  // Insert questions
  let qIdx = 1;
  const createdQuestions = [];
  for (const q of fDef.questions) {
    const qId = uuidv4();
    db.prepare(`
      INSERT INTO form_questions (id, form_id, label, question_type, options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(qId, formId, q.label, q.question_type, q.options || '', q.is_required, qIdx++);
    createdQuestions.push(q);
  }

  console.log(`📋 تم إنشاء الاستمارة (${fi + 1}): "${fDef.title}" مع الرابط المختصر: /s/${shortCode}`);

  // 3. Insert 30 realistic submissions for this form
  for (let s = 0; s < 30; s++) {
    const subId = uuidv4();
    const personName = samplePersons[s % samplePersons.length] + (s >= samplePersons.length ? ` (${s})` : '');
    const college = colleges[s % colleges.length];
    const email = `user${fi + 1}_${s + 1}@uoanbar.edu.iq`;
    const phone = `0780${Math.floor(1000000 + Math.random() * 9000000)}`;

    const answers = {};
    if (fi === 0) {
      answers[createdQuestions[0].label] = `دراسة تحليلية حول ${createdQuestions[1].options.split('\n')[s % 4]} في البيئة الجامعية (#${s + 1})`;
      answers[createdQuestions[1].label] = createdQuestions[1].options.split('\n')[s % 4];
      answers[createdQuestions[2].label] = `يهدف هذا البحث إلى استكشاف وتطوير آليات عملية لتطبيق معايير التنمية المستدامة، مع تقديم دراسة حالة تفصيلية مبنية على مؤشرات رقمية دقيقة واستبيانات ميدانية.`;
      answers[createdQuestions[3].label] = `https://drive.google.com/file/d/mock_pdf_research_${s + 1}/view`;
    } else if (fi === 1) {
      answers[createdQuestions[0].label] = `مبادرة تكامل: لخدمة ${createdQuestions[1].options.split('\n')[s % 4]} (#${s + 1})`;
      answers[createdQuestions[1].label] = createdQuestions[1].options.split('\n')[s % 4];
      answers[createdQuestions[2].label] = `خطة عمل متكاملة تتضمن زيارات دورية، تنظيم حملات توعوية، وورش عمل تثقيفية بمشاركة فرق تطوعية من تدريسيي وطلبة الكلية خلال شهرين.`;
      answers[createdQuestions[3].label] = `https://drive.google.com/file/d/mock_pdf_community_${s + 1}/view`;
    } else {
      answers[createdQuestions[0].label] = `البرنامج المتقدم في المهارات التخصصية - ورشة رقم (${s + 1})`;
      answers[createdQuestions[1].label] = createdQuestions[1].options.split('\n')[s % 3];
      answers[createdQuestions[2].label] = `منهاج عملي مكثف يمتد لمدة 5 أيام بواقع 15 ساعة تدريبية، يتضمن تطبيقات برمجية، اختبارات تقييمية، ومنح شهادات مشاركة معتمدة للمشاركين.`;
      answers[createdQuestions[3].label] = `https://drive.google.com/file/d/mock_pdf_course_${s + 1}/view`;
    }

    db.prepare(`
      INSERT INTO form_submissions (id, form_id, respondent_name, respondent_email, respondent_org, respondent_phone, answers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(subId, formId, personName, email, college, phone, JSON.stringify(answers));
  }

  console.log(`  ✅ تم ملء وتوليد 30 نموذج رد واقعي للاستمارة (${fi + 1}) بنجاح`);
  formIds.push({ formId, title: fDef.title, shortCode });
}

// 4. Convert Submissions of Form 1 into Activities (To simulate Manager moving them to Voting Board)
console.log('\n🗳️ محاكاة سحب ردود الاستمارة الأولى كأنشطة للتصويت...');
const form1Subs = db.prepare('SELECT * FROM form_submissions WHERE form_id = ?').all(formIds[0].formId);

let seqNum = 1;
const createdActivityIds = [];

for (const sub of form1Subs) {
  const actId = uuidv4();
  const answers = JSON.parse(sub.answers_json);
  const actName = answers['عنوان البحث أو الورقة العلمية'] || `بحث علمي - ${sub.full_name}`;
  const actType = answers['المحور التنموي المستهدف'] || 'بحث علمي';
  const idea = answers['مستخلص الفكرة وأهم النتائج المتوقعة'] || '';
  const attach = answers['المرفق العلمي أو التقرير الأولي (PDF)'] || '';

  db.prepare(`
    INSERT INTO activities (id, seq, name, type, idea, team_leader, affiliation, team_members, specializations, attachment, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    actId,
    String(seqNum++),
    actName,
    actType,
    idea,
    sub.full_name,
    sub.affiliation,
    'فريق عمل مشترك',
    actType,
    attach,
    sub.answers_json
  );
  createdActivityIds.push(actId);
}
console.log(`✅ تم ترحيل ${createdActivityIds.length} نشاط إلى جدول الأنشطة والتصويت الرسمي`);

// 5. Open Voting Session in Settings
db.prepare('UPDATE settings SET voting_open = 1 WHERE id = 1').run();
console.log('🔓 تم فتح جلسة التصويت رسميًا');

// 6. Simulate Voting Across the 4 Committee Members with All Scenarios:
// Member 1 (أ.د. حامد): Voted on ALL 30 activities (100% completed)
// Member 2 (د. يوسف): Voted on 25 activities (Partial - nearly done)
// Member 3 (م.د. لمياء): Voted on 12 activities (Partial - halfway)
// Member 4 (أ.م.د. علي): Voted on 4 activities (Just started)

console.log('\n📊 محاكاة تصويت أعضاء اللجنة الـ 4 بحالات مختلفة...');

const votingPlans = [
  { voterId: voterIds[0], voterName: voters[0].name, count: 30 },
  { voterId: voterIds[1], voterName: voters[1].name, count: 25 },
  { voterId: voterIds[2], voterName: voters[2].name, count: 12 },
  { voterId: voterIds[3], voterName: voters[3].name, count: 4 }
];

let totalVotesCasted = 0;

for (const plan of votingPlans) {
  for (let i = 0; i < plan.count; i++) {
    const actId = createdActivityIds[i];
    // Realistic voting: 80% approve, 20% reject with reasons
    const isApprove = (i % 5 !== 0);
    const voteType = isApprove ? 'approve' : 'reject';
    const reason = isApprove ? '' : (i % 2 === 0 ? 'يحتاج البحث إلى تحديث المراجع وتوضيح منهجية العينة' : 'الفكرة مكررة وتحتاج إلى توسيع الجانب التطبيقي الميداني');

    db.prepare(`
      INSERT OR REPLACE INTO votes (id, activity_id, user_id, vote, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), actId, plan.voterId, voteType, reason);
    totalVotesCasted++;
  }
  const pct = Math.round((plan.count / 30) * 100);
  console.log(`  🗳️ العضو [${plan.voterName}]: صوّت على (${plan.count} من 30 نشاط) - نسبة الإنجاز: ${pct}%`);
}

console.log(`\n🎉 اكتملت التجربة بنجاح باهر! إجمالي التصويتات المسجلة: ${totalVotesCasted}`);
console.log('بيانات دخول الأعضاء المصوتين (كلمة المرور للجميع: 123456):');
voters.forEach(v => console.log(`- ${v.name} -> اسم المستخدم: ${v.username}`));
