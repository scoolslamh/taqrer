const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const reportHeaders = [
  'Report_ID',
  'الرقم الإحصائي المستخدم',
  'تاريخ التنفيذ',
  'تاريخ الرفع',
  'حالة التقرير'
];

const sheetRows = {
  Schools: [
    [
      'الأرقام الإحصائية',
      'اسم المدرسة',
      'المحافظة',
      'المدينة',
      'حالة المدرسة'
    ],
    [
      '123456',
      'مدرسة اختبار التحميل',
      'أبها',
      'أبها',
      'نشطة'
    ]
  ],
  Settings: [
    ['KEY', 'VALUE'],
    ['EVACUATION_TARGET', '4'],
    ['SAFETY_MOMENT_TARGET', '4'],
    ['CIVIL_DEFENSE_TARGET', '1'],
    ['TRAFFIC_WEEK_TARGET', '1']
  ],
  Reports: [
    [...reportHeaders, 'رقم خطة الإخلاء', 'نوع التقرير'],
    ['R1', '123456', '2026-09-01', '2026-09-02', 'مرفوع', '1', 'تقرير خطة إخلاء']
  ],
  SafetyMomentReports: [
    [...reportHeaders, 'اسم البرنامج'],
    ['R2', '123456', '2026-09-01', '2026-09-02', 'مرفوع', 'لحظة سلامة']
  ],
  CivilDefenseReports: [
    [...reportHeaders, 'اسم البرنامج'],
    ['R3', '123456', '2026-09-01', '2026-09-02', 'مرفوع', 'الدفاع المدني']
  ],
  TrafficWeekReports: [
    [...reportHeaders, 'اسم البرنامج'],
    ['R4', '123456', '2026-09-01', '2026-09-02', 'مرفوع', 'أسبوع المرور']
  ]
};

let displayReads = 0;
const cacheValues = new Map();

function makeRange(rows) {
  return {
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
      return makeRange(
        rows
          .slice(row - 1, row - 1 + rowCount)
          .map(values =>
            values.slice(column - 1, column - 1 + columnCount)
          )
      );
    }
  };
}

const sandbox = {
  SpreadsheetApp: {
    getActiveSpreadsheet() {
      return {
        getSheetByName(name) {
          return sheetRows[name]
            ? makeSheet(sheetRows[name])
            : null;
        }
      };
    }
  },
  CacheService: {
    getScriptCache() {
      return {
        get: key => cacheValues.get(key) || null,
        put: (key, value) => cacheValues.set(key, value),
        remove: key => cacheValues.delete(key)
      };
    }
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

function loadDashboard() {
  const response = vm.runInContext(
    "doGet({ parameter: { action: 'getSchoolDashboard', number: '123456' } })",
    sandbox
  );
  return JSON.parse(response.text);
}

displayReads = 0;
const first = loadDashboard();
const coldReads = displayReads;

assert.strictEqual(first.success, true);
assert.strictEqual(first.data.school.schoolName, 'مدرسة اختبار التحميل');
assert.strictEqual(first.data.reports.length, 4);
assert.strictEqual(first.data.achievement.percentage, 40);
assert.strictEqual(coldReads, 6);

displayReads = 0;
const second = loadDashboard();
const warmReads = displayReads;

assert.deepStrictEqual(
  second.data,
  first.data
);
assert.strictEqual(warmReads, 5);

const backendSource = fs.readFileSync(
  __dirname + '/../apps-script/Code.gs',
  'utf8'
);
assert.match(
  backendSource,
  /function appendRowWithScriptLock[\s\S]*waitLock\(5000\)/
);
assert.strictEqual(
  (backendSource.match(/appendRowWithScriptLock\(/g) || []).length,
  5,
  'one helper declaration and four upload call sites expected'
);

console.log(
  `Unified school dashboard passed: cold reads=${coldReads}, warm reads=${warmReads}, reports reused without additional reads`
);
