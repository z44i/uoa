/**
 * ==============================================================
 * كود مزامنة نظام إدارة الأنشطة مع Google Drive & Google Sheets
 * جامعة الانبار - وحدة التنمية المستدامة
 * ==============================================================
 * 
 * الميزات المبرمجة تلقائياً:
 * 1. ينشئ مجلداً رئيسياً في Google Drive باسم "مرفقات أنشطة جامعة الانبار".
 * 2. لكل استمارة: ينشئ مجلداً فرعياً داخل المجلد الرئيسي يحمل "اسم الاستمارة" تلقائياً.
 * 3. لكل ملف مرفوع: يعيد تسمية الملف باسم النشاط أو اسم صاحب النشاط (مثلاً: "مبادرة تشجير_أحمد محمد.pdf")، ويخزنه داخل مجلد الاستمارة المخصص له.
 * 4. يمنح الملف صلاحية القراءة بموجب الرابط ويعيد رابطه المباشر لفتحه من داخل النظام فوراً.
 * 5. يدون كافة إجابات الاستمارة في جدول Google Sheets للتوثيق الإداري.
 * 
 * --------------------------------------------------------------
 * خطوات التثبيت (تُنفذ مرة واحدة فقط لدقيقتين):
 * 1. افتح Google Drive وأنشئ جدول بيانات جديد (Google Sheets).
 * 2. من القائمة العلوية داخل الجدول: (ملحقات Extensions -> Apps Script).
 * 3. احذف أي كود مكتوب والصق هذا الكود بالكامل مكانه.
 * 4. اضغط على زر "نشر" (Deploy) بالأعلى -> ثم "نشر جديد" (New deployment).
 * 5. اضغط على الترس (Select type) واختر: "تطبيق ويب" (Web app).
 * 6. اضبط الإعدادات:
 *    - الوصف: مزامنة الأنشطة والمرفقات
 *    - Execute as: Me (حسابي)
 *    - Who has access: Anyone (أي شخص)
 * 7. اضغط Deploy ووافق على الصلاحيات، ثم انسخ رابط الويب الناتج (Web app URL).
 * 8. ضعه في حقل Webhook داخل الاستمارة في النظام.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var formTitle = data.formTitle || "استمارة عامة";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 1. إنشاء المجلد الرئيسي للنظام في Google Drive
    var mainFolderName = "مرفقات أنشطة جامعة الانبار";
    var mainFolders = DriveApp.getFoldersByName(mainFolderName);
    var mainFolder;
    if (mainFolders.hasNext()) {
      mainFolder = mainFolders.next();
    } else {
      mainFolder = DriveApp.createFolder(mainFolderName);
    }

    // 2. إنشاء أو جلب المجلد الفرعي الخاص بهذه الاستمارة بالتحديد
    var formFolder;
    var subFolders = mainFolder.getFoldersByName(formTitle);
    if (subFolders.hasNext()) {
      formFolder = subFolders.next();
    } else {
      formFolder = mainFolder.createFolder(formTitle);
    }

    var driveFileUrl = "";

    // 3. تخزين وإعادة تسمية الملف المرفوع باسم النشاط / صاحب النشاط
    if (data.fileBase64 && data.fileName) {
      var extension = "";
      var dotIdx = data.fileName.lastIndexOf(".");
      if (dotIdx !== -1) {
        extension = data.fileName.substring(dotIdx);
      }

      // تحديد الاسم المنظم للملف
      var customFileName = "";
      if (data.activityName) {
        customFileName = data.activityName.replace(/[\/\\?%*:|"<>]/g, "-") + extension;
      } else {
        customFileName = data.fileName;
      }

      var decodedBytes = Utilities.base64Decode(data.fileBase64);
      var blob = Utilities.newBlob(decodedBytes, data.fileMimeType || "application/octet-stream", customFileName);
      var driveFile = formFolder.createFile(blob);
      
      // تعيين الصلاحية لفتحه مباشرة من قبل أعضاء اللجنة
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFileUrl = driveFile.getUrl();
    }

    // 4. توثيق الاستجابة داخل جدول Sheets
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["تاريخ التقديم", "اسم الاستمارة", "الإجابات", "رابط المرفق في Google Drive"]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    }

    var timestamp = Utilities.formatDate(new Date(), "Asia/Baghdad", "yyyy-MM-dd HH:mm:ss");
    var answersSummary = JSON.stringify(data.answers || {});

    sheet.appendRow([
      timestamp,
      formTitle,
      answersSummary,
      driveFileUrl
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "تم حفظ الملف بنجاح في مجلد الاستمارة باسم النشاط",
      driveUrl: driveFileUrl,
      folderName: formTitle
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
