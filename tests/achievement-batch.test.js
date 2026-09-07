const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sheetRows = {
  Schools: [
    ['الأرقام الإحصائية', 'اسم المدرسة', 'المحافظة'],
    ['123456, 654321', 'مدرسة اختبار', 'الرياض']
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
    ['123456', '1', 'مرفوع'],
    ['123456', '1', 'مرفوع'],
    ['654321', '2', 'مرفوع'],
    ['654321', '3', 'مسودة'],
    ['654321', '4', '']
  ],
  SafetyMomentReports: [
    ['الرقم الإحصائي المستخدم', 'حالة التقرير'],
    ['123456', 'مرفوع'],
    ['654321', 'مرفوع'],
    ['654321', 'مسودة']
  ],
  CivilDefenseReports: [
    ['الرقم الإحصائي المستخدم', 'حالة التقرير'],
    ['654321', 'مرفوع']
  ],
  TrafficWeekReports: [
    ['الرقم الإحصائي المستخدم', 'حالة التقرير'],
    ['123456', 'مرفوع'],
    ['654321', 'مرفوع']
  ]
};

let displayReads = 0;

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
      const selected = rows
        .slice(row - 1, row - 1 + rowCount)
        .map(values =>
          values.slice(column - 1, column - 1 + columnCount)
        );
      return makeRange(selected);
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
  fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8'),
  sandbox
);

displayReads = 0;
const legacy = vm.runInContext(
  "calculateSchoolAchievementByNumber('123456')",
  sandbox
);
const legacyReads = displayReads;

displayReads = 0;
const batch = vm.runInContext(`(() => {
  const context = buildAchievementContext();
  return calculateSchoolAchievementFromContext(
    {
      'الأرقام الإحصائية': '123456, 654321'
    },
    context,
    '123456'
  );
})()`, sandbox);
const batchReads = displayReads;

sandbox.buildAchievementContextForTest =
  vm.runInContext('buildAchievementContext()', sandbox);

const readsBeforeNineInMemoryCalculations =
  displayReads;

for (let i = 0; i < 9; i++) {
  vm.runInContext(`calculateSchoolAchievementFromContext(
    { 'الأرقام الإحصائية': '123456, 654321' },
    buildAchievementContextForTest,
    '123456'
  )`, sandbox);
}

const readsAfterNineInMemoryCalculations =
  displayReads;

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(batch)),
  JSON.parse(JSON.stringify(legacy))
);
assert.strictEqual(legacyReads, 6);
assert.strictEqual(batchReads, 5);
assert.strictEqual(
  readsAfterNineInMemoryCalculations,
  readsBeforeNineInMemoryCalculations
);
assert.strictEqual(batch.evacuation.uploaded, 4);
assert.strictEqual(batch.evacuation.completed, 3);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(batch.evacuation.plans)),
  { 1: true, 2: true, 3: false, 4: true }
);

console.log(
  `Achievement parity passed; legacy reads=${legacyReads}, batch context reads=${batchReads}; nine in-memory calculations added 0 reads`
);
