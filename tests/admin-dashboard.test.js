const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const managerId = '1000000001';
const supervisorId = '1000000002';
const emptySupervisorId = '1000000003';
const inactiveManagerId = '1000000004';

const sheetRows = {
  Supervisors: [
    [
      'Supervisor_ID',
      'السجل المدني',
      'اسم المشرف',
      'الحالة',
      'الدور'
    ],
    ['ADM001', managerId, 'مدير نشط', 'نشط', 'مدير'],
    ['SUP001', supervisorId, 'مشرف أول', 'نشط', 'مشرف'],
    ['SUP002', emptySupervisorId, 'مشرف بلا مدارس', 'نشط', 'مشرف'],
    ['ADM002', inactiveManagerId, 'مدير غير نشط', 'غير نشط', 'مدير']
  ],
  Schools: [
    [
      'الأرقام الإحصائية',
      'اسم المدرسة',
      'المحافظة',
      'المدينة',
      'الكادر',
      'حالة المدرسة',
      'اسم مدير المدرسة',
      'جوال مدير المدرسة',
      'اسم منسق الأمن والسلامة',
      'جوال منسق الأمن والسلامة',
      'السجل المدني للمشرف'
    ],
    ['100001', 'مدرسة 100', 'أبها', 'أبها', 'تعليمي', 'نشطة', 'مدير المدرسة', '0500000001', 'منسق المدرسة', '0500000002', supervisorId],
    ['100002', 'مدرسة 80', 'أبها', 'أبها', 'تعليمي', 'نشطة', '', '', '', '', supervisorId],
    ['100003', 'مدرسة 60', 'خميس مشيط', 'خميس مشيط', 'تعليمي', 'نشطة', '', '', '', '', supervisorId],
    ['100004', 'مدرسة 40', 'خميس مشيط', 'خميس مشيط', 'تعليمي', 'نشطة', '', '', '', '', supervisorId],
    ['100005', 'مدرسة غير مسندة', 'أبها', 'أبها', 'تعليمي', 'نشطة', '', '', '', '', ''],
    ['100006', 'مدرسة غير نشطة', 'أبها', 'أبها', 'تعليمي', 'غير نشطة', '', '', '', '', supervisorId]
  ],
  'دليل المدارس': [
    ['الرقم الإحصائي', 'البريد الإلكتروني', 'الجنس'],
    ['٩٠٠٠٠١ / ١٠٠٠٠١', 'school100@edu.sa', 'بنين'],
    ['000100002', 'school80@edu.sa', 'بنات'],
    ['100003', 'school60@edu.sa', 'بنين'],
    ['100004', 'school40@edu.sa', 'بنات'],
    ['100005', 'unassigned@edu.sa', 'بنين']
  ],
  Settings: [
    ['KEY', 'VALUE'],
    ['EVACUATION_TARGET', '4'],
    ['SAFETY_MOMENT_TARGET', '4'],
    ['CIVIL_DEFENSE_TARGET', '1'],
    ['TRAFFIC_WEEK_TARGET', '1']
  ],
  Reports: [
    ['الرقم الإحصائي المستخدم', 'رقم خطة الإخلاء', 'حالة التقرير'],
    ...['100001', '100002', '100003', '100004']
      .flatMap(number => [1, 2, 3, 4]
        .map(plan => [number, String(plan), 'مرفوع']))
  ],
  SafetyMomentReports: [
    ['الرقم الإحصائي المستخدم', 'حالة التقرير'],
    ...Array.from({ length: 4 }, () => ['100001', 'مرفوع']),
    ...Array.from({ length: 2 }, () => ['100002', 'مرفوع'])
  ],
  CivilDefenseReports: [
    ['الرقم الإحصائي المستخدم', 'حالة التقرير'],
    ['100001', 'مرفوع'],
    ['100002', 'مرفوع'],
    ['100003', 'مرفوع']
  ],
  TrafficWeekReports: [
    ['الرقم الإحصائي المستخدم', 'حالة التقرير'],
    ['100001', 'مرفوع'],
    ['100002', 'مرفوع'],
    ['100003', 'مرفوع']
  ]
};

let displayReads = 0;

function makeRange(rows) {
  return {
    getValues() {
      displayReads++;
      return rows.map(row => row.slice());
    },
    getDisplayValues() {
      displayReads++;
      return rows.map(row => row.slice());
    }
  };
}

function makeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0]?.length || 0,
    getDataRange: () => makeRange(rows),
    getRange(row, column, rowCount, columnCount) {
      const range = makeRange(
        rows
          .slice(row - 1, row - 1 + rowCount)
          .map(values =>
            values.slice(column - 1, column - 1 + columnCount)
          )
      );
      range.setValues = values => {
        values.forEach((valuesRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset;
          while (rows.length <= targetRow) {
            rows.push([]);
          }
          valuesRow.forEach((value, columnOffset) => {
            rows[targetRow][
              column - 1 + columnOffset
            ] = value;
          });
        });
      };
      return range;
    }
  };
}

const spreadsheet = {
  getSheetByName(name) {
    return sheetRows[name]
      ? makeSheet(sheetRows[name])
      : null;
  }
};

const sandbox = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => spreadsheet
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput(text) {
      return {
        text,
        setMimeType() {
          return this;
        }
      };
    }
  },
  console,
  Map,
  Set,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Date
};

vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(
    __dirname + '/../apps-script/Code.gs',
    'utf8'
  ),
  sandbox
);

function callAdmin(nationalId) {
  const response = vm.runInContext(
    `getAdminDashboard({ parameter: { nationalId: '${nationalId}' } })`,
    sandbox
  );
  return JSON.parse(response.text);
}

displayReads = 0;
const forbidden = callAdmin(supervisorId);
assert.strictEqual(forbidden.success, false);
assert.strictEqual(forbidden.error, 'FORBIDDEN');
assert.strictEqual(displayReads, 1);

displayReads = 0;
const inactive = callAdmin(inactiveManagerId);
assert.strictEqual(inactive.success, false);
assert.strictEqual(inactive.error, 'ACCOUNT_INACTIVE');
assert.strictEqual(displayReads, 1);

displayReads = 0;
const result = callAdmin(managerId);

assert.strictEqual(result.success, true);
assert.strictEqual(displayReads, 9);
assert.strictEqual(result.data.admin.role, 'مدير');
assert.strictEqual(result.data.admin.nationalId, undefined);
assert.strictEqual(result.data.systemStatus.isOpen, true);
assert.strictEqual(result.data.systemStatus.status, 'OPEN');

const firstSupervisor = result.data.supervisors.find(
  supervisor => supervisor.supervisorId === 'SUP001'
);
assert.strictEqual(firstSupervisor.totalSchools, 4);
assert.strictEqual(firstSupervisor.averageAchievement, 70);
assert.strictEqual(firstSupervisor.completedSchools, 1);
assert.strictEqual(firstSupervisor.pendingSchools, 3);
assert.strictEqual(firstSupervisor.achievementStatus, 'يحتاج متابعة');

const emptySupervisor = result.data.supervisors.find(
  supervisor => supervisor.supervisorId === 'SUP002'
);
assert.strictEqual(emptySupervisor.totalSchools, 0);
assert.strictEqual(emptySupervisor.averageAchievement, 0);
assert.strictEqual(emptySupervisor.completedSchools, 0);
assert.strictEqual(emptySupervisor.pendingSchools, 0);
assert.strictEqual(emptySupervisor.achievementStatus, 'يحتاج متابعة');

assert.strictEqual(result.data.summary.totalSupervisors, 2);
assert.strictEqual(result.data.summary.totalSchools, 5);
assert.strictEqual(result.data.summary.completedSchools, 1);
assert.strictEqual(result.data.summary.pendingSchools, 4);
assert.strictEqual(result.data.summary.unassignedSchools, 1);
assert.strictEqual(result.data.summary.averageAchievement, 56);

const schoolWithContacts = result.data.schools.find(
  school => school.schoolName === 'مدرسة 100'
);
assert.strictEqual(
  schoolWithContacts.principalName,
  'مدير المدرسة'
);
assert.strictEqual(
  schoolWithContacts.principalPhone,
  '0500000001'
);
assert.strictEqual(
  schoolWithContacts.coordinatorName,
  'منسق المدرسة'
);
assert.strictEqual(
  schoolWithContacts.coordinatorPhone,
  '0500000002'
);
assert.strictEqual(
  schoolWithContacts.schoolEmail,
  'school100@edu.sa'
);
assert.strictEqual(
  schoolWithContacts.schoolGender,
  'بنين'
);

const unassigned = result.data.schools.find(
  school => school.schoolName === 'مدرسة غير مسندة'
);
assert.strictEqual(unassigned.supervisorId, null);
assert.strictEqual(unassigned.supervisorName, 'غير مسندة');
assert.strictEqual(unassigned.supervisorStatus, null);

const schoolWithLeadingZeros = result.data.schools.find(
  school => school.schoolName === 'مدرسة 80'
);
assert.strictEqual(
  schoolWithLeadingZeros.schoolGender,
  'بنات'
);

assert.ok(
  result.data.schools.every(
    school => school.supervisorNationalId === undefined
  )
);
assert.ok(
  !result.data.schools.some(
    school => school.schoolName === 'مدرسة غير نشطة'
  )
);

displayReads = 0;
const supervisorResponse = vm.runInContext(
  `getSupervisorSchools({ parameter: { nationalId: '${supervisorId}' } })`,
  sandbox
);
const supervisorResult = JSON.parse(
  supervisorResponse.text
);
assert.strictEqual(supervisorResult.success, true);
assert.strictEqual(
  supervisorResult.data.supervisor.role,
  'مشرف'
);
assert.strictEqual(
  supervisorResult.data.totalSchools,
  5
);
const supervisorSchool =
  supervisorResult.data.schools.find(
    school => school.schoolName === 'مدرسة 100'
  );
assert.strictEqual(
  supervisorSchool.principalPhone,
  '0500000001'
);
assert.strictEqual(
  supervisorSchool.coordinatorPhone,
  '0500000002'
);
assert.strictEqual(
  supervisorSchool.schoolEmail,
  'school100@edu.sa'
);
assert.strictEqual(
  supervisorSchool.schoolGender,
  'بنين'
);
assert.strictEqual(displayReads, 8);

const unauthorizedStatusResponse = vm.runInContext(
  `setSystemStatus({
    nationalId: '${supervisorId}',
    status: 'CLOSED',
    message: 'اختبار الإغلاق'
  })`,
  sandbox
);
const unauthorizedStatusResult = JSON.parse(
  unauthorizedStatusResponse.text
);
assert.strictEqual(
  unauthorizedStatusResult.success,
  false
);
assert.strictEqual(
  unauthorizedStatusResult.error,
  'FORBIDDEN'
);

const closeResponse = vm.runInContext(
  `setSystemStatus({
    nationalId: '${managerId}',
    status: 'CLOSED',
    message: 'تم إغلاق النظام للاختبار'
  })`,
  sandbox
);
const closeResult = JSON.parse(closeResponse.text);
assert.strictEqual(closeResult.success, true);
assert.strictEqual(
  closeResult.data.systemStatus.isOpen,
  false
);
assert.strictEqual(
  closeResult.data.systemStatus.message,
  'تم إغلاق النظام للاختبار'
);

const blockedSchoolResponse = vm.runInContext(
  `getSchoolByNumber({ parameter: { number: '100001' } })`,
  sandbox
);
const blockedSchoolResult = JSON.parse(
  blockedSchoolResponse.text
);
assert.strictEqual(blockedSchoolResult.success, false);
assert.strictEqual(
  blockedSchoolResult.error,
  'SYSTEM_CLOSED'
);

const openResponse = vm.runInContext(
  `setSystemStatus({
    nationalId: '${managerId}',
    status: 'OPEN',
    message: 'النظام متاح'
  })`,
  sandbox
);
const openResult = JSON.parse(openResponse.text);
assert.strictEqual(openResult.success, true);
assert.strictEqual(
  openResult.data.systemStatus.isOpen,
  true
);

console.log(
  'Admin dashboard passed: authorization, system open/close, directory matching, average=70, global=56, unassigned=1, fixed sheet reads=9, supervisor regression'
);
