// backend/utils/setupDb.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
  let conn;

  try {
    console.log('📌 بيانات الاتصال:');
    console.log('HOST:', process.env.DB_HOST);
    console.log('PORT:', process.env.DB_PORT);
    console.log('USER:', process.env.DB_USER);
    console.log('DB:', process.env.DB_NAME);

    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
      charset: 'utf8mb4'
    });

    console.log('✅ تم الاتصال بـ MySQL');

    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await conn.query(sql);

    console.log('✅ تم إنشاء قاعدة البيانات والجداول بنجاح');

  } catch (err) {
    console.error('❌ خطأ كامل:');
    console.error(err);
  } finally {
    if (conn) await conn.end();
  }
}

setup();
