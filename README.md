# 🏛️ نظام إدارة الأنشطة والتصويت

منظومة متكاملة لإدارة الأنشطة والتصويت عليها بباك إند Node.js وقاعدة بيانات MySQL.

---

## 📁 هيكل المشروع

```
project/
├── frontend/
│   ├── index.html          ← صفحة التطبيق الرئيسية
│   ├── css/style.css       ← جميع الأنماط
│   └── js/
│       ├── api.js          ← الاتصال بالسيرفر
│       ├── ui.js           ← أدوات الواجهة
│       ├── activities.js   ← إدارة الأنشطة والتصويت
│       ├── auth.js         ← تسجيل الدخول
│       └── app.js          ← تشغيل التطبيق
│
├── backend/
│   ├── server.js           ← نقطة البداية
│   ├── config/db.js        ← اتصال MySQL
│   ├── routes/             ← مسارات API
│   ├── controllers/        ← منطق العمل
│   ├── middleware/         ← حماية وصلاحيات
│   └── utils/              ← أدوات مساعدة
│
├── database/schema.sql     ← جداول قاعدة البيانات
├── .env                    ← الإعدادات
└── package.json
```

---

## ⚡ خطوات التشغيل

### 1. متطلبات النظام
- **Node.js** v18 أو أحدث → https://nodejs.org
- **MySQL** v8 أو أحدث → https://mysql.com

---

### 2. إعداد قاعدة البيانات

افتح MySQL وشغّل:
```sql
SOURCE /path/to/project/database/schema.sql;
```

أو استخدم سكريبت الإعداد التلقائي (بعد الخطوة 3):
```bash
npm run setup-db
```

---

### 3. تثبيت الحزم

```bash
cd project
npm install
```

---

### 4. إعداد ملف `.env`

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=كلمة_مرور_MySQL
DB_NAME=voting_system

JWT_SECRET=اكتب_هنا_نص_عشوائي_طويل_وآمن
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5000
```

---

### 5. تشغيل السيرفر

```bash
# وضع التطوير (مع إعادة تشغيل تلقائي)
npm run dev

# وضع الإنتاج
npm start
```

افتح المتصفح: **http://localhost:5000**

---

## 🔐 بيانات الدخول الافتراضية

| الحقل | القيمة |
|-------|--------|
| اسم المستخدم | `admin` |
| كلمة المرور | `admin123` |

> ⚠️ **غيّر كلمة المرور فور تسجيل الدخول** من صفحة الإعدادات

---

## 🌐 API Endpoints

### المصادقة
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/login` | تسجيل الدخول |
| GET | `/api/auth/me` | بيانات المستخدم الحالي |
| POST | `/api/auth/change-password` | تغيير كلمة المرور |

### الأنشطة
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/activities` | جلب جميع الأنشطة مع حالة التصويت |
| POST | `/api/activities` | إضافة نشاط (مدير) |
| POST | `/api/activities/bulk` | استيراد من Excel (مدير) |
| PUT | `/api/activities/:id` | تعديل نشاط (مدير) |
| DELETE | `/api/activities/:id` | حذف نشاط (مدير) |
| DELETE | `/api/activities/reset-all` | تصفير الأنشطة (مدير) |
| DELETE | `/api/activities/reset-votes` | تصفير التصويتات فقط (مدير) |
| GET | `/api/activities/settings` | إعدادات النظام |
| PUT | `/api/activities/settings` | حفظ الإعدادات (مدير) |

### المستخدمون
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/users` | جلب الأعضاء (مدير) |
| POST | `/api/users` | إضافة عضو (مدير) |
| PUT | `/api/users/:id` | تعديل عضو (مدير) |
| PATCH | `/api/users/:id/toggle` | تفعيل/تعطيل (مدير) |
| DELETE | `/api/users/:id` | حذف عضو (مدير) |

### التصويتات
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/votes` | جلب التصويتات |
| POST | `/api/votes` | تسجيل تصويت |
| PUT | `/api/votes/:id` | تعديل تصويت |

---

## 🚀 الرفع على الإنترنت

### خيار 1: Railway (مجاني ومريح)
1. أنشئ حساباً على https://railway.app
2. ارفع المشروع على GitHub
3. اربط المستودع بـ Railway
4. أضف MySQL من لوحة Railway
5. أضف متغيرات البيئة من `.env`

### خيار 2: VPS (خادم خاص)
```bash
# على السيرفر
git clone <your-repo>
cd project
npm install --production
npm run setup-db

# باستخدام PM2
npm install -g pm2
pm2 start backend/server.js --name voting-system
pm2 save && pm2 startup
```

### خيار 3: Render.com
1. ارفع على GitHub
2. أنشئ Web Service على Render
3. أضف MySQL من Add-ons
4. أضف متغيرات البيئة

---

## 🛡️ الأمان

- كلمات المرور مشفرة بـ **bcrypt**
- المصادقة بـ **JWT tokens**
- حماية من **Rate Limiting** (200 طلب/15 دقيقة، 20 محاولة دخول/15 دقيقة)
- التحقق من الصلاحيات في كل endpoint
- منع حذف حساب المدير الرئيسي

---

## 📋 ملاحظات Excel

**الأعمدة المعتمدة تلقائياً:**
- `ت` — رقم التسلسل
- `اسم النشاط` — اسم النشاط
- `نوع النشاط` — نوع النشاط
- `اسم رئيس الفريق` — رئيس الفريق
- `اسم التشكيل / جهة الانتساب` — الجهة
- `أعضاء الفريق` — أعضاء الفريق
- `الملف المرفق` — رابط الملف

أي أعمدة إضافية تظهر تلقائياً في بطاقة النشاط.

---

## 📞 الدعم

في حال أي مشكلة، تحقق من:
1. `console` في المتصفح
2. سجلات السيرفر في الطرفية
3. إعدادات `.env`
4. اتصال قاعدة البيانات
