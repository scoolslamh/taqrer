/**
 * =========================================================
 * نظام تقارير الأمن والسلامة المدرسية
 * المرحلة الثانية:
 * - البحث عن المدرسة
 * - عرض بيانات المدرسة
 * - تحديث البيانات المسموح بها
 * =========================================================
 */

const CONFIG = {
  SCHOOLS_SHEET: 'Schools',

  // تقرير خطة الإخلاء
  REPORTS_SHEET: 'Reports',

  // تقارير لحظة سلامة
  SAFETY_MOMENT_SHEET: 'SafetyMomentReports',

  // تقارير اليوم العالمي للدفاع المدني
  CIVIL_DEFENSE_SHEET: 'CivilDefenseReports',

  // المجلد الرئيسي لجميع تقارير المدارس
  ROOT_FOLDER_ID: '1utXEAxBB4ty5CxmhJeVKGWA3DiLywpvK',

  // تقارير أسبوع المرور
  TRAFFIC_WEEK_SHEET: 'TrafficWeekReports',
  // إعدادات مؤشر الإنجاز
  SETTINGS_SHEET: 'Settings',

  SUPERVISORS_SHEET: 'Supervisors',
};


/**
 * =========================================================
 * GET
 * =========================================================
 *
 * ?action=getSchool&number=M3961854
 */
function doGet(e) {
  try {

    const action = String(
      e?.parameter?.action || ''
    ).trim();

    if (action === 'getSchool') {
      return getSchoolByNumber(e);
    }

    if (action === 'getSchoolDashboard') {
      return getSchoolDashboard(e);
    }

    if (action === 'getReports') {
      return getSchoolReports(e);
    }
    if (action === 'getAchievement') {
      return getSchoolAchievement(e);
    }
    if (action === 'getSupervisorSchools') {
      return getSupervisorSchools(e);
    }
    if (action === 'getAdminDashboard') {
      return getAdminDashboard(e);
    }
    return jsonResponse({
      success: false,
      error: 'INVALID_ACTION',
      message: 'الطلب غير معروف.'
    });

  } catch (error) {

    console.error('doGet Error:', error);

    return jsonResponse({
      success: false,
      error: 'SERVER_ERROR',
      message: 'حدث خطأ في الخادم.'
    });
  }
}


/**
 * =========================================================
 * POST
 * =========================================================
 *
 * يستخدم حاليًا لتحديث بيانات المدرسة.
 */
function doPost(e) {
  try {

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'EMPTY_REQUEST',
        message: 'لم يتم إرسال بيانات.'
      });
    }

    const data = JSON.parse(
      e.postData.contents
    );

    const action = String(
      data.action || ''
    ).trim();
    /*
 * تسجيل دخول المشرف / المدير
 */
    if (action === 'supervisorLogin') {
       return supervisorLogin(data);
    }
    if (action === 'updateSchool') {
      return updateSchool(data);
    }

    if (action === 'uploadEvacuationReport') {
      return uploadEvacuationReport(data);
    }
    if (action === 'uploadSafetyMomentReport') {
      return uploadSafetyMomentReport(data);
    }
    if (action === 'uploadCivilDefenseReport') {
      return uploadCivilDefenseReport(data);
    }
    if (action === 'uploadTrafficWeekReport') {
      return uploadTrafficWeekReport(data);
    }
    return jsonResponse({
      success: false,
      error: 'INVALID_ACTION',
      message: 'الطلب غير معروف.'
    });

  } catch (error) {

    console.error('doPost Error:', error);

    return jsonResponse({
      success: false,
      error: 'SERVER_ERROR',
      message: 'حدث خطأ أثناء معالجة الطلب.'
    });
  }
}


/**
 * =========================================================
 * البحث عن المدرسة
 * =========================================================
 */
function getSchoolByNumber(e) {

  const inputNumber =
    normalizeSchoolNumber(
      e?.parameter?.number
    );

  if (!inputNumber) {
    return jsonResponse({
      success: false,
      error: 'NUMBER_REQUIRED',
      message: 'يرجى إدخال الرقم الإحصائي أو الوزاري.'
    });
  }

  const result =
    findSchoolByNumber(inputNumber);

  if (!result) {
    return jsonResponse({
      success: false,
      error: 'SCHOOL_NOT_FOUND',
      message: 'الرقم الإحصائي أو الوزاري غير موجود.'
    });
  }

  const status =
    String(
      result.school['حالة المدرسة'] || ''
    ).trim();

  if (
    status &&
    status !== 'نشطة' &&
    status !== 'نشط'
  ) {
    return jsonResponse({
      success: false,
      error: 'SCHOOL_INACTIVE',
      message: 'المدرسة غير نشطة في النظام.'
    });
  }

  return jsonResponse({
    success: true,
    message: 'تم العثور على المدرسة.',
    data: buildSchoolResponse(
      result.school,
      result.rowNumber,
      inputNumber
    )
  });
}


/**
 * تحميل بيانات بوابة المدرسة في طلب واحد:
 * بيانات المدرسة + السجل + مؤشر الإنجاز.
 */
function getSchoolDashboard(e) {

  const startedAt = Date.now();

  try {

    const loginNumber =
      normalizeSchoolNumber(
        e?.parameter?.number
      );

    if (!loginNumber) {
      return jsonResponse({
        success: false,
        error: 'NUMBER_REQUIRED',
        message:
          'يرجى إدخال الرقم الإحصائي أو الوزاري.'
      });
    }

    const schoolResult =
      findSchoolByNumber(loginNumber);

    if (!schoolResult) {
      return jsonResponse({
        success: false,
        error: 'SCHOOL_NOT_FOUND',
        message:
          'لم يتم العثور على المدرسة.'
      });
    }

    const school = schoolResult.school;
    const status = String(
      school['حالة المدرسة'] || ''
    ).trim();

    if (
      status &&
      status !== 'نشطة' &&
      status !== 'نشط'
    ) {
      return jsonResponse({
        success: false,
        error: 'SCHOOL_INACTIVE',
        message:
          'المدرسة غير نشطة في النظام.'
      });
    }

    const schoolReadAt = Date.now();
    const achievementContext =
      buildAchievementContext({
        includeSourceValues: true
      });
    const contextBuiltAt = Date.now();

    const achievement =
      calculateSchoolAchievementFromContext(
        school,
        achievementContext,
        loginNumber
      );

    const reports =
      buildSchoolReportsFromContext(
        school,
        loginNumber,
        achievementContext
      );

    const completedAt = Date.now();

    console.log(
      'getSchoolDashboard performance',
      JSON.stringify({
        reportCount: reports.length,
        reportRowCount:
          achievementContext.reportRowCount,
        schoolReadMs:
          schoolReadAt - startedAt,
        buildAchievementContextMs:
          contextBuiltAt - schoolReadAt,
        calculateAndAggregateMs:
          completedAt - contextBuiltAt,
        totalMs:
          completedAt - startedAt
      })
    );

    return jsonResponse({
      success: true,
      data: {
        school: buildSchoolResponse(
          school,
          schoolResult.rowNumber,
          loginNumber
        ),
        reports: reports,
        achievement: achievement
      }
    });

  } catch (error) {

    console.error(
      'getSchoolDashboard Error:',
      error
    );

    return jsonResponse({
      success: false,
      error: 'GET_SCHOOL_DASHBOARD_FAILED',
      message:
        'تعذر تحميل بيانات المدرسة حاليًا.'
    });
  }
}


/**
 * تحديث بيانات المدرسة. لا يقبل تعديل الحقول
 * التعريفية أو حالة المدرسة أو Folder_ID.
 */
function updateSchool(data) {

  const loginNumber =
    normalizeSchoolNumber(
      data.loginNumber
    );

  if (!loginNumber) {
    return jsonResponse({
      success: false,
      error: 'NUMBER_REQUIRED',
      message: 'تعذر التحقق من المدرسة.'
    });
  }


  /*
   * نبحث عن المدرسة مرة أخرى
   * ولا نعتمد على rowNumber القادم من المتصفح.
   */
  const result =
    findSchoolByNumber(loginNumber);

  if (!result) {
    return jsonResponse({
      success: false,
      error: 'SCHOOL_NOT_FOUND',
      message: 'تعذر العثور على المدرسة.'
    });
  }


  const status =
    String(
      result.school['حالة المدرسة'] || ''
    ).trim();

  if (
    status &&
    status !== 'نشطة' &&
    status !== 'نشط'
  ) {
    return jsonResponse({
      success: false,
      error: 'SCHOOL_INACTIVE',
      message: 'المدرسة غير نشطة في النظام.'
    });
  }


  /*
   * تنظيف البيانات.
   */
  const city =
    sanitizeText(data.city, 100);

  const principalName =
    sanitizeText(
      data.principalName,
      150
    );

  const principalPhone =
    normalizeSaudiPhone(
      data.principalPhone
    );

  const coordinatorName =
    sanitizeText(
      data.coordinatorName,
      150
    );

  const coordinatorPhone =
    normalizeSaudiPhone(
      data.coordinatorPhone
    );

  const staffType =
    sanitizeText(
      data.staffType,
      20
    );


  /*
   * التحقق من الكادر.
   */
  if (
    staffType &&
    ![
      'تعليمي',
      'إداري'
    ].includes(staffType)
  ) {
    return jsonResponse({
      success: false,
      error: 'INVALID_STAFF_TYPE',
      message: 'يرجى اختيار نوع الكادر بشكل صحيح.'
    });
  }


  /*
   * التحقق من أرقام الجوال
   * إذا تمت تعبئتها.
   */
  if (
    principalPhone &&
    !isValidSaudiPhone(principalPhone)
  ) {
    return jsonResponse({
      success: false,
      error: 'INVALID_PRINCIPAL_PHONE',
      message: 'رقم جوال مدير المدرسة غير صحيح.'
    });
  }


  if (
    coordinatorPhone &&
    !isValidSaudiPhone(coordinatorPhone)
  ) {
    return jsonResponse({
      success: false,
      error: 'INVALID_COORDINATOR_PHONE',
      message: 'رقم جوال منسق الأمن والسلامة غير صحيح.'
    });
  }


  const sheet =
    getSchoolsSheet();

  const headers =
    Array.isArray(result.headers)
      ? result.headers
      : getHeaders(sheet);


  /*
   * الحقول الوحيدة المسموح
   * بتعديلها من واجهة المدرسة.
   */
  const updates = {
    'المدينة': city,
    'اسم مدير المدرسة': principalName,
    'جوال مدير المدرسة': principalPhone,
    'اسم منسق الأمن والسلامة': coordinatorName,
    'جوال منسق الأمن والسلامة': coordinatorPhone,
    'الكادر': staffType,
    'آخر تحديث للبيانات': new Date()
  };


  /*
   * التأكد من أن الأعمدة موجودة
   * ثم تحديث الخلايا المحددة فقط.
   */
  const indexedUpdates =
    Object.entries(updates)
      .map(([headerName, value]) => {

        const columnIndex =
          headers.indexOf(headerName);

        if (columnIndex === -1) {
          throw new Error(
            `العمود غير موجود: ${headerName}`
          );
        }

        return {
          columnIndex: columnIndex,
          value: value
        };
      })
      .sort(
        (a, b) =>
          a.columnIndex - b.columnIndex
      );

  const updateGroups = [];

  indexedUpdates.forEach(update => {

    const currentGroup =
      updateGroups[updateGroups.length - 1];

    if (
      currentGroup &&
      update.columnIndex ===
        currentGroup.startColumnIndex +
        currentGroup.values.length
    ) {
      currentGroup.values.push(update.value);
      return;
    }

    updateGroups.push({
      startColumnIndex: update.columnIndex,
      values: [update.value]
    });
  });

  updateGroups.forEach(group => {
    sheet
      .getRange(
        result.rowNumber,
        group.startColumnIndex + 1,
        1,
        group.values.length
      )
      .setValues([group.values]);
  });

  const updatedSchool = Object.assign(
    {},
    result.school,
    updates
  );


  return jsonResponse({
    success: true,
    message: 'تم حفظ بيانات المدرسة بنجاح.',
    data: buildSchoolResponse(
      updatedSchool,
      result.rowNumber,
      loginNumber
    )
  });
}


/**
 * =========================================================
 * البحث الداخلي عن المدرسة
 * =========================================================
 */
function findSchoolByNumber(number) {

  const inputNumber =
    normalizeSchoolNumber(number);

  if (!inputNumber) {
    return null;
  }

  const sheet =
    getSchoolsSheet();

  const values =
    sheet
      .getDataRange()
      .getDisplayValues();

  if (values.length < 2) {
    return null;
  }

  const headers =
    values[0].map(
      header =>
        String(header).trim()
    );

  const requiredHeaders = [
    'الأرقام الإحصائية',
    'اسم المدرسة',
    'المحافظة'
  ];

  requiredHeaders.forEach(
    header => {

      if (!headers.includes(header)) {
        throw new Error(
          `العمود المطلوب غير موجود: ${header}`
        );
      }
    }
  );

  const numbersIndex =
    headers.indexOf(
      'الأرقام الإحصائية'
    );


  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {

    const row =
      values[rowIndex];

    const schoolNumbers =
      extractSchoolNumbers(
        row[numbersIndex]
      );

    if (
      schoolNumbers.includes(
        inputNumber
      )
    ) {

      const school = {};

      headers.forEach(
        (header, index) => {

          if (header) {
            school[header] =
              row[index] || '';
          }
        }
      );

      return {
        rowNumber:
          rowIndex + 1,

        school: school,

        headers: headers
      };
    }
  }

  return null;
}


/**
 * =========================================================
 * تجهيز بيانات المدرسة للواجهة
 * =========================================================
 */
function buildSchoolResponse(
  school,
  rowNumber,
  loginNumber
) {

  return {

    rowNumber:
      rowNumber,

    loginNumber:
      loginNumber,

    statisticalNumbers:
      school[
        'الأرقام الإحصائية'
      ] || '',

    schoolName:
      school[
        'اسم المدرسة'
      ] || '',

    governorate:
      school[
        'المحافظة'
      ] || '',

    city:
      school[
        'المدينة'
      ] || '',

    principalName:
      school[
        'اسم مدير المدرسة'
      ] || '',

    principalPhone:
      school[
        'جوال مدير المدرسة'
      ] || '',

    coordinatorName:
      school[
        'اسم منسق الأمن والسلامة'
      ] || '',

    coordinatorPhone:
      school[
        'جوال منسق الأمن والسلامة'
      ] || '',

    staffType:
      school[
        'الكادر'
      ] || '',

    status:
      school[
        'حالة المدرسة'
      ] || '',

    folderId:
      school[
        'Folder_ID'
      ] || '',

    folderCreatedAt:
      school[
        'تاريخ إنشاء المجلد'
      ] || '',

    lastUpdated:
      school[
        'آخر تحديث للبيانات'
      ] || ''
  };
}


/**
 * =========================================================
 * ورقة المدارس
 * =========================================================
 */
function getSchoolsSheet() {

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SCHOOLS_SHEET
    );

  if (!sheet) {
    throw new Error(
      `لم يتم العثور على ورقة باسم ${CONFIG.SCHOOLS_SHEET}`
    );
  }

  return sheet;
}
/**
 * =========================================================
 * ورقة المشرفين
 * =========================================================
 */
function getSupervisorsSheet() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SUPERVISORS_SHEET
    );

  if (!sheet) {
    throw new Error(
      `لم يتم العثور على ورقة باسم ${CONFIG.SUPERVISORS_SHEET}`
    );
  }

  return sheet;
}


/**
 * =========================================================
 * توحيد والتحقق من السجل المدني
 * =========================================================
 */
function normalizeNationalId(value) {

  const nationalId =
    convertArabicDigitsToEnglish(
      String(value || '')
    )
      .replace(/\D/g, '')
      .trim();

  if (!/^[12]\d{9}$/.test(nationalId)) {
    return '';
  }

  return nationalId;
}
/**
 * =========================================================
 * البحث عن مشرف / مدير بواسطة السجل المدني
 * =========================================================
 */
function findSupervisorByNationalId(nationalId) {

  const normalizedId =
    normalizeNationalId(nationalId);

  if (!normalizedId) {
    return null;
  }

  const sheet =
    getSupervisorsSheet();

  const values =
    sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return null;
  }

  const headers =
    values[0].map(header =>
      String(header).trim()
    );

  const nationalIdIndex =
    headers.indexOf('السجل المدني');

  if (nationalIdIndex === -1) {
    throw new Error(
      'العمود "السجل المدني" غير موجود في ورقة Supervisors.'
    );
  }

  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {

    const row = values[rowIndex];

    const rowNationalId =
      normalizeNationalId(
        row[nationalIdIndex]
      );

    if (
      rowNationalId &&
      rowNationalId === normalizedId
    ) {

      const supervisor = {};

      headers.forEach(
        (header, index) => {

          if (header) {
            supervisor[header] =
              row[index] || '';
          }

        }
      );

      return {
        supervisor: supervisor,
        rowNumber: rowIndex + 1,
        headers: headers
      };
    }
  }

  return null;
}
/**
 * =========================================================
 * تسجيل دخول المشرف / المدير
 * =========================================================
 */
function supervisorLogin(data) {

  try {

    const nationalId =
      normalizeNationalId(
        data?.nationalId
      );

    if (!nationalId) {
      return jsonResponse({
        success: false,
        error: 'INVALID_NATIONAL_ID',
        message:
          'يرجى إدخال سجل مدني صحيح.'
      });
    }

    const result =
      findSupervisorByNationalId(
        nationalId
      );

    if (!result) {
      return jsonResponse({
        success: false,
        error: 'USER_NOT_FOUND',
        message:
          'بيانات الدخول غير صحيحة.'
      });
    }

    const supervisor =
      result.supervisor;

    /*
     * التحقق من حالة الحساب
     */
    const status =
      String(
        supervisor['الحالة'] || ''
      ).trim();

    if (status !== 'نشط') {
      return jsonResponse({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message:
          'الحساب غير نشط، يرجى التواصل مع إدارة النظام.'
      });
    }

    /*
     * التحقق من الدور
     */
    const role =
      String(
        supervisor['الدور'] || ''
      ).trim();

    if (
      role !== 'مشرف' &&
      role !== 'مدير'
    ) {
      return jsonResponse({
        success: false,
        error: 'INVALID_ROLE',
        message:
          'صلاحية الحساب غير معروفة.'
      });
    }

    /*
     * تحديث آخر دخول
     */
    const sheet =
      getSupervisorsSheet();

    const headers =
      Array.isArray(result.headers)
        ? result.headers
        : [];

    const lastLoginIndex =
      headers.indexOf(
        'آخر دخول'
      );

    if (lastLoginIndex !== -1) {

      sheet
        .getRange(
          result.rowNumber,
          lastLoginIndex + 1
        )
        .setValue(
          new Date()
        );
    }

    /*
     * نجاح تسجيل الدخول
     */
    return jsonResponse({
      success: true,

      data: {

        supervisorId:
          supervisor['Supervisor_ID'] || '',

        nationalId:
          nationalId,

        name:
          supervisor['اسم المشرف'] || '',

        role:
          role,

        phone:
          supervisor['رقم الجوال'] || ''
      }
    });

  } catch (error) {

    console.error(
      'supervisorLogin Error:',
      error
    );

    return jsonResponse({
      success: false,
      error: 'LOGIN_ERROR',
      message:
        'تعذر تسجيل الدخول حاليًا.'
    });
  }
}
/**
 * =========================================================
 * جلب المدارس التابعة للمشرف
 * الربط عن طريق السجل المدني للمشرف
 * =========================================================
 */
function getSupervisorSchools(e) {

  const startedAt = Date.now();

  try {

    // السجل المدني القادم من الطلب
    const nationalId =
      normalizeNationalId(
        e &&
        e.parameter
          ? e.parameter.nationalId
          : ''
      );

    if (!nationalId) {
      return jsonResponse({
        success: false,
        error: 'INVALID_NATIONAL_ID',
        message: 'السجل المدني غير صحيح.'
      });
    }


    // ==========================================
    // التحقق من وجود المشرف
    // ==========================================

    const supervisorResult =
      findSupervisorByNationalId(
        nationalId
      );

    if (!supervisorResult) {
      return jsonResponse({
        success: false,
        error: 'SUPERVISOR_NOT_FOUND',
        message: 'لم يتم العثور على حساب المشرف.'
      });
    }

    // الدالة الحالية ترجع:
    // { supervisor, rowNumber }
    const supervisor =
      supervisorResult.supervisor;


    // ==========================================
    // التحقق من حالة الحساب
    // ==========================================

    const status =
      String(
        supervisor['الحالة'] || ''
      ).trim();

    if (status !== 'نشط') {
      return jsonResponse({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'حساب المشرف غير نشط.'
      });
    }


    // ==========================================
    // التحقق من الدور
    // ==========================================

    const role =
      String(
        supervisor['الدور'] || ''
      ).trim();

    if (role !== 'مشرف') {
      return jsonResponse({
        success: false,
        error: 'UNAUTHORIZED_ROLE',
        message: 'هذا الحساب ليس حساب مشرف.'
      });
    }


    // ==========================================
    // قراءة ورقة المدارس
    // ==========================================

    const sheet =
      getSchoolsSheet();

    const lastRow =
      sheet.getLastRow();

    const lastColumn =
      sheet.getLastColumn();

    const schoolValues =
      lastRow > 0 && lastColumn > 0
        ? sheet
            .getRange(
              1,
              1,
              lastRow,
              lastColumn
            )
            .getDisplayValues()
        : [];

    const headers =
      schoolValues.length > 0
        ? schoolValues[0].map(
            header =>
              String(header).trim()
          )
        : [];

    const supervisorNationalIdIndex =
      headers.indexOf(
        'السجل المدني للمشرف'
      );

    if (supervisorNationalIdIndex === -1) {
      throw new Error(
        'لم يتم العثور على عمود "السجل المدني للمشرف" في ورقة المدارس.'
      );
    }


    if (lastRow < 2) {
      return jsonResponse({
        success: true,
        data: {
          supervisor: {
            name:
              String(
                supervisor['اسم المشرف'] || ''
              ).trim(),

            nationalId:
              nationalId,

            role:
              role
          },

          totalSchools: 0,
          schools: []
        }
      });
    }


    // ==========================================
    // قراءة جميع المدارس مرة واحدة
    // ==========================================

    const rows =
      schoolValues.slice(1);

    const loadStartedAt = Date.now();

    const achievementContext =
      buildAchievementContext();

    const sheetsLoadedAt = Date.now();


    const schools = [];


    // ==========================================
    // البحث عن المدارس التابعة للمشرف
    // ==========================================

    rows.forEach(row => {

      const schoolSupervisorNationalId =
        normalizeNationalId(
          row[
            supervisorNationalIdIndex
          ]
        );

      if (
        schoolSupervisorNationalId !==
        nationalId
      ) {
        return;
      }


      // تحويل الصف إلى Object
      const school = {};

      headers.forEach(
        (header, index) => {

          if (header) {
            school[header] =
              row[index] || '';
          }

        }
      );


      // ========================================
      // جميع الأرقام الإحصائية للمدرسة
      // ========================================

      const schoolNumbers =
        extractSchoolNumbers(
          school['الأرقام الإحصائية'] || ''
        );


      /*
       * إذا كان الرقم المستخدم للدخول غير موجود
       * داخل حقل الأرقام الإحصائية نضيفه أيضًا.
       */
      const loginNumber =
        normalizeSchoolNumber(
          school['الرقم الإحصائي'] ||
          school['الرقم الإحصائي المستخدم'] ||
          ''
        );

      if (
        loginNumber &&
        !schoolNumbers.includes(loginNumber)
      ) {
        schoolNumbers.push(loginNumber);
      }

      // ========================================
        // حساب إنجاز المدرسة
        // ========================================

        const achievement =
          calculateSchoolAchievementFromContext(
            school,
            achievementContext,
            schoolNumbers[0]
          );
      // ========================================
      // إضافة المدرسة للنتيجة
      // ========================================

      schools.push({

        schoolName:
          String(
            school['اسم المدرسة'] || ''
          ).trim(),

        statisticalNumbers:
          schoolNumbers,

        governorate:
          String(
            school['المحافظة'] || ''
          ).trim(),

        city:
          String(
            school['المدينة'] || ''
          ).trim(),

        staffType:
          String(
            school['الكادر'] || ''
          ).trim(),

        schoolStatus:
        String(
           school['حالة المدرسة'] || ''
          ).trim(),

        achievement: achievement

      });

    });


    // ==========================================
    // ترتيب المدارس أبجديًا
    // ==========================================

    schools.sort(
      (a, b) =>
        a.schoolName.localeCompare(
          b.schoolName,
          'ar'
        )
    );

    const achievementsCalculatedAt =
      Date.now();

    console.log(
      'getSupervisorSchools performance',
      JSON.stringify({
        schoolCount: schools.length,
        reportRowCount:
          achievementContext.reportRowCount,
        loadSheetsMs:
          sheetsLoadedAt - loadStartedAt,
        calculateAchievementsMs:
          achievementsCalculatedAt -
          sheetsLoadedAt,
        totalMs:
          achievementsCalculatedAt -
          startedAt
      })
    );


    // ==========================================
    // النتيجة النهائية
    // ==========================================

    return jsonResponse({

      success: true,

      data: {

        supervisor: {

          supervisorId:
            String(
              supervisor[
                'Supervisor_ID'
              ] || ''
            ).trim(),

          name:
            String(
              supervisor[
                'اسم المشرف'
              ] || ''
            ).trim(),

          nationalId:
            nationalId,

          role:
            role
        },

        totalSchools:
          schools.length,

        schools:
          schools

      }

    });


  } catch (error) {

    console.error(
      'getSupervisorSchools Error:',
      error
    );

    return jsonResponse({

      success: false,

      error:
        'GET_SUPERVISOR_SCHOOLS_FAILED',

      message:
        'تعذر تحميل مدارس المشرف: ' +
        (
          error && error.message
            ? error.message
            : String(error)
        )

    });

  }
}
/**
 * =========================================================
 * رؤوس الأعمدة
 * =========================================================
 */
function getHeaders(sheet) {

  const lastColumn =
    sheet.getLastColumn();

  if (lastColumn < 1) {
    return [];
  }

  return sheet
    .getRange(
      1,
      1,
      1,
      lastColumn
    )
    .getDisplayValues()[0]
    .map(
      header =>
        String(header).trim()
    );
}


/**
 * =========================================================
 * استخراج معرفات المدرسة
 * =========================================================
 */
function extractSchoolNumbers(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  let normalized =
    convertArabicDigitsToEnglish(
      String(value)
    ).toUpperCase();

  const matches =
    normalized.match(
      /[A-Z0-9]+/g
    );

  if (!matches) {
    return [];
  }

  return matches
    .map(
      item =>
        normalizeSchoolNumber(item)
    )
    .filter(Boolean);
}


/**
 * =========================================================
 * تنظيف الرقم الإحصائي / الوزاري
 * =========================================================
 */
function normalizeSchoolNumber(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return convertArabicDigitsToEnglish(
    String(value).trim()
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      ''
    );
}


/**
 * =========================================================
 * تنظيف النصوص
 * =========================================================
 */
function sanitizeText(
  value,
  maxLength
) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .trim()
    .replace(
      /[\u0000-\u001F\u007F]/g,
      ''
    )
    .substring(
      0,
      maxLength
    );
}


/**
 * =========================================================
 * توحيد رقم الجوال السعودي
 * يقبل:
 * 552134846
 * 0552134846
 * 966552134846
 * +966552134846
 * =========================================================
 */
function normalizeSaudiPhone(value) {

  let phone =
    String(value || '')
      .trim()
      .replace(/\D/g, '');

  if (!phone) {
    return '';
  }

  // مثال:
  // 966552134846
  // يصبح:
  // 0552134846
  if (
    phone.startsWith('9665') &&
    phone.length === 12
  ) {
    phone =
      '0' + phone.substring(3);
  }

  // مثال:
  // 552134846
  // يصبح:
  // 0552134846
  else if (
    phone.startsWith('5') &&
    phone.length === 9
  ) {
    phone =
      '0' + phone;
  }

  // التحقق النهائي
  if (!/^05\d{8}$/.test(phone)) {
    return '';
  }

  return phone;
}


/**
 * =========================================================
 * التحقق من الجوال السعودي
 * =========================================================
 */
function isValidSaudiPhone(phone) {

  return /^05\d{8}$/.test(
    phone
  );
}


/**
 * =========================================================
 * تحويل الأرقام العربية
 * =========================================================
 */
function convertArabicDigitsToEnglish(
  value
) {

  return String(value)

    .replace(
      /[٠-٩]/g,
      digit =>
        '٠١٢٣٤٥٦٧٨٩'
          .indexOf(digit)
    )

    .replace(
      /[۰-۹]/g,
      digit =>
        '۰۱۲۳۴۵۶۷۸۹'
          .indexOf(digit)
    );
}


/**
 * =========================================================
 * JSON Response
 * =========================================================
 */
function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON
    );
}

/**
 * =========================================================
 * توحيد قيمة الكادر
 * =========================================================
 */
function normalizeStaffType(value) {

  const text =
    String(value || '')
      .trim()
      .toLowerCase();

  if (!text) {
    return '';
  }

  // تعليمي
  if (
    text === 'تعليمي' ||
    text === 'تعليمى' ||
    text === 'educational'
  ) {
    return 'تعليمي';
  }

  // إداري
  if (
    text === 'اداري' ||
    text === 'إداري' ||
    text === 'إدارى' ||
    text === 'administrative'
  ) {
    return 'إداري';
  }

  // المحافظة على القيمة الموجودة إذا كانت مختلفة
  return String(value).trim();
}

/**
 * =========================================================
 * رفع تقرير خطة إخلاء
 * =========================================================
 */
/**
 * يحصر القفل العام في الكتابة المشتركة القصيرة فقط.
 * عمليات التحقق وDrive وفك الملفات تتم خارج القفل.
 */
function appendRowWithScriptLock(sheet, row) {

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);
  } catch (error) {
    throw new Error(
      'النظام مشغول حاليًا، يرجى المحاولة مرة أخرى.'
    );
  }

  try {
    sheet.appendRow(row);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}


function uploadEvacuationReport(data) {

  const loginNumber =
    normalizeSchoolNumber(data.loginNumber);

  const evacuationPlanNumber =
  Number(data.evacuationPlanNumber);

  const executionDate =
    String(data.executionDate || '').trim();

  const studentsCount =
    Number(data.studentsCount);

  const staffCount =
    Number(data.staffCount);

  const notes =
    String(data.notes || '').trim();

  const fileName =
    String(data.fileName || '').trim();

  const mimeType =
    String(data.mimeType || '').trim();

  const base64Data =
    String(data.base64Data || '').trim();

  const declaration =
    data.declaration === true;

  if (!loginNumber) {
    return jsonResponse({
      success: false,
      message: 'تعذر التحقق من المدرسة.'
    });
  }
   if (
  !Number.isInteger(evacuationPlanNumber) ||
  ![1, 2, 3, 4].includes(evacuationPlanNumber)
  ) {
  return jsonResponse({
    success: false,
    error: 'INVALID_EVACUATION_PLAN_NUMBER',
    message: 'يرجى اختيار رقم خطة الإخلاء من الأولى إلى الرابعة.'
  });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(executionDate)) {
    return jsonResponse({
      success: false,
      message: 'يرجى تحديد تاريخ تنفيذ الفرضية.'
    });
  }

  if (
    !Number.isInteger(studentsCount) ||
    studentsCount < 0 ||
    !Number.isInteger(staffCount) ||
    staffCount < 0
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال أعداد صحيحة للطلاب والمنسوبين.'
    });
  }

  if (!declaration) {
    return jsonResponse({
      success: false,
      message: 'يجب الإقرار بصحة البيانات قبل رفع التقرير.'
    });
  }

  if (
    mimeType !== 'application/pdf' ||
    !fileName.toLowerCase().endsWith('.pdf')
  ) {
    return jsonResponse({
      success: false,
      message: 'المرفق يجب أن يكون ملف PDF.'
    });
  }

  if (!base64Data) {
    return jsonResponse({
      success: false,
      message: 'يرجى إرفاق التقرير المعتمد بصيغة PDF.'
    });
  }

  const estimatedBytes =
    Math.floor(base64Data.length * 3 / 4);

  if (estimatedBytes > 10 * 1024 * 1024) {
    return jsonResponse({
      success: false,
      message: 'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
    });
  }

  try {

    const schoolResult =
      findSchoolByNumber(loginNumber);

    if (!schoolResult) {
      return jsonResponse({
        success: false,
        message: 'تعذر العثور على المدرسة.'
      });
    }

    const school =
      schoolResult.school;

    const coordinatorName =
  String(
    school['اسم منسق الأمن والسلامة'] || ''
  ).trim();

const coordinatorPhone =
  normalizeSaudiPhone(
    school['جوال منسق الأمن والسلامة']
  );

const staffType =
  normalizeStaffType(
    school['الكادر']
  );

    if (
  !coordinatorName ||
  !coordinatorPhone ||
  !staffType
) {

  return jsonResponse({
    success: false,

    message:
      'فحص البيانات — ' +
      'اسم المنسق: [' +
      coordinatorName +
      '] | الجوال: [' +
      coordinatorPhone +
      '] | الكادر: [' +
      staffType +
      ']'
  });
}

    // إنشاء مجلد المدرسة تلقائيًا إن لم يكن موجودًا.
    let schoolFolderId =
      String(school['Folder_ID'] || '').trim();

    if (!schoolFolderId) {

      const folderResult =
        prepareSchoolFolder({
          loginNumber: loginNumber
        });

      const folderPayload =
        JSON.parse(
          folderResult.getContent()
        );

      if (!folderPayload.success) {
        return jsonResponse({
          success: false,
          message:
            folderPayload.message ||
            'تعذر تهيئة مجلد المدرسة.'
        });
      }

      schoolFolderId =
        folderPayload.data.folderId;
    }

    const schoolFolder =
      DriveApp.getFolderById(
        schoolFolderId
      );

    const typeFolder =
      getOrCreateChildFolder(
        schoolFolder,
        'خطط الإخلاء'
      );

    const now = new Date();

    const reportFolderName =
      Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd_HH-mm-ss'
      );

    const reportFolder =
      typeFolder.createFolder(
        reportFolderName
      );

    let decodedBytes;

    try {
      decodedBytes =
        Utilities.base64Decode(
          base64Data
        );
    } catch (error) {
      reportFolder.setTrashed(true);

      return jsonResponse({
        success: false,
        message: 'تعذر قراءة ملف PDF المرفق.'
      });
    }

    if (
      decodedBytes.length >
      10 * 1024 * 1024
    ) {
      reportFolder.setTrashed(true);

      return jsonResponse({
        success: false,
        message: 'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
      });
    }

    const safeFileName =
      sanitizeFileName(
        fileName
      );

    const blob =
      Utilities.newBlob(
        decodedBytes,
        'application/pdf',
        safeFileName
      );

    const file =
      reportFolder.createFile(
        blob
      );

    const reportId =
      Utilities.getUuid();

    const reportsSheet =
      getReportsSheet();

    const headers =
      reportsSheet
        .getRange(
          1,
          1,
          1,
          reportsSheet.getLastColumn()
        )
        .getDisplayValues()[0]
        .map(header =>
          String(header).trim()
        );

    const reportData = {
      'Report_ID':
        reportId,
      'الرقم الإحصائي المستخدم':
        loginNumber,
      'الأرقام الإحصائية':
        school['الأرقام الإحصائية'] || '',
      'اسم المدرسة':
        school['اسم المدرسة'] || '',
      'المحافظة':
        school['المحافظة'] || '',
      'المدينة':
        school['المدينة'] || '',
      'نوع التقرير':
        'تقرير خطة إخلاء',
        'رقم خطة الإخلاء':
        evacuationPlanNumber,
      'تاريخ التنفيذ':
        executionDate,
      'عدد الطلاب':
        studentsCount,
      'عدد المنسوبين':
        staffCount,
      'اسم المنسق/ة':
        coordinatorName,
      'جوال المنسق/ة':
        coordinatorPhone,
      'الكادر':
        staffType,
      'ملاحظات':
        notes,
      'اسم الملف':
        safeFileName,
      'ملف_ID':
        file.getId(),
      'رابط الملف':
        file.getUrl(),
      'مجلد التقرير_ID':
        reportFolder.getId(),
      'تاريخ الرفع':
        now,
      'حالة التقرير':
        'مرفوع'
    };

    const requiredHeaders =
      Object.keys(reportData);

    requiredHeaders.forEach(
      header => {
        if (!headers.includes(header)) {
          file.setTrashed(true);
          reportFolder.setTrashed(true);
          throw new Error(
            `العمود المطلوب غير موجود في Reports: ${header}`
          );
        }
      }
    );

    const row =
      headers.map(
        header =>
          Object.prototype.hasOwnProperty.call(
            reportData,
            header
          )
            ? reportData[header]
            : ''
      );

    appendRowWithScriptLock(
      reportsSheet,
      row
    );

    return jsonResponse({
      success: true,
      message: 'تم رفع تقرير خطة الإخلاء بنجاح.',
      data: {
        reportId: reportId
      }
    });

  } catch (error) {

  const errorMessage =
    error && error.message
      ? error.message
      : String(error);

  console.error(
    'uploadEvacuationReport Error:',
    error
  );

  return jsonResponse({
    success: false,
    message:
      'تعذر رفع التقرير: ' +
      errorMessage
  });

  }
}


function getOrCreateChildFolder(
  parentFolder,
  folderName
) {

  const folders =
    parentFolder.getFoldersByName(
      folderName
    );

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(
    folderName
  );
}


function sanitizeFileName(fileName) {

  const cleaned =
    String(fileName || 'تقرير_خطة_إخلاء.pdf')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

  return cleaned || 'تقرير_خطة_إخلاء.pdf';
}

/**
 * =========================================================
 * رفع تقرير لحظة سلامة
 * =========================================================
 */
function uploadSafetyMomentReport(data) {

  const loginNumber =
    normalizeSchoolNumber(
      data.loginNumber
    );

  const programName =
    sanitizeText(
      data.programName,
      200
    );

  const executionDate =
    String(
      data.executionDate || ''
    ).trim();

  const studentsBeneficiaries =
    Number(
      data.studentsBeneficiaries
    );

  const parentsBeneficiaries =
    Number(
      data.parentsBeneficiaries
    );

  const staffBeneficiaries =
    Number(
      data.staffBeneficiaries
    );

  const fileName =
    String(
      data.fileName || ''
    ).trim();

  const mimeType =
    String(
      data.mimeType || ''
    ).trim();

  const base64Data =
    String(
      data.base64Data || ''
    ).trim();

  const declaration =
    data.declaration === true;


  /*
   * =====================================================
   * التحقق من البيانات الأساسية
   * =====================================================
   */

  if (!loginNumber) {

    return jsonResponse({
      success: false,
      message:
        'تعذر التحقق من المدرسة.'
    });
  }


  if (!programName) {

    return jsonResponse({
      success: false,
      message:
        'يرجى إدخال اسم البرنامج.'
    });
  }


  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      executionDate
    )
  ) {

    return jsonResponse({
      success: false,
      message:
        'يرجى تحديد تاريخ تنفيذ البرنامج.'
    });
  }


  /*
   * =====================================================
   * التحقق من أعداد المستفيدين
   * =====================================================
   */

  const beneficiaries = [
    studentsBeneficiaries,
    parentsBeneficiaries,
    staffBeneficiaries
  ];


  const invalidCount =
    beneficiaries.some(
      value =>
        !Number.isInteger(value) ||
        value < 0
    );


  if (invalidCount) {

    return jsonResponse({
      success: false,
      message:
        'أعداد المستفيدين يجب أن تكون أرقامًا صحيحة ولا تقل عن صفر.'
    });
  }


  const totalBeneficiaries =
    studentsBeneficiaries +
    parentsBeneficiaries +
    staffBeneficiaries;


  /*
   * =====================================================
   * الإقرار
   * =====================================================
   */

  if (!declaration) {

    return jsonResponse({
      success: false,
      message:
        'يجب الإقرار بصحة البيانات قبل رفع التقرير.'
    });
  }


  /*
   * =====================================================
   * التحقق من PDF
   * =====================================================
   */

  if (
    mimeType !== 'application/pdf' ||
    !fileName
      .toLowerCase()
      .endsWith('.pdf')
  ) {

    return jsonResponse({
      success: false,
      message:
        'المرفق يجب أن يكون ملف PDF.'
    });
  }


  if (!base64Data) {

    return jsonResponse({
      success: false,
      message:
        'يرجى إرفاق التقرير المعتمد بصيغة PDF.'
    });
  }


  const estimatedBytes =
    Math.floor(
      base64Data.length * 3 / 4
    );


  if (
    estimatedBytes >
    10 * 1024 * 1024
  ) {

    return jsonResponse({
      success: false,
      message:
        'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
    });
  }


  try {

    /*
     * ===================================================
     * التحقق من المدرسة
     * ===================================================
     */

    const schoolResult =
      findSchoolByNumber(
        loginNumber
      );


    if (!schoolResult) {

      return jsonResponse({
        success: false,
        message:
          'تعذر العثور على المدرسة.'
      });
    }


    const school =
      schoolResult.school;


    const status =
      String(
        school['حالة المدرسة'] || ''
      ).trim();


    if (
      status &&
      status !== 'نشطة' &&
      status !== 'نشط'
    ) {

      return jsonResponse({
        success: false,
        message:
          'المدرسة غير نشطة في النظام.'
      });
    }


    /*
     * ===================================================
     * بيانات المنسق
     * ===================================================
     */

    const coordinatorName =
      String(
        school[
          'اسم منسق الأمن والسلامة'
        ] || ''
      ).trim();


    const coordinatorPhone =
      normalizeSaudiPhone(
        school[
          'جوال منسق الأمن والسلامة'
        ]
      );


    const staffType =
      normalizeStaffType(
        school['الكادر']
      );


    if (
      !coordinatorName ||
      !coordinatorPhone ||
      !staffType
    ) {

      return jsonResponse({
        success: false,
        message:
          'يرجى استكمال بيانات منسق/ة الأمن والسلامة والكادر وحفظها أولًا.'
      });
    }


    /*
     * ===================================================
     * مجلد المدرسة
     * ===================================================
     */

    let schoolFolderId =
      String(
        school['Folder_ID'] || ''
      ).trim();


    if (!schoolFolderId) {

      const folderResult =
        prepareSchoolFolder({
          loginNumber:
            loginNumber
        });


      const folderPayload =
        JSON.parse(
          folderResult.getContent()
        );


      if (!folderPayload.success) {

        return jsonResponse({
          success: false,
          message:
            folderPayload.message ||
            'تعذر تهيئة مجلد المدرسة.'
        });
      }


      schoolFolderId =
        folderPayload.data.folderId;
    }


    const schoolFolder =
      DriveApp.getFolderById(
        schoolFolderId
      );


    /*
     * ===================================================
     * مجلد لحظة سلامة
     * ===================================================
     */

    const typeFolder =
      getOrCreateChildFolder(
        schoolFolder,
        'لحظة سلامة'
      );


    const now =
      new Date();


    const reportFolderName =
      Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd_HH-mm-ss'
      );


    const reportFolder =
      typeFolder.createFolder(
        reportFolderName
      );


    /*
     * ===================================================
     * فك الملف
     * ===================================================
     */

    let decodedBytes;


    try {

      decodedBytes =
        Utilities.base64Decode(
          base64Data
        );

    } catch (error) {

      reportFolder.setTrashed(
        true
      );


      return jsonResponse({
        success: false,
        message:
          'تعذر قراءة ملف PDF المرفق.'
      });
    }


    if (
      decodedBytes.length >
      10 * 1024 * 1024
    ) {

      reportFolder.setTrashed(
        true
      );


      return jsonResponse({
        success: false,
        message:
          'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
      });
    }


    /*
     * ===================================================
     * حفظ PDF
     * ===================================================
     */

    const safeFileName =
      sanitizeFileName(
        fileName
      );


    const blob =
      Utilities.newBlob(
        decodedBytes,
        'application/pdf',
        safeFileName
      );


    const file =
      reportFolder.createFile(
        blob
      );


    /*
     * ===================================================
     * تجهيز سجل التقرير
     * ===================================================
     */

    const reportId =
      Utilities.getUuid();


    const reportsSheet =
      getSafetyMomentReportsSheet();


    const headers =
      getHeaders(
        reportsSheet
      );


    const reportData = {

      'Report_ID':
        reportId,

      'الرقم الإحصائي المستخدم':
        loginNumber,

      'الأرقام الإحصائية':
        school[
          'الأرقام الإحصائية'
        ] || '',

      'اسم المدرسة':
        school[
          'اسم المدرسة'
        ] || '',

      'المحافظة':
        school[
          'المحافظة'
        ] || '',

      'المدينة':
        school[
          'المدينة'
        ] || '',

      'اسم البرنامج':
        programName,

      'تاريخ التنفيذ':
        executionDate,

      'عدد المستفيدين من الطلاب':
        studentsBeneficiaries,

      'عدد المستفيدين من أولياء الأمور':
        parentsBeneficiaries,

      'عدد المستفيدين من منسوبي المدرسة':
        staffBeneficiaries,

      'إجمالي المستفيدين':
        totalBeneficiaries,

      'اسم المنسق/ة':
        coordinatorName,

      'جوال المنسق/ة':
        coordinatorPhone,

      'الكادر':
        staffType,

      'اسم الملف':
        safeFileName,

      'ملف_ID':
        file.getId(),

      'رابط الملف':
        file.getUrl(),

      'مجلد التقرير_ID':
        reportFolder.getId(),

      'تاريخ الرفع':
        now,

      'حالة التقرير':
        'مرفوع'
    };


    /*
     * ===================================================
     * التأكد من الأعمدة
     * ===================================================
     */

    Object
      .keys(reportData)
      .forEach(
        header => {

          if (
            !headers.includes(
              header
            )
          ) {

            file.setTrashed(
              true
            );

            reportFolder.setTrashed(
              true
            );

            throw new Error(
              `العمود المطلوب غير موجود في SafetyMomentReports: ${header}`
            );
          }
        }
      );


    /*
     * ===================================================
     * إضافة الصف
     * ===================================================
     */

    const row =
      headers.map(
        header =>
          Object.prototype
            .hasOwnProperty
            .call(
              reportData,
              header
            )
            ? reportData[
                header
              ]
            : ''
      );


    appendRowWithScriptLock(
      reportsSheet,
      row
    );


    return jsonResponse({
      success: true,

      message:
        'تم رفع تقرير لحظة سلامة بنجاح.',

      data: {
        reportId:
          reportId,

        totalBeneficiaries:
          totalBeneficiaries
      }
    });


  } catch (error) {

    console.error(
      'uploadSafetyMomentReport Error:',
      error
    );


    /*
     * خلال التطوير نبقي الخطأ واضحًا.
     * بعد انتهاء الاختبارات سنعيده
     * إلى رسالة عامة آمنة.
     */
    const errorMessage =
      error &&
      error.message
        ? error.message
        : String(error);


    return jsonResponse({
      success: false,

      message:
        'تعذر رفع تقرير لحظة سلامة: ' +
        errorMessage
    });


  }
}

/**
 * =========================================================
 * رفع تقرير اليوم العالمي للدفاع المدني
 * =========================================================
 */
function uploadCivilDefenseReport(data) {

  const loginNumber =
    normalizeSchoolNumber(data.loginNumber);

  const programName =
    sanitizeText(data.programName, 200);

  const executionDate =
    String(data.executionDate || '').trim();

  /*
   * نوع البرنامج يمكن أن يصل:
   * - Array من الواجهة
   * - أو نص واحد
   */
  let programTypes = [];

  if (Array.isArray(data.programTypes)) {
    programTypes = data.programTypes;
  } else if (data.programTypes) {
    programTypes = [data.programTypes];
  }

  const allowedProgramTypes = [
    'إذاعة',
    'مسابقة',
    'محاضرة',
    'رسائل توعوية',
    'زيارة',
    'أخرى'
  ];

  programTypes = programTypes
    .map(item => sanitizeText(item, 50))
    .filter(item => allowedProgramTypes.includes(item));

  /*
   * إزالة التكرار
   */
  programTypes = [...new Set(programTypes)];

  const otherType =
    sanitizeText(data.otherType, 150);

  const programsCount =
    Number(data.programsCount);

  const studentsCount =
    Number(data.studentsCount);

  const staffCount =
    Number(data.staffCount);

  const fileName =
    String(data.fileName || '').trim();

  const mimeType =
    String(data.mimeType || '').trim();

  const base64Data =
    String(data.base64Data || '').trim();

  const declaration =
    data.declaration === true;


  /*
   * =======================================================
   * التحقق من البيانات
   * =======================================================
   */

  if (!loginNumber) {
    return jsonResponse({
      success: false,
      message: 'تعذر التحقق من المدرسة.'
    });
  }


  if (!programName) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال اسم البرنامج.'
    });
  }


  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      executionDate
    )
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى تحديد تاريخ تنفيذ البرنامج.'
    });
  }


  if (programTypes.length === 0) {
    return jsonResponse({
      success: false,
      message: 'يرجى اختيار نوع واحد على الأقل للبرنامج.'
    });
  }


  /*
   * إذا اختار "أخرى"
   * يجب كتابة النوع.
   */
  if (
    programTypes.includes('أخرى') &&
    !otherType
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى كتابة نوع البرنامج الآخر.'
    });
  }


  if (
    !Number.isInteger(programsCount) ||
    programsCount < 1
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال عدد البرامج المقدمة بشكل صحيح.'
    });
  }


  if (
    !Number.isInteger(studentsCount) ||
    studentsCount < 0
  ) {
    return jsonResponse({
      success: false,
      message: 'عدد المستفيدين من الطلاب غير صحيح.'
    });
  }


  if (
    !Number.isInteger(staffCount) ||
    staffCount < 0
  ) {
    return jsonResponse({
      success: false,
      message: 'عدد المستفيدين من المنسوبين غير صحيح.'
    });
  }


  if (!declaration) {
    return jsonResponse({
      success: false,
      message: 'يجب الإقرار بصحة البيانات قبل رفع التقرير.'
    });
  }


  /*
   * التحقق من PDF
   */
  if (
    mimeType !== 'application/pdf' ||
    !fileName.toLowerCase().endsWith('.pdf')
  ) {
    return jsonResponse({
      success: false,
      message: 'المرفق يجب أن يكون ملف PDF.'
    });
  }


  if (!base64Data) {
    return jsonResponse({
      success: false,
      message: 'يرجى إرفاق التقرير المعتمد بصيغة PDF.'
    });
  }


  /*
   * فحص مبدئي للحجم قبل فك Base64
   */
  const estimatedBytes =
    Math.floor(
      base64Data.length * 3 / 4
    );

  if (
    estimatedBytes >
    10 * 1024 * 1024
  ) {
    return jsonResponse({
      success: false,
      message: 'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
    });
  }


  try {

    /*
     * =====================================================
     * جلب المدرسة من الخادم
     * =====================================================
     */

    const schoolResult =
      findSchoolByNumber(
        loginNumber
      );

    if (!schoolResult) {
      return jsonResponse({
        success: false,
        message: 'تعذر العثور على المدرسة.'
      });
    }


    const school =
      schoolResult.school;


    /*
     * حالة المدرسة
     */
    const schoolStatus =
      String(
        school['حالة المدرسة'] || ''
      ).trim();

    if (
      schoolStatus &&
      schoolStatus !== 'نشطة' &&
      schoolStatus !== 'نشط'
    ) {
      return jsonResponse({
        success: false,
        message: 'المدرسة غير نشطة في النظام.'
      });
    }


    /*
     * بيانات منسق الأمن والسلامة
     */
    const coordinatorName =
      String(
        school[
          'اسم منسق الأمن والسلامة'
        ] || ''
      ).trim();


    const coordinatorPhone =
      normalizeSaudiPhone(
        school[
          'جوال منسق الأمن والسلامة'
        ]
      );


    const staffType =
      normalizeStaffType(
        school['الكادر']
      );


    if (
      !coordinatorName ||
      !coordinatorPhone ||
      !staffType
    ) {
      return jsonResponse({
        success: false,
        message:
          'يرجى استكمال بيانات منسق/ة الأمن والسلامة والكادر وحفظها أولًا.'
      });
    }


    /*
     * =====================================================
     * التأكد من وجود مجلد المدرسة
     * =====================================================
     */

    let schoolFolderId =
      String(
        school['Folder_ID'] || ''
      ).trim();


    if (!schoolFolderId) {

      const folderResult =
        prepareSchoolFolder({
          loginNumber: loginNumber
        });


      const folderPayload =
        JSON.parse(
          folderResult.getContent()
        );


      if (!folderPayload.success) {

        return jsonResponse({
          success: false,
          message:
            folderPayload.message ||
            'تعذر تهيئة مجلد المدرسة.'
        });
      }


      schoolFolderId =
        folderPayload.data.folderId;
    }


    /*
     * =====================================================
     * مجلد الدفاع المدني
     * =====================================================
     */

    const schoolFolder =
      DriveApp.getFolderById(
        schoolFolderId
      );


    const typeFolder =
      getOrCreateChildFolder(
        schoolFolder,
        'اليوم العالمي للدفاع المدني'
      );


    /*
     * كل رفع له مجلد مستقل
     * حتى يمكن للمدرسة رفع أكثر من تقرير.
     */
    const now =
      new Date();


    const reportFolderName =
      Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd_HH-mm-ss'
      );


    const reportFolder =
      typeFolder.createFolder(
        reportFolderName
      );


    /*
     * =====================================================
     * فك ملف PDF
     * =====================================================
     */

    let decodedBytes;

    try {

      decodedBytes =
        Utilities.base64Decode(
          base64Data
        );

    } catch (error) {

      reportFolder.setTrashed(true);

      return jsonResponse({
        success: false,
        message: 'تعذر قراءة ملف PDF المرفق.'
      });
    }


    /*
     * فحص الحجم الحقيقي
     */
    if (
      decodedBytes.length >
      10 * 1024 * 1024
    ) {

      reportFolder.setTrashed(true);

      return jsonResponse({
        success: false,
        message: 'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
      });
    }


    /*
     * =====================================================
     * إنشاء الملف
     * =====================================================
     */

    const safeFileName =
      sanitizeFileName(
        fileName
      );


    const blob =
      Utilities.newBlob(
        decodedBytes,
        'application/pdf',
        safeFileName
      );


    const file =
      reportFolder.createFile(
        blob
      );


    /*
     * =====================================================
     * تجهيز بيانات التقرير
     * =====================================================
     */

    const reportId =
      Utilities.getUuid();


    const reportsSheet =
      getCivilDefenseReportsSheet();


    const headers =
      reportsSheet
        .getRange(
          1,
          1,
          1,
          reportsSheet.getLastColumn()
        )
        .getDisplayValues()[0]
        .map(
          header =>
            String(header).trim()
        );


    /*
     * تخزين الأنواع المتعددة كنص:
     *
     * إذاعة، مسابقة، محاضرة
     */
    const programTypesText =
      programTypes.join('، ');


    const reportData = {

      'Report_ID':
        reportId,

      'الرقم الإحصائي المستخدم':
        loginNumber,

      'الأرقام الإحصائية':
        school[
          'الأرقام الإحصائية'
        ] || '',

      'اسم المدرسة':
        school[
          'اسم المدرسة'
        ] || '',

      'المحافظة':
        school[
          'المحافظة'
        ] || '',

      'المدينة':
        school[
          'المدينة'
        ] || '',

      'اسم البرنامج':
        programName,

      'تاريخ التنفيذ':
        executionDate,

      'نوع البرنامج':
        programTypesText,

      'نوع آخر':
        programTypes.includes('أخرى')
          ? otherType
          : '',

      'عدد البرامج المقدمة':
        programsCount,

      'عدد المستفيدين من الطلاب':
        studentsCount,

      'عدد المستفيدين من المنسوبين':
        staffCount,

      'اسم المنسق/ة':
        coordinatorName,

      'جوال المنسق/ة':
        coordinatorPhone,

      'الكادر':
        staffType,

      'اسم الملف':
        safeFileName,

      'ملف_ID':
        file.getId(),

      'رابط الملف':
        file.getUrl(),

      'مجلد التقرير_ID':
        reportFolder.getId(),

      'تاريخ الرفع':
        now,

      'حالة التقرير':
        'مرفوع'
    };


    /*
     * =====================================================
     * التأكد من أعمدة الشيت
     * =====================================================
     */

    const requiredHeaders =
      Object.keys(
        reportData
      );


    requiredHeaders.forEach(
      header => {

        if (
          !headers.includes(
            header
          )
        ) {

          /*
           * إذا كان هناك خطأ في بنية الشيت
           * نحذف الملف والمجلد حتى لا
           * يتبقى رفع بدون سجل.
           */
          file.setTrashed(true);
          reportFolder.setTrashed(true);

          throw new Error(
            `العمود المطلوب غير موجود في CivilDefenseReports: ${header}`
          );
        }
      }
    );


    /*
     * ترتيب البيانات حسب ترتيب
     * الأعمدة الفعلي في Google Sheet.
     */
    const row =
      headers.map(
        header =>

          Object.prototype
            .hasOwnProperty.call(
              reportData,
              header
            )

            ? reportData[header]
            : ''
      );


    appendRowWithScriptLock(
      reportsSheet,
      row
    );


    /*
     * =====================================================
     * نجاح
     * =====================================================
     */

    return jsonResponse({
      success: true,

      message:
        'تم رفع تقرير اليوم العالمي للدفاع المدني بنجاح.',

      data: {
        reportId:
          reportId
      }
    });


  } catch (error) {

    const errorMessage =
      error && error.message
        ? error.message
        : String(error);


    console.error(
      'uploadCivilDefenseReport Error:',
      error
    );


    return jsonResponse({
      success: false,

      message:
        'تعذر رفع تقرير الدفاع المدني: ' +
        errorMessage
    });


  }
}
/**
 * =========================================================
 * رفع تقرير أسبوع المرور
 * =========================================================
 */
function uploadTrafficWeekReport(data) {

  const loginNumber =
    normalizeSchoolNumber(data.loginNumber);

  const programName =
    sanitizeText(data.programName, 200);

  const executionDate =
    String(data.executionDate || '').trim();

  const programTypes =
    Array.isArray(data.programTypes)
      ? data.programTypes
          .map(item => sanitizeText(item, 50))
          .filter(Boolean)
      : [];

  const otherType =
    sanitizeText(data.otherType, 150);

  const programsCount =
    Number(data.programsCount);

  const studentsCount =
    Number(data.studentsCount);

  const staffCount =
    Number(data.staffCount);

  const fileName =
    String(data.fileName || '').trim();

  const mimeType =
    String(data.mimeType || '').trim();

  const base64Data =
    String(data.base64Data || '').trim();

  const declaration =
    data.declaration === true;


  /*
   * =========================================================
   * التحقق من البيانات
   * =========================================================
   */

  if (!loginNumber) {
    return jsonResponse({
      success: false,
      message: 'تعذر التحقق من المدرسة.'
    });
  }


  if (!programName) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال اسم البرنامج.'
    });
  }


  if (!/^\d{4}-\d{2}-\d{2}$/.test(executionDate)) {
    return jsonResponse({
      success: false,
      message: 'يرجى تحديد تاريخ تنفيذ البرنامج.'
    });
  }


  if (programTypes.length === 0) {
    return jsonResponse({
      success: false,
      message: 'يرجى اختيار نوع واحد على الأقل للبرنامج.'
    });
  }


  /*
   * إذا تم اختيار "أخرى"
   * يجب كتابة النوع.
   */
  if (
    programTypes.includes('أخرى') &&
    !otherType
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى كتابة نوع البرنامج الآخر.'
    });
  }


  if (
    !Number.isInteger(programsCount) ||
    programsCount < 1
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال عدد البرامج المقدمة بشكل صحيح.'
    });
  }


  if (
    !Number.isInteger(studentsCount) ||
    studentsCount < 0
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال عدد المستفيدين من الطلاب بشكل صحيح.'
    });
  }


  if (
    !Number.isInteger(staffCount) ||
    staffCount < 0
  ) {
    return jsonResponse({
      success: false,
      message: 'يرجى إدخال عدد المستفيدين من المنسوبين بشكل صحيح.'
    });
  }


  if (!declaration) {
    return jsonResponse({
      success: false,
      message: 'يجب الإقرار بصحة البيانات قبل رفع التقرير.'
    });
  }


  if (
    mimeType !== 'application/pdf' ||
    !fileName.toLowerCase().endsWith('.pdf')
  ) {
    return jsonResponse({
      success: false,
      message: 'المرفق يجب أن يكون ملف PDF.'
    });
  }


  if (!base64Data) {
    return jsonResponse({
      success: false,
      message: 'يرجى إرفاق التقرير المعتمد بصيغة PDF.'
    });
  }


  /*
   * فحص أولي لحجم الملف.
   */
  const estimatedBytes =
    Math.floor(base64Data.length * 3 / 4);

  if (estimatedBytes > 10 * 1024 * 1024) {
    return jsonResponse({
      success: false,
      message: 'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
    });
  }


  try {

    /*
     * =====================================================
     * التحقق من المدرسة
     * =====================================================
     */

    const schoolResult =
      findSchoolByNumber(loginNumber);

    if (!schoolResult) {
      return jsonResponse({
        success: false,
        message: 'تعذر العثور على المدرسة.'
      });
    }


    const school =
      schoolResult.school;


    /*
     * بيانات منسق الأمن والسلامة
     * تؤخذ من بيانات المدرسة المحفوظة.
     */

    const coordinatorName =
      String(
        school['اسم منسق الأمن والسلامة'] || ''
      ).trim();


    const coordinatorPhone =
      normalizeSaudiPhone(
        school['جوال منسق الأمن والسلامة']
      );


    const staffType =
      normalizeStaffType(
        school['الكادر']
      );


    if (
      !coordinatorName ||
      !coordinatorPhone ||
      !staffType
    ) {

      return jsonResponse({
        success: false,
        message:
          'يرجى استكمال بيانات منسق/ة الأمن والسلامة والكادر وحفظها أولًا.'
      });
    }


    /*
     * =====================================================
     * الحصول على مجلد المدرسة
     * =====================================================
     */

    let schoolFolderId =
      String(
        school['Folder_ID'] || ''
      ).trim();


    /*
     * إذا لم يكن للمدرسة مجلد،
     * يتم إنشاؤه تلقائيًا.
     */
    if (!schoolFolderId) {

      const folderResult =
        prepareSchoolFolder({
          loginNumber: loginNumber
        });


      const folderPayload =
        JSON.parse(
          folderResult.getContent()
        );


      if (!folderPayload.success) {

        return jsonResponse({
          success: false,
          message:
            folderPayload.message ||
            'تعذر تهيئة مجلد المدرسة.'
        });
      }


      schoolFolderId =
        folderPayload.data.folderId;
    }


    const schoolFolder =
      DriveApp.getFolderById(
        schoolFolderId
      );


    /*
     * =====================================================
     * إنشاء / الحصول على مجلد أسبوع المرور
     * =====================================================
     */

    const typeFolder =
      getOrCreateChildFolder(
        schoolFolder,
        'أسبوع المرور'
      );


    /*
     * كل عملية رفع لها مجلد مستقل
     * حسب تاريخ ووقت الرفع.
     */
    const now =
      new Date();


    const reportFolderName =
      Utilities.formatDate(
        now,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd_HH-mm-ss'
      );


    const reportFolder =
      typeFolder.createFolder(
        reportFolderName
      );


    /*
     * =====================================================
     * فك ملف PDF
     * =====================================================
     */

    let decodedBytes;


    try {

      decodedBytes =
        Utilities.base64Decode(
          base64Data
        );

    } catch (error) {

      reportFolder.setTrashed(true);

      return jsonResponse({
        success: false,
        message: 'تعذر قراءة ملف PDF المرفق.'
      });
    }


    /*
     * التحقق الحقيقي من الحجم
     * بعد فك Base64.
     */
    if (
      decodedBytes.length >
      10 * 1024 * 1024
    ) {

      reportFolder.setTrashed(true);

      return jsonResponse({
        success: false,
        message:
          'حجم ملف PDF يجب ألا يتجاوز 10 ميجابايت.'
      });
    }


    /*
     * =====================================================
     * إنشاء الملف
     * =====================================================
     */

    const safeFileName =
      sanitizeFileName(
        fileName
      );


    const blob =
      Utilities.newBlob(
        decodedBytes,
        'application/pdf',
        safeFileName
      );


    const file =
      reportFolder.createFile(
        blob
      );


    /*
     * =====================================================
     * إنشاء رقم التقرير
     * =====================================================
     */

    const reportId =
      Utilities.getUuid();


    /*
     * =====================================================
     * الوصول إلى شيت أسبوع المرور
     * =====================================================
     */

    const reportsSheet =
      getTrafficWeekSheet();


    const headers =
      reportsSheet
        .getRange(
          1,
          1,
          1,
          reportsSheet.getLastColumn()
        )
        .getDisplayValues()[0]
        .map(
          header =>
            String(header).trim()
        );


    /*
     * تحويل أنواع البرامج المتعددة
     * إلى نص واحد للحفظ في الشيت.
     *
     * مثال:
     * إذاعة، مسابقة، محاضرة
     */
    const programTypesText =
      programTypes.join('، ');


    /*
     * =====================================================
     * بيانات التقرير
     * =====================================================
     */

    const reportData = {

      'Report_ID':
        reportId,

      'الرقم الإحصائي المستخدم':
        loginNumber,

      'الأرقام الإحصائية':
        school['الأرقام الإحصائية'] || '',

      'اسم المدرسة':
        school['اسم المدرسة'] || '',

      'المحافظة':
        school['المحافظة'] || '',

      'المدينة':
        school['المدينة'] || '',

      'اسم البرنامج':
        programName,

      'تاريخ التنفيذ':
        executionDate,

      'نوع البرنامج':
        programTypesText,

      'نوع آخر':
        otherType,

      'عدد البرامج المقدمة':
        programsCount,

      'عدد المستفيدين من الطلاب':
        studentsCount,

      'عدد المستفيدين من المنسوبين':
        staffCount,

      'اسم المنسق/ة':
        coordinatorName,

      'جوال المنسق/ة':
        coordinatorPhone,

      'الكادر':
        staffType,

      'اسم الملف':
        safeFileName,

      'ملف_ID':
        file.getId(),

      'رابط الملف':
        file.getUrl(),

      'مجلد التقرير_ID':
        reportFolder.getId(),

      'تاريخ الرفع':
        now,

      'حالة التقرير':
        'مرفوع'
    };


    /*
     * =====================================================
     * التأكد من وجود الأعمدة المطلوبة
     * =====================================================
     */

    const requiredHeaders =
      Object.keys(reportData);


    requiredHeaders.forEach(
      header => {

        if (!headers.includes(header)) {

          /*
           * إذا كان الشيت غير مجهز بشكل صحيح
           * نحذف الملف والمجلد حتى لا تبقى
           * ملفات يتيمة في Drive.
           */

          file.setTrashed(true);
          reportFolder.setTrashed(true);

          throw new Error(
            `العمود المطلوب غير موجود في TrafficWeekReports: ${header}`
          );
        }
      }
    );


    /*
     * =====================================================
     * تكوين الصف بنفس ترتيب أعمدة الشيت
     * =====================================================
     */

    const row =
      headers.map(
        header =>

          Object.prototype.hasOwnProperty.call(
            reportData,
            header
          )

            ? reportData[header]

            : ''
      );


    /*
     * إضافة التقرير.
     */
    appendRowWithScriptLock(
      reportsSheet,
      row
    );


    /*
     * =====================================================
     * نجاح العملية
     * =====================================================
     */

    return jsonResponse({
      success: true,

      message:
        'تم رفع تقرير أسبوع المرور بنجاح.',

      data: {
        reportId: reportId
      }
    });


  } catch (error) {

    const errorMessage =
      error && error.message
        ? error.message
        : String(error);


    console.error(
      'uploadTrafficWeekReport Error:',
      error
    );


    return jsonResponse({
      success: false,

      message:
        'تعذر رفع تقرير أسبوع المرور: ' +
        errorMessage
    });


  }
}
/**
 * =========================================================
 * سجل تقارير المدرسة
 * =========================================================
 *
 * يجمع جميع أنواع تقارير المدرسة من الأوراق المختلفة
 * ويعيدها في سجل موحد للواجهة.
 */
function getSchoolReports(e) {

  const loginNumber =
    normalizeSchoolNumber(
      e?.parameter?.number
    );

  /*
   * التحقق من رقم الدخول
   */
  if (!loginNumber) {
    return jsonResponse({
      success: false,
      error: 'NUMBER_REQUIRED',
      message: 'تعذر التحقق من المدرسة.'
    });
  }


  /*
   * البحث عن المدرسة
   */
  const schoolResult =
    findSchoolByNumber(loginNumber);

  if (!schoolResult) {
    return jsonResponse({
      success: false,
      error: 'SCHOOL_NOT_FOUND',
      message: 'تعذر العثور على المدرسة.'
    });
  }


  /*
   * =====================================================
   * جميع الأرقام الإحصائية / الوزارية التابعة للمدرسة
   * =====================================================
   *
   * مهم:
   * قد تدخل المدرسة اليوم برقم،
   * ثم تدخل لاحقًا برقم آخر من أرقامها.
   * لذلك لا نعتمد على loginNumber وحده.
   */
  const schoolNumbers =
    extractSchoolNumbers(
      schoolResult.school[
        'الأرقام الإحصائية'
      ] || ''
    );


  /*
   * إضافة رقم الدخول الحالي احتياطياً
   */
  if (
    loginNumber &&
    !schoolNumbers.includes(loginNumber)
  ) {
    schoolNumbers.push(loginNumber);
  }


  /*
   * =====================================================
   * إعداد مصادر التقارير
   * =====================================================
   */
  const reportSources = [

    /*
     * تقارير خطة الإخلاء
     */
    {
      sheetName:
        CONFIG.REPORTS_SHEET,

      defaultReportType:
        'تقرير خطة إخلاء',

      source:
        'evacuation',

      titleField:
        null
    },


    /*
 * تقارير لحظة سلامة
 */
{
  sheetName:
    CONFIG.SAFETY_MOMENT_SHEET,

  defaultReportType:
    'تقرير لحظة سلامة',

  source:
    'safetyMoment',

  titleField:
    'اسم البرنامج'
},

/*
 * تقارير اليوم العالمي للدفاع المدني
 */
{
  
  sheetName:
    CONFIG.CIVIL_DEFENSE_SHEET,

  defaultReportType:
    'تقرير اليوم العالمي للدفاع المدني',

  source:
    'civilDefense',

  titleField:
    'اسم البرنامج'
},

/*
 * تقارير أسبوع المرور
 */
{
  sheetName:
    CONFIG.TRAFFIC_WEEK_SHEET,

  defaultReportType:
    'تقرير أسبوع المرور',

  source:
    'trafficWeek',

  titleField:
    'اسم البرنامج'
}
];


let reports = [];


  /*
   * =====================================================
   * قراءة جميع مصادر التقارير
   * =====================================================
   */
  reportSources.forEach(
    sourceConfig => {

      const sourceReports =
        readSchoolReportsFromSheet(
          sourceConfig,
          schoolNumbers
        );

      reports =
        reports.concat(
          sourceReports
        );
    }
  );


  /*
   * =====================================================
   * ترتيب التقارير
   * الأحدث رفعاً أولاً
   * =====================================================
   */
  reports.sort(
    (a, b) => {

      const timeA =
        Number(a._sortTime || 0);

      const timeB =
        Number(b._sortTime || 0);

      /*
       * إذا أمكن قراءة التاريخ
       */
      if (timeA !== timeB) {
        return timeB - timeA;
      }


      /*
       * ترتيب احتياطي
       */
      return (
        Number(b._rowNumber || 0) -
        Number(a._rowNumber || 0)
      );
    }
  );


  /*
   * حذف الحقول الداخلية المستخدمة
   * للترتيب فقط قبل إرسالها للواجهة.
   */
  const cleanReports =
    reports.map(
      report => {

        const {
          _sortTime,
          _rowNumber,
          ...cleanReport
        } = report;

        return cleanReport;
      }
    );


  return jsonResponse({
    success: true,
    data: cleanReports
  });
}


/**
 * =========================================================
 * قراءة تقارير المدرسة من ورقة محددة
 * =========================================================
 *
 * هذه الدالة عامة حتى نستطيع مستقبلاً إضافة:
 *
 * GeneralProgramReports
 * CivilDefenseReports
 * TrafficWeekReports
 *
 * بدون تكرار الكود.
 */
function readSchoolReportsFromSheet(
  sourceConfig,
  schoolNumbers,
  preloadedValues
) {

  let values;

  if (Array.isArray(preloadedValues)) {
    values = preloadedValues;
  } else {

    const spreadsheet =
      SpreadsheetApp.getActiveSpreadsheet();

    const sheet =
      spreadsheet.getSheetByName(
        sourceConfig.sheetName
      );

    /*
     * إذا لم توجد الورقة، لا نعطل السجل بالكامل.
     */
    if (!sheet) {

      console.warn(
        'Report sheet not found:',
        sourceConfig.sheetName
      );

      return [];
    }

    values = sheet
      .getDataRange()
      .getDisplayValues();
  }


  /*
   * لا توجد تقارير
   */
  if (values.length < 2) {
    return [];
  }


  const headers =
    values[0].map(
      header =>
        String(header).trim()
    );


  /*
   * الأعمدة المشتركة المطلوبة
   * في جميع أوراق التقارير.
   */
  const requiredHeaders = [
    'Report_ID',
    'الرقم الإحصائي المستخدم',
    'تاريخ التنفيذ',
    'تاريخ الرفع',
    'حالة التقرير'
  ];


  requiredHeaders.forEach(
    header => {

      if (!headers.includes(header)) {

        throw new Error(
          `العمود المطلوب غير موجود في ${sourceConfig.sheetName}: ${header}`
        );
      }
    }
  );


  const loginIndex =
    headers.indexOf(
      'الرقم الإحصائي المستخدم'
    );


  const reports = [];


  /*
   * =====================================================
   * قراءة الصفوف
   * =====================================================
   */
  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {

    const row =
      values[rowIndex];


    const reportLoginNumber =
      normalizeSchoolNumber(
        row[loginIndex]
      );


    /*
     * التقرير لا يخص هذه المدرسة.
     */
    if (
      !reportLoginNumber ||
      !schoolNumbers.includes(
        reportLoginNumber
      )
    ) {
      continue;
    }


    /*
     * تحويل الصف إلى Object
     */
    const item = {};


    headers.forEach(
      (header, index) => {

        if (header) {
          item[header] =
            row[index] || '';
        }
      }
    );


    /*
     * ===================================================
     * نوع التقرير
     * ===================================================
     *
     * Reports تحتوي على نوع التقرير.
     * SafetyMomentReports لا تحتاج لهذا العمود.
     */
    const reportType =
      String(
        item['نوع التقرير'] ||
        sourceConfig.defaultReportType ||
        ''
      ).trim();


    /*
     * ===================================================
     * عنوان التقرير
     * ===================================================
     */
    let title =
      sourceConfig.defaultReportType ||
      reportType;


    if (
      sourceConfig.titleField &&
      item[sourceConfig.titleField]
    ) {

      title =
        String(
          item[sourceConfig.titleField]
        ).trim();
    }


    /*
     * ===================================================
     * تاريخ الرفع للترتيب
     * ===================================================
     */
    const uploadDate =
      item['تاريخ الرفع'] || '';


    const sortTime =
      parseReportUploadDate(
        uploadDate
      );


    /*
     * ===================================================
     * إضافة التقرير للسجل الموحد
     * ===================================================
     */
    reports.push({

      reportId:
        item['Report_ID'] || '',

      reportType:
        reportType,

      title:
        title,

      executionDate:
        item['تاريخ التنفيذ'] || '',

      uploadDate:
        uploadDate,

      status:
        item['حالة التقرير'] || '',

      source:
        sourceConfig.source || '',

      /*
       * حقول داخلية للترتيب فقط
       */
      _sortTime:
        sortTime,

      _rowNumber:
        rowIndex + 1
    });
  }


  return reports;
}


function getSchoolReportSourceConfigs(
  achievementContext
) {

  const sourceValues =
    achievementContext?.sourceValues || {};

  return [
    {
      sheetName: CONFIG.REPORTS_SHEET,
      defaultReportType:
        'تقرير خطة إخلاء',
      source: 'evacuation',
      titleField: null,
      values: sourceValues.evacuation
    },
    {
      sheetName:
        CONFIG.SAFETY_MOMENT_SHEET,
      defaultReportType:
        'تقرير لحظة سلامة',
      source: 'safetyMoment',
      titleField: 'اسم البرنامج',
      values: sourceValues.safetyMoment
    },
    {
      sheetName:
        CONFIG.CIVIL_DEFENSE_SHEET,
      defaultReportType:
        'تقرير اليوم العالمي للدفاع المدني',
      source: 'civilDefense',
      titleField: 'اسم البرنامج',
      values: sourceValues.civilDefense
    },
    {
      sheetName:
        CONFIG.TRAFFIC_WEEK_SHEET,
      defaultReportType:
        'تقرير أسبوع المرور',
      source: 'trafficWeek',
      titleField: 'اسم البرنامج',
      values: sourceValues.trafficWeek
    }
  ];
}


function buildSchoolReportsFromContext(
  school,
  loginNumber,
  achievementContext
) {

  const schoolNumbers =
    extractSchoolNumbers(
      school['الأرقام الإحصائية'] || ''
    );

  if (
    loginNumber &&
    !schoolNumbers.includes(loginNumber)
  ) {
    schoolNumbers.push(loginNumber);
  }

  let reports = [];

  getSchoolReportSourceConfigs(
    achievementContext
  ).forEach(sourceConfig => {

    reports = reports.concat(
      readSchoolReportsFromSheet(
        sourceConfig,
        schoolNumbers,
        sourceConfig.values
      )
    );
  });

  reports.sort((a, b) => {

    const timeDifference =
      Number(b._sortTime || 0) -
      Number(a._sortTime || 0);

    return timeDifference ||
      Number(b._rowNumber || 0) -
      Number(a._rowNumber || 0);
  });

  return reports.map(report => {
    const {
      _sortTime,
      _rowNumber,
      ...cleanReport
    } = report;

    return cleanReport;
  });
}


/**
 * =========================================================
 * تحويل تاريخ رفع التقرير إلى قيمة قابلة للترتيب
 * =========================================================
 */
function parseReportUploadDate(value) {

  if (!value) {
    return 0;
  }


  /*
   * محاولة JavaScript العادية أولاً.
   */
  const normalDate =
    new Date(value);


  if (
    !isNaN(
      normalDate.getTime()
    )
  ) {
    return normalDate.getTime();
  }


  /*
   * معالجة بعض صيغ Google Sheets
   * مثل:
   * 24/08/2026 06:30:15 م
   */
  const text =
    convertArabicDigitsToEnglish(
      String(value)
    )
      .trim();


  const match =
    text.match(
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?\s*(ص|م|AM|PM)?/i
    );


  if (!match) {
    return 0;
  }


  const day =
    Number(match[1]);

  const month =
    Number(match[2]) - 1;

  const year =
    Number(match[3]);

  let hour =
    Number(match[4] || 0);

  const minute =
    Number(match[5] || 0);

  const second =
    Number(match[6] || 0);

  const period =
    String(
      match[7] || ''
    ).toUpperCase();


  /*
   * تحويل 12 ساعة إلى 24 ساعة.
   */
  if (
    (period === 'م' || period === 'PM') &&
    hour < 12
  ) {
    hour += 12;
  }


  if (
    (period === 'ص' || period === 'AM') &&
    hour === 12
  ) {
    hour = 0;
  }


  const parsedDate =
    new Date(
      year,
      month,
      day,
      hour,
      minute,
      second
    );


  const timestamp =
    parsedDate.getTime();


  return isNaN(timestamp)
    ? 0
    : timestamp;
}

/**
 * =========================================================
 * ورقة التقارير
 * =========================================================
 */
function getReportsSheet() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.REPORTS_SHEET
    );

  if (!sheet) {
    throw new Error(
      `لم يتم العثور على ورقة باسم ${CONFIG.REPORTS_SHEET}`
    );
  }

  return sheet;
}

/**
 * =========================================================
 * ورقة تقارير أسبوع المرور
 * =========================================================
 */
function getTrafficWeekSheet() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.TRAFFIC_WEEK_SHEET
    );

  if (!sheet) {
    throw new Error(
      `لم يتم العثور على ورقة باسم ${CONFIG.TRAFFIC_WEEK_SHEET}`
    );
  }

  return sheet;
}
/**
 * =========================================================
 * ورقة تقارير لحظة سلامة
 * =========================================================
 */
function getSafetyMomentReportsSheet() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SAFETY_MOMENT_SHEET
    );

  if (!sheet) {
    throw new Error(
      `لم يتم العثور على ورقة باسم ${CONFIG.SAFETY_MOMENT_SHEET}`
    );
  }

  return sheet;
}
/**
 * =========================================================
 * ورقة تقارير اليوم العالمي للدفاع المدني
 * =========================================================
 */
function getCivilDefenseReportsSheet() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.CIVIL_DEFENSE_SHEET
    );

  if (!sheet) {
    throw new Error(
      `لم يتم العثور على ورقة باسم ${CONFIG.CIVIL_DEFENSE_SHEET}`
    );
  }

  return sheet;
}
/**
 * =========================================================
 * تهيئة مجلد المدرسة
 * =========================================================
 *
 * - يبحث عن المدرسة مرة أخرى من الخادم.
 * - لا يعتمد على اسم المدرسة القادم من المتصفح.
 * - إذا كان Folder_ID موجودًا وصحيحًا يستخدمه.
 * - إذا لم يكن موجودًا ينشئ مجلدًا جديدًا.
 * - يسجل Folder_ID وتاريخ الإنشاء في Schools.
 */
function prepareSchoolFolder(data) {

  const loginNumber =
    normalizeSchoolNumber(
      data.loginNumber
    );

  if (!loginNumber) {
    return jsonResponse({
      success: false,
      error: 'NUMBER_REQUIRED',
      message: 'تعذر التحقق من المدرسة.'
    });
  }


  /*
   * منع عمليتين متزامنتين من إنشاء
   * مجلدين لنفس المدرسة.
   */
  const lock =
    LockService.getScriptLock();

  try {

    lock.waitLock(15000);

  } catch (error) {

    return jsonResponse({
      success: false,
      error: 'SYSTEM_BUSY',
      message: 'النظام مشغول حاليًا، يرجى المحاولة مرة أخرى.'
    });
  }


  try {

    /*
     * البحث عن المدرسة من الشيت.
     */
    const result =
      findSchoolByNumber(
        loginNumber
      );

    if (!result) {
      return jsonResponse({
        success: false,
        error: 'SCHOOL_NOT_FOUND',
        message: 'تعذر العثور على المدرسة.'
      });
    }


    /*
     * التحقق من حالة المدرسة.
     */
    const status =
      String(
        result.school[
          'حالة المدرسة'
        ] || ''
      ).trim();

    if (
      status &&
      status !== 'نشطة' &&
      status !== 'نشط'
    ) {

      return jsonResponse({
        success: false,
        error: 'SCHOOL_INACTIVE',
        message: 'المدرسة غير نشطة في النظام.'
      });
    }


    const sheet =
      getSchoolsSheet();

    const headers =
      Array.isArray(result.headers)
        ? result.headers
        : getHeaders(sheet);


    const folderIdColumn =
      headers.indexOf(
        'Folder_ID'
      );

    const folderDateColumn =
      headers.indexOf(
        'تاريخ إنشاء المجلد'
      );


    if (folderIdColumn === -1) {
      throw new Error(
        'العمود غير موجود: Folder_ID'
      );
    }


    if (folderDateColumn === -1) {
      throw new Error(
        'العمود غير موجود: تاريخ إنشاء المجلد'
      );
    }


    /*
     * =====================================================
     * هل لدى المدرسة مجلد سابق؟
     * =====================================================
     */

    const existingFolderId =
      String(
        result.school[
          'Folder_ID'
        ] || ''
      ).trim();


    if (existingFolderId) {

      try {

        const existingFolder =
          DriveApp.getFolderById(
            existingFolderId
          );


        /*
         * محاولة قراءة الاسم للتأكد
         * من أن المجلد متاح.
         */
        const existingFolderName =
          existingFolder.getName();


        return jsonResponse({
          success: true,

          alreadyExists: true,

          message:
            'مجلد المدرسة موجود مسبقًا.',

          data: {
            folderId:
              existingFolderId,

            folderName:
              existingFolderName
          }
        });


      } catch (error) {

        /*
         * إذا كان Folder_ID مسجلًا لكن
         * المجلد محذوف أو غير متاح،
         * لا ننشئ مجلدًا جديدًا بصمت.
         *
         * هذا يمنع التكرار غير المقصود.
         */
        console.error(
          'Existing folder error:',
          error
        );


        return jsonResponse({
          success: false,

          error:
            'FOLDER_NOT_ACCESSIBLE',

          message:
            'يوجد مجلد مسجل للمدرسة ولكنه غير متاح. يرجى مراجعة الإدارة.'
        });
      }
    }


    /*
     * =====================================================
     * إنشاء مجلد جديد
     * =====================================================
     */

    const rootFolder =
      DriveApp.getFolderById(
        CONFIG.ROOT_FOLDER_ID
      );


    /*
     * نتأكد أن المجلد الرئيسي متاح.
     */
    rootFolder.getName();


    const schoolName =
      String(
        result.school[
          'اسم المدرسة'
        ] || ''
      ).trim();


    const statisticalNumbers =
      String(
        result.school[
          'الأرقام الإحصائية'
        ] || ''
      ).trim();


    if (!schoolName) {
      throw new Error(
        'اسم المدرسة غير موجود.'
      );
    }


    /*
     * إنشاء اسم آمن للمجلد.
     */
    const folderName =
      buildSchoolFolderName(
        statisticalNumbers,
        schoolName
      );


    /*
     * إنشاء المجلد داخل المجلد الرئيسي.
     */
    const schoolFolder =
      rootFolder.createFolder(
        folderName
      );


    const newFolderId =
      schoolFolder.getId();


    /*
     * حفظ Folder ID.
     */
    const folderMetadata = [
      {
        columnIndex: folderIdColumn,
        value: newFolderId
      },
      {
        columnIndex: folderDateColumn,
        value: new Date()
      }
    ].sort(
      (a, b) =>
        a.columnIndex - b.columnIndex
    );

    if (
      folderMetadata[1].columnIndex ===
      folderMetadata[0].columnIndex + 1
    ) {
      sheet
        .getRange(
          result.rowNumber,
          folderMetadata[0].columnIndex + 1,
          1,
          2
        )
        .setValues([[
          folderMetadata[0].value,
          folderMetadata[1].value
        ]]);
    } else {
      folderMetadata.forEach(item => {
        sheet
          .getRange(
            result.rowNumber,
            item.columnIndex + 1
          )
          .setValue(item.value);
      });
    }


    SpreadsheetApp.flush();


    return jsonResponse({
      success: true,

      alreadyExists: false,

      message:
        'تم إنشاء مجلد المدرسة بنجاح.',

      data: {
        folderId:
          newFolderId,

        folderName:
          folderName
      }
    });


  } catch (error) {

    console.error(
      'prepareSchoolFolder Error:',
      error
    );

    return jsonResponse({
      success: false,
      error: 'FOLDER_CREATE_ERROR',
      message: 'تعذر تهيئة مجلد المدرسة. يرجى المحاولة مرة أخرى.'
    });

  } finally {

    lock.releaseLock();
  }
}


/**
 * =========================================================
 * تكوين اسم مجلد المدرسة
 * =========================================================
 */
function buildSchoolFolderName(
  statisticalNumbers,
  schoolName
) {

  /*
   * تنظيف الأرقام مع المحافظة
   * على الحروف الإنجليزية.
   */
  const numbers =
    String(
      statisticalNumbers || ''
    )
      .replace(
        /[\\/:*?"<>|]/g,
        '-'
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  /*
   * تنظيف اسم المدرسة.
   */
  const name =
    String(
      schoolName || ''
    )
      .replace(
        /[\\/:*?"<>|]/g,
        '-'
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  if (numbers) {
    return `${numbers} - ${name}`;
  }


  return name;
}

/**
 * =========================================================
 * مؤشر إنجاز المدرسة
 * =========================================================
 */
function readAchievementSheetValues(
  spreadsheet,
  sheetName,
  required
) {

  const sheet =
    spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    if (required) {
      throw new Error(
        `لم يتم العثور على ورقة ${sheetName}.`
      );
    }

    return [];
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return [];
  }

  return sheet
    .getRange(1, 1, lastRow, lastColumn)
    .getDisplayValues();
}


function getCachedAchievementSettings(
  spreadsheet
) {

  const cache =
    typeof CacheService !== 'undefined'
      ? CacheService.getScriptCache()
      : null;

  const cacheKey =
    'achievement-settings-v1';

  if (cache) {
    const cached = cache.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        cache.remove(cacheKey);
      }
    }
  }

  const values = readAchievementSheetValues(
    spreadsheet,
    CONFIG.SETTINGS_SHEET,
    true
  );

  const settings =
    parseAchievementSettings(values);

  if (cache) {
    cache.put(
      cacheKey,
      JSON.stringify(settings),
      300
    );
  }

  return settings;
}


/**
 * =========================================================
 * قراءة دليل المشرفين مرة واحدة لطلبات الإدارة
 * =========================================================
 */
function readSupervisorsDirectory() {

  const values =
    getSupervisorsSheet()
      .getDataRange()
      .getDisplayValues();

  if (values.length === 0) {
    return [];
  }

  const headers = values[0].map(
    header => String(header || '').trim()
  );

  const nationalIdIndex =
    headers.indexOf('السجل المدني');

  const roleIndex =
    headers.indexOf('الدور');

  const statusIndex =
    headers.indexOf('الحالة');

  if (
    nationalIdIndex === -1 ||
    roleIndex === -1 ||
    statusIndex === -1
  ) {
    throw new Error(
      'الأعمدة المطلوبة (السجل المدني، الدور، الحالة) غير موجودة في ورقة Supervisors.'
    );
  }

  return values.slice(1).map(
    (row, rowIndex) => {

      const record = {};

      headers.forEach((header, index) => {
        if (header) {
          record[header] = row[index] || '';
        }
      });

      return {
        record: record,
        rowNumber: rowIndex + 2,
        nationalId: normalizeNationalId(
          row[nationalIdIndex]
        ),
        role: String(
          row[roleIndex] || ''
        ).trim(),
        status: String(
          row[statusIndex] || ''
        ).trim()
      };
    }
  );
}


/**
 * =========================================================
 * تحقق مركزي من صلاحية مدير النظام
 * لا يثق بالدور القادم من الواجهة.
 * =========================================================
 */
function validateAdminAccess(
  nationalId,
  directory
) {

  const normalizedId =
    normalizeNationalId(nationalId);

  if (!normalizedId) {
    return {
      success: false,
      error: 'INVALID_NATIONAL_ID',
      message: 'السجل المدني غير صحيح.'
    };
  }

  const safeDirectory =
    Array.isArray(directory)
      ? directory
      : readSupervisorsDirectory();

  const entry = safeDirectory.find(
    item => item.nationalId === normalizedId
  );

  if (!entry || entry.role !== 'مدير') {
    return {
      success: false,
      error: 'FORBIDDEN',
      message:
        'ليس لديك صلاحية الوصول إلى لوحة مدير النظام.'
    };
  }

  if (entry.status !== 'نشط') {
    return {
      success: false,
      error: 'ACCOUNT_INACTIVE',
      message: 'حساب المدير غير نشط.'
    };
  }

  return {
    success: true,
    entry: entry
  };
}


function readAdminSchoolsTable() {

  const sheet = getSchoolsSheet();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  const values =
    lastRow > 0 && lastColumn > 0
      ? sheet.getRange(
          1,
          1,
          lastRow,
          lastColumn
        ).getDisplayValues()
      : [];

  const headers =
    values.length > 0
      ? values[0].map(
          header => String(header || '').trim()
        )
      : [];

  if (
    headers.indexOf(
      'السجل المدني للمشرف'
    ) === -1
  ) {
    throw new Error(
      'لم يتم العثور على عمود "السجل المدني للمشرف" في ورقة المدارس.'
    );
  }

  return {
    headers: headers,
    rows: values.slice(1)
  };
}


function isSchoolActiveForAdmin(school) {

  const status = String(
    school['حالة المدرسة'] || ''
  ).trim();

  return !status ||
    status === 'نشط' ||
    status === 'نشطة';
}


function createAdminSupervisorItem(entry) {

  const record = entry.record || {};

  return {
    supervisorId: String(
      record['Supervisor_ID'] ||
      `SUP-ROW-${entry.rowNumber}`
    ).trim(),
    supervisorName: String(
      record['اسم المشرف'] || ''
    ).trim(),
    status: entry.status,
    totalSchools: 0,
    averageAchievement: 0,
    completedSchools: 0,
    pendingSchools: 0,
    achievementStatus: 'يحتاج متابعة',
    _achievementTotal: 0
  };
}


function finalizeAdminDashboardData(
  admin,
  supervisors,
  schools
) {

  const supervisorById = new Map();

  supervisors.forEach(supervisor => {
    supervisorById.set(
      supervisor.supervisorId,
      supervisor
    );
  });

  schools.forEach(school => {

    if (!school.supervisorId) {
      return;
    }

    const supervisor =
      supervisorById.get(
        school.supervisorId
      );

    if (!supervisor) {
      return;
    }

    const percentage = Number(
      school?.achievement?.percentage
    ) || 0;

    supervisor.totalSchools++;
    supervisor._achievementTotal +=
      percentage;

    if (percentage >= 100) {
      supervisor.completedSchools++;
    } else {
      supervisor.pendingSchools++;
    }
  });

  supervisors.forEach(supervisor => {

    supervisor.averageAchievement =
      supervisor.totalSchools > 0
        ? Math.round(
            supervisor._achievementTotal /
            supervisor.totalSchools
          )
        : 0;

    supervisor.achievementStatus =
      supervisor.totalSchools > 0 &&
      supervisor.pendingSchools === 0
        ? 'مكتمل'
        : 'يحتاج متابعة';

    delete supervisor._achievementTotal;
  });

  supervisors.sort((a, b) => {

    const difference =
      a.averageAchievement -
      b.averageAchievement;

    return difference ||
      a.supervisorName.localeCompare(
        b.supervisorName,
        'ar'
      );
  });

  const totalSchools = schools.length;
  const completedSchools = schools.filter(
    school =>
      Number(
        school?.achievement?.percentage
      ) >= 100
  ).length;

  const achievementTotal = schools.reduce(
    (total, school) =>
      total + (
        Number(
          school?.achievement?.percentage
        ) || 0
      ),
    0
  );

  return {
    admin: admin,
    summary: {
      totalSupervisors: supervisors.length,
      completedSupervisors:
        supervisors.filter(
          supervisor =>
            supervisor.achievementStatus ===
            'مكتمل'
        ).length,
      pendingSupervisors:
        supervisors.filter(
          supervisor =>
            supervisor.achievementStatus !==
            'مكتمل'
        ).length,
      totalSchools: totalSchools,
      completedSchools: completedSchools,
      pendingSchools:
        totalSchools - completedSchools,
      unassignedSchools:
        schools.filter(
          school => !school.supervisorId
        ).length,
      averageAchievement:
        totalSchools > 0
          ? Math.round(
              achievementTotal /
              totalSchools
            )
          : 0
    },
    supervisors: supervisors,
    schools: schools
  };
}


/**
 * =========================================================
 * لوحة مدير النظام - طلب واحد وBatch Context واحد
 * =========================================================
 */
function getAdminDashboard(e) {

  const startedAt = Date.now();

  try {

    const nationalId =
      e && e.parameter
        ? e.parameter.nationalId
        : '';

    const readStartedAt = Date.now();
    const directory =
      readSupervisorsDirectory();

    const authorization =
      validateAdminAccess(
        nationalId,
        directory
      );

    if (!authorization.success) {
      return jsonResponse(authorization);
    }

    const schoolTable =
      readAdminSchoolsTable();
    const dataReadAt = Date.now();

    const contextStartedAt = Date.now();
    const achievementContext =
      buildAchievementContext();
    const contextBuiltAt = Date.now();

    const supervisors = [];
    const supervisorByNationalId =
      new Map();

    directory
      .filter(entry => entry.role === 'مشرف')
      .forEach(entry => {

        const item =
          createAdminSupervisorItem(entry);

        supervisors.push(item);

        if (entry.nationalId) {
          supervisorByNationalId.set(
            entry.nationalId,
            item
          );
        }
      });

    const schools = [];

    schoolTable.rows.forEach(row => {

      const school = {};

      schoolTable.headers.forEach(
        (header, index) => {
          if (header) {
            school[header] = row[index] || '';
          }
        }
      );

      if (!isSchoolActiveForAdmin(school)) {
        return;
      }

      const schoolNumbers =
        extractSchoolNumbers(
          school['الأرقام الإحصائية'] || ''
        );

      const loginNumber =
        normalizeSchoolNumber(
          school['الرقم الإحصائي'] ||
          school['الرقم الإحصائي المستخدم'] ||
          ''
        );

      if (
        loginNumber &&
        !schoolNumbers.includes(loginNumber)
      ) {
        schoolNumbers.push(loginNumber);
      }

      const supervisorNationalId =
        normalizeNationalId(
          school['السجل المدني للمشرف'] || ''
        );

      const assignedSupervisor =
        supervisorNationalId
          ? supervisorByNationalId.get(
              supervisorNationalId
            )
          : null;

      schools.push({
        schoolName: String(
          school['اسم المدرسة'] || ''
        ).trim(),
        statisticalNumbers: schoolNumbers,
        governorate: String(
          school['المحافظة'] || ''
        ).trim(),
        city: String(
          school['المدينة'] || ''
        ).trim(),
        staffType: String(
          school['الكادر'] || ''
        ).trim(),
        schoolStatus: String(
          school['حالة المدرسة'] || ''
        ).trim(),
        supervisorId:
          assignedSupervisor
            ? assignedSupervisor.supervisorId
            : null,
        supervisorName:
          assignedSupervisor
            ? assignedSupervisor.supervisorName
            : 'غير مسندة',
        supervisorStatus:
          assignedSupervisor
            ? assignedSupervisor.status
            : null,
        achievement:
          calculateSchoolAchievementFromContext(
            school,
            achievementContext,
            schoolNumbers[0]
          )
      });
    });

    schools.sort(
      (a, b) =>
        a.schoolName.localeCompare(
          b.schoolName,
          'ar'
        )
    );

    const achievementsCalculatedAt =
      Date.now();

    const adminRecord =
      authorization.entry.record || {};

    const data = finalizeAdminDashboardData(
      {
        id: String(
          adminRecord['Supervisor_ID'] || ''
        ).trim(),
        name: String(
          adminRecord['اسم المشرف'] || ''
        ).trim(),
        role: 'مدير'
      },
      supervisors,
      schools
    );

    const aggregatedAt = Date.now();

    console.log(
      'getAdminDashboard performance',
      JSON.stringify({
        supervisorCount:
          data.summary.totalSupervisors,
        schoolCount:
          data.summary.totalSchools,
        reportRowCount:
          achievementContext.reportRowCount,
        dataReadMs:
          dataReadAt - readStartedAt,
        buildAchievementContextMs:
          contextBuiltAt - contextStartedAt,
        calculateAchievementsMs:
          achievementsCalculatedAt -
          contextBuiltAt,
        aggregateBySupervisorMs:
          aggregatedAt -
          achievementsCalculatedAt,
        totalMs:
          aggregatedAt - startedAt
      })
    );

    return jsonResponse({
      success: true,
      data: data
    });

  } catch (error) {

    console.error(
      'getAdminDashboard Error:',
      error
    );

    return jsonResponse({
      success: false,
      error: 'GET_ADMIN_DASHBOARD_FAILED',
      message:
        'تعذر تحميل بيانات لوحة مدير النظام.'
    });
  }
}


function parseAchievementSettings(values) {

  const settings = {};

  for (let i = 1; i < values.length; i++) {
    const key =
      String(values[i][0] || '').trim();

    const value = Number(values[i][1]);

    if (key) {
      settings[key] =
        Number.isFinite(value)
          ? Math.max(0, Math.floor(value))
          : 0;
    }
  }

  return {
    evacuationTarget:
      settings.EVACUATION_TARGET ?? 4,
    safetyMomentTarget:
      settings.SAFETY_MOMENT_TARGET ?? 4,
    civilDefenseTarget:
      settings.CIVIL_DEFENSE_TARGET ?? 1,
    trafficWeekTarget:
      settings.TRAFFIC_WEEK_TARGET ?? 1
  };
}


function buildReportCountIndex(
  values,
  sheetName
) {

  const counts = new Map();

  if (values.length < 2) {
    return counts;
  }

  const headers = values[0].map(
    header => String(header).trim()
  );

  const numberIndex = headers.indexOf(
    'الرقم الإحصائي المستخدم'
  );

  const statusIndex = headers.indexOf(
    'حالة التقرير'
  );

  if (numberIndex === -1) {
    throw new Error(
      `العمود "الرقم الإحصائي المستخدم" غير موجود في ${sheetName}`
    );
  }

  if (statusIndex === -1) {
    throw new Error(
      `العمود "حالة التقرير" غير موجود في ${sheetName}`
    );
  }

  for (let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++) {

    const reportNumber =
      normalizeSchoolNumber(
        values[rowIndex][numberIndex]
      );

    const status = String(
      values[rowIndex][statusIndex] || ''
    ).trim();

    if (reportNumber && status === 'مرفوع') {
      counts.set(
        reportNumber,
        (counts.get(reportNumber) || 0) + 1
      );
    }
  }

  return counts;
}


function buildEvacuationAchievementIndex(values) {

  const index = new Map();

  if (values.length < 2) {
    return index;
  }

  const headers = values[0].map(
    header => String(header).trim()
  );

  const numberIndex = headers.indexOf(
    'الرقم الإحصائي المستخدم'
  );

  const planIndex = headers.indexOf(
    'رقم خطة الإخلاء'
  );

  const statusIndex = headers.indexOf(
    'حالة التقرير'
  );

  if (numberIndex === -1 || planIndex === -1) {
    throw new Error(
      'الأعمدة المطلوبة لحساب خطط الإخلاء غير موجودة في Reports.'
    );
  }

  for (let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++) {

    const row = values[rowIndex];
    const reportNumber =
      normalizeSchoolNumber(row[numberIndex]);

    if (!reportNumber) {
      continue;
    }

    if (statusIndex !== -1) {
      const status =
        String(row[statusIndex] || '').trim();

      if (status && status !== 'مرفوع') {
        continue;
      }
    }

    let achievement = index.get(reportNumber);

    if (!achievement) {
      achievement = {
        uploaded: 0,
        plans: {
          1: false,
          2: false,
          3: false,
          4: false
        }
      };
      index.set(reportNumber, achievement);
    }

    achievement.uploaded++;

    const planNumber = Number(
      convertArabicDigitsToEnglish(
        row[planIndex]
      )
    );

    if (
      Number.isInteger(planNumber) &&
      [1, 2, 3, 4].includes(planNumber)
    ) {
      achievement.plans[planNumber] = true;
    }
  }

  return index;
}


function buildAchievementContext(options) {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const settings =
    getCachedAchievementSettings(
      spreadsheet
    );

  const evacuationValues =
    readAchievementSheetValues(
      spreadsheet,
      CONFIG.REPORTS_SHEET,
      false
    );

  const safetyMomentValues =
    readAchievementSheetValues(
      spreadsheet,
      CONFIG.SAFETY_MOMENT_SHEET,
      false
    );

  const civilDefenseValues =
    readAchievementSheetValues(
      spreadsheet,
      CONFIG.CIVIL_DEFENSE_SHEET,
      false
    );

  const trafficWeekValues =
    readAchievementSheetValues(
      spreadsheet,
      CONFIG.TRAFFIC_WEEK_SHEET,
      false
    );

  const context = {
    settings: settings,
    evacuationBySchoolNumber:
      buildEvacuationAchievementIndex(
        evacuationValues
      ),
    safetyMomentBySchoolNumber:
      buildReportCountIndex(
        safetyMomentValues,
        CONFIG.SAFETY_MOMENT_SHEET
      ),
    civilDefenseBySchoolNumber:
      buildReportCountIndex(
        civilDefenseValues,
        CONFIG.CIVIL_DEFENSE_SHEET
      ),
    trafficWeekBySchoolNumber:
      buildReportCountIndex(
        trafficWeekValues,
        CONFIG.TRAFFIC_WEEK_SHEET
      ),
    reportRowCount:
      Math.max(0, evacuationValues.length - 1) +
      Math.max(0, safetyMomentValues.length - 1) +
      Math.max(0, civilDefenseValues.length - 1) +
      Math.max(0, trafficWeekValues.length - 1)
  };

  if (options?.includeSourceValues === true) {
    context.sourceValues = {
      evacuation: evacuationValues,
      safetyMoment: safetyMomentValues,
      civilDefense: civilDefenseValues,
      trafficWeek: trafficWeekValues
    };
  }

  return context;
}


function calculateSchoolAchievementFromContext(
  school,
  context,
  schoolNumber
) {

  const loginNumber =
    normalizeSchoolNumber(schoolNumber);

  const schoolNumbers =
    extractSchoolNumbers(
      school['الأرقام الإحصائية'] || ''
    );

  if (
    loginNumber &&
    !schoolNumbers.includes(loginNumber)
  ) {
    schoolNumbers.push(loginNumber);
  }

  // Old calculations use includes(), so duplicate numbers in the
  // school cell must not multiply a report row.
  const uniqueSchoolNumbers =
    Array.from(new Set(schoolNumbers));

  const evacuationAchievement = {
    uploaded: 0,
    completed: 0,
    plans: {
      1: false,
      2: false,
      3: false,
      4: false
    }
  };

  let safetyMomentCount = 0;
  let civilDefenseCount = 0;
  let trafficWeekCount = 0;

  uniqueSchoolNumbers.forEach(number => {
    const evacuation =
      context.evacuationBySchoolNumber.get(
        number
      );

    if (evacuation) {
      evacuationAchievement.uploaded +=
        evacuation.uploaded;

      [1, 2, 3, 4].forEach(planNumber => {
        if (evacuation.plans[planNumber]) {
          evacuationAchievement
            .plans[planNumber] = true;
        }
      });
    }

    safetyMomentCount +=
      context.safetyMomentBySchoolNumber
        .get(number) || 0;

    civilDefenseCount +=
      context.civilDefenseBySchoolNumber
        .get(number) || 0;

    trafficWeekCount +=
      context.trafficWeekBySchoolNumber
        .get(number) || 0;
  });

  evacuationAchievement.completed =
    Object.values(
      evacuationAchievement.plans
    ).filter(Boolean).length;

  const settings = context.settings;

  const evacuationScore = Math.min(
    evacuationAchievement.completed,
    settings.evacuationTarget
  );

  const safetyMomentScore = Math.min(
    safetyMomentCount,
    settings.safetyMomentTarget
  );

  const civilDefenseScore = Math.min(
    civilDefenseCount,
    settings.civilDefenseTarget
  );

  const trafficWeekScore = Math.min(
    trafficWeekCount,
    settings.trafficWeekTarget
  );

  const score =
    evacuationScore +
    safetyMomentScore +
    civilDefenseScore +
    trafficWeekScore;

  const maxScore =
    settings.evacuationTarget +
    settings.safetyMomentTarget +
    settings.civilDefenseTarget +
    settings.trafficWeekTarget;

  const percentage =
    maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : 0;

  return {
    schoolNumber: loginNumber,
    score: score,
    maxScore: maxScore,
    percentage: percentage,
    evacuation: {
      completed: evacuationScore,
      uploaded: evacuationAchievement.uploaded,
      target: settings.evacuationTarget,
      plans: evacuationAchievement.plans
    },
    safetyMoment: {
      completed: safetyMomentScore,
      uploaded: safetyMomentCount,
      target: settings.safetyMomentTarget
    },
    civilDefense: {
      completed: civilDefenseScore,
      uploaded: civilDefenseCount,
      target: settings.civilDefenseTarget
    },
    trafficWeek: {
      completed: trafficWeekScore,
      uploaded: trafficWeekCount,
      target: settings.trafficWeekTarget
    },
    message: getAchievementMessage(
      score,
      maxScore
    )
  };
}


function getSchoolAchievement(e) {

  const loginNumber =
    normalizeSchoolNumber(
      e?.parameter?.number
    );

  if (!loginNumber) {
    return jsonResponse({
      success: false,
      error: 'NUMBER_REQUIRED',
      message: 'تعذر التحقق من المدرسة.'
    });
  }

  const schoolResult =
    findSchoolByNumber(loginNumber);

  if (!schoolResult) {
    return jsonResponse({
      success: false,
      error: 'SCHOOL_NOT_FOUND',
      message: 'تعذر العثور على المدرسة.'
    });
  }


  // جميع أرقام المدرسة حتى لو دخلت برقم مختلف.
  const schoolNumbers =
    extractSchoolNumbers(
      schoolResult.school['الأرقام الإحصائية'] || ''
    );

  if (!schoolNumbers.includes(loginNumber)) {
    schoolNumbers.push(loginNumber);
  }


  // قراءة الأهداف من Settings.
  const settings =
    getAchievementSettings();


  // عدد التقارير الفعلية.
  // قراءة خطط الإخلاء الأربع بشكل مستقل
  const evacuationAchievement =
  getEvacuationAchievement(
    schoolNumbers
  );

   // عدد الخطط المختلفة المكتملة من 4
   const evacuationCount =
  evacuationAchievement.completed;

  const safetyMomentCount =
    countSchoolReportsForAchievement(
      CONFIG.SAFETY_MOMENT_SHEET,
      schoolNumbers
    );

  const civilDefenseCount =
    countSchoolReportsForAchievement(
      CONFIG.CIVIL_DEFENSE_SHEET,
      schoolNumbers
    );

  const trafficWeekCount =
    countSchoolReportsForAchievement(
      CONFIG.TRAFFIC_WEEK_SHEET,
      schoolNumbers
    );


  // لا نسمح بتجاوز الهدف.
  const evacuationScore =
    Math.min(
      evacuationCount,
      settings.evacuationTarget
    );

  const safetyMomentScore =
    Math.min(
      safetyMomentCount,
      settings.safetyMomentTarget
    );

  const civilDefenseScore =
    Math.min(
      civilDefenseCount,
      settings.civilDefenseTarget
    );

  const trafficWeekScore =
    Math.min(
      trafficWeekCount,
      settings.trafficWeekTarget
    );


  const score =
    evacuationScore +
    safetyMomentScore +
    civilDefenseScore +
    trafficWeekScore;

  const maxScore =
    settings.evacuationTarget +
    settings.safetyMomentTarget +
    settings.civilDefenseTarget +
    settings.trafficWeekTarget;

  const percentage =
    maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : 0;


  return jsonResponse({
    success: true,

    data: {
      score: score,
      maxScore: maxScore,
      percentage: percentage,

      evacuation: {
  // عدد الخطط المختلفة المكتملة من الأربع
      completed: evacuationScore,

  // العدد الفعلي لجميع تقارير الإخلاء المرفوعة
      uploaded: evacuationAchievement.uploaded,

  // الهدف المحدد في Settings
      target: settings.evacuationTarget,

  // حالة كل خطة إخلاء على حدة
      plans: evacuationAchievement.plans
       },

      safetyMoment: {
        completed: safetyMomentScore,
        uploaded: safetyMomentCount,
        target: settings.safetyMomentTarget
      },

      civilDefense: {
        completed: civilDefenseScore,
        uploaded: civilDefenseCount,
        target: settings.civilDefenseTarget
      },

      trafficWeek: {
        completed: trafficWeekScore,
        uploaded: trafficWeekCount,
        target: settings.trafficWeekTarget
      },

      message:
        getAchievementMessage(
          score,
          maxScore
        )
    }
  });
}
/**
 * =========================================================
 * حساب إنجاز مدرسة داخلياً بواسطة الرقم الإحصائي
 * تستخدمها لوحة المشرف بدون الحاجة إلى طلب HTTP جديد
 * =========================================================
 */
function calculateSchoolAchievementByNumber(schoolNumber) {

  const loginNumber = normalizeSchoolNumber(schoolNumber);

  if (!loginNumber) {
    return null;
  }

  const schoolResult = findSchoolByNumber(loginNumber);

  if (!schoolResult) {
    return null;
  }

  // جميع الأرقام الإحصائية التابعة لنفس المدرسة
  const schoolNumbers = extractSchoolNumbers(
    schoolResult.school['الأرقام الإحصائية'] || ''
  );

  if (!schoolNumbers.includes(loginNumber)) {
    schoolNumbers.push(loginNumber);
  }

  const settings = getAchievementSettings();

  // خطط الإخلاء الأربع
  const evacuationAchievement =
    getEvacuationAchievement(schoolNumbers);

  const evacuationCount =
    evacuationAchievement.completed;

  // لحظة سلامة
  const safetyMomentCount =
    countSchoolReportsForAchievement(
      CONFIG.SAFETY_MOMENT_SHEET,
      schoolNumbers
    );

  // الدفاع المدني
  const civilDefenseCount =
    countSchoolReportsForAchievement(
      CONFIG.CIVIL_DEFENSE_SHEET,
      schoolNumbers
    );

  // أسبوع المرور
  const trafficWeekCount =
    countSchoolReportsForAchievement(
      CONFIG.TRAFFIC_WEEK_SHEET,
      schoolNumbers
    );

  // احتساب الدرجات مع عدم تجاوز الهدف
  const evacuationScore = Math.min(
    evacuationCount,
    settings.evacuationTarget
  );

  const safetyMomentScore = Math.min(
    safetyMomentCount,
    settings.safetyMomentTarget
  );

  const civilDefenseScore = Math.min(
    civilDefenseCount,
    settings.civilDefenseTarget
  );

  const trafficWeekScore = Math.min(
    trafficWeekCount,
    settings.trafficWeekTarget
  );

  const score =
    evacuationScore +
    safetyMomentScore +
    civilDefenseScore +
    trafficWeekScore;

  const maxScore =
    settings.evacuationTarget +
    settings.safetyMomentTarget +
    settings.civilDefenseTarget +
    settings.trafficWeekTarget;

  const percentage =
    maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : 0;

  return {
    schoolNumber: loginNumber,

    score: score,
    maxScore: maxScore,
    percentage: percentage,

    evacuation: {
      completed: evacuationScore,
      uploaded: evacuationAchievement.uploaded,
      target: settings.evacuationTarget,
      plans: evacuationAchievement.plans
    },

    safetyMoment: {
      completed: safetyMomentScore,
      uploaded: safetyMomentCount,
      target: settings.safetyMomentTarget
    },

    civilDefense: {
      completed: civilDefenseScore,
      uploaded: civilDefenseCount,
      target: settings.civilDefenseTarget
    },

    trafficWeek: {
      completed: trafficWeekScore,
      uploaded: trafficWeekCount,
      target: settings.trafficWeekTarget
    },

    message: getAchievementMessage(
      score,
      maxScore
    )
  };
}
/**
 * =========================================================
 * قراءة حالة خطط الإخلاء الأربع للمدرسة
 * =========================================================
 */
function getEvacuationAchievement(schoolNumbers) {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.REPORTS_SHEET
    );

  const result = {
    uploaded: 0,
    completed: 0,
    plans: {
      1: false,
      2: false,
      3: false,
      4: false
    }
  };

  if (!sheet) {
    return result;
  }

  const values =
    sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return result;
  }

  const headers =
    values[0].map(
      header => String(header).trim()
    );

  const numberIndex =
    headers.indexOf(
      'الرقم الإحصائي المستخدم'
    );

  const planIndex =
    headers.indexOf(
      'رقم خطة الإخلاء'
    );

  const statusIndex =
    headers.indexOf(
      'حالة التقرير'
    );

  if (
    numberIndex === -1 ||
    planIndex === -1
  ) {
    throw new Error(
      'الأعمدة المطلوبة لحساب خطط الإخلاء غير موجودة في Reports.'
    );
  }

  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {

    const row = values[rowIndex];

    const reportSchoolNumber =
      normalizeSchoolNumber(
        row[numberIndex]
      );

    if (
      !reportSchoolNumber ||
      !schoolNumbers.includes(
        reportSchoolNumber
      )
    ) {
      continue;
    }

    // إذا كان عمود الحالة موجودًا،
    // فلا نحسب إلا التقرير المرفوع.
    if (statusIndex !== -1) {

      const status =
        String(
          row[statusIndex] || ''
        ).trim();

      if (
        status &&
        status !== 'مرفوع'
      ) {
        continue;
      }
    }

    // العدد الفعلي لجميع تقارير الإخلاء.
    result.uploaded++;

    const planNumber =
      Number(
        convertArabicDigitsToEnglish(
          row[planIndex]
        )
      );

    if (
      Number.isInteger(planNumber) &&
      [1, 2, 3, 4].includes(planNumber)
    ) {
      result.plans[planNumber] = true;
    }
  }

  result.completed =
    Object.values(
      result.plans
    ).filter(Boolean).length;

  return result;
}

/**
 * =========================================================
 * قراءة إعدادات مؤشر الإنجاز
 * =========================================================
 */
function getAchievementSettings() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SETTINGS_SHEET
    );

  if (!sheet) {
    throw new Error(
      'لم يتم العثور على ورقة Settings.'
    );
  }

  const values =
    sheet.getDataRange().getDisplayValues();

  const settings = {};

  for (let i = 1; i < values.length; i++) {

    const key =
      String(values[i][0] || '').trim();

    const value =
      Number(values[i][1]);

    if (key) {
      settings[key] =
        Number.isFinite(value)
          ? Math.max(0, Math.floor(value))
          : 0;
    }
  }


  return {
    evacuationTarget:
      settings.EVACUATION_TARGET ?? 4,

    safetyMomentTarget:
      settings.SAFETY_MOMENT_TARGET ?? 4,

    civilDefenseTarget:
      settings.CIVIL_DEFENSE_TARGET ?? 1,

    trafficWeekTarget:
      settings.TRAFFIC_WEEK_TARGET ?? 1
  };
}


/**
 * =========================================================
 * حساب تقارير مدرسة في ورقة معينة
 * =========================================================
 */
function countSchoolReportsForAchievement(
  sheetName,
  schoolNumbers
) {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return 0;
  }

  const values =
    sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return 0;
  }

  const headers =
    values[0].map(
      header => String(header).trim()
    );

  const numberIndex =
    headers.indexOf(
      'الرقم الإحصائي المستخدم'
    );

  const statusIndex =
    headers.indexOf(
      'حالة التقرير'
    );

  if (numberIndex === -1) {
    throw new Error(
      `العمود "الرقم الإحصائي المستخدم" غير موجود في ${sheetName}`
    );
  }

  if (statusIndex === -1) {
    throw new Error(
      `العمود "حالة التقرير" غير موجود في ${sheetName}`
    );
  }


  let count = 0;

  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {

    const reportNumber =
      normalizeSchoolNumber(
        values[rowIndex][numberIndex]
      );

    const status =
      String(
        values[rowIndex][statusIndex] || ''
      ).trim();

    if (
      reportNumber &&
      schoolNumbers.includes(reportNumber) &&
      status === 'مرفوع'
    ) {
      count++;
    }
  }

  return count;
}


/**
 * =========================================================
 * الرسالة التحفيزية
 * =========================================================
 */
function getAchievementMessage(
  score,
  maxScore
) {

  if (score <= 0) {
    return 'ابدأ رحلة الإنجاز في تعزيز السلامة المدرسية 🌱';
  }

  if (score >= maxScore) {
    return 'مبروك! اكتملت رحلة الإنجاز في السلامة المدرسية 🏆✨';
  }

  const remaining =
    maxScore - score;

  if (remaining === 1) {
    return 'إنجاز استثنائي! بقيت خطوة واحدة لإكمال رحلة الإنجاز 🌟';
  }

  if (score >= maxScore * 0.7) {
    return `أداء مميز! بقيت ${remaining} خطوات لإكمال رحلة الإنجاز 🚀`;
  }

  if (score >= maxScore * 0.5) {
    return `رائع! تجاوزتم منتصف رحلة الإنجاز، بقيت ${remaining} خطوات 🌟`;
  }

  return `تقدم جميل! بقيت ${remaining} خطوات لإكمال رحلة الإنجاز 👏`;
}
