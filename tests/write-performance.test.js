const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sheetRows = {
  Schools: [
    [
      'الأرقام الإحصائية',
      'اسم المدرسة',
      'المحافظة',
      'المدينة',
      'اسم مدير المدرسة',
      'جوال مدير المدرسة',
      'اسم منسق الأمن والسلامة',
      'جوال منسق الأمن والسلامة',
      'الكادر',
      'آخر تحديث للبيانات',
      'حالة المدرسة'
    ],
    [
      '123456',
      'مدرسة اختبار',
      'أبها',
      'قديم',
      '',
      '',
      '',
      '',
      'تعليمي',
      '',
      'نشطة'
    ]
  ],
  Supervisors: [
    [
      'Supervisor_ID',
      'السجل المدني',
      'اسم المشرف',
      'الحالة',
      'الدور',
      'آخر دخول'
    ],
    [
      'SUP001',
      '1000000001',
      'مشرف اختبار',
      'نشط',
      'مشرف',
      ''
    ]
  ]
};

let displayReads = 0;
let setValueCalls = 0;
let setValuesCalls = 0;
let flushCalls = 0;

function makeRange(rows, startRow, startColumn, rowCount, columnCount) {
  return {
    getDisplayValues() {
      displayReads++;
      return rows
        .slice(startRow, startRow + rowCount)
        .map(row =>
          row.slice(startColumn, startColumn + columnCount)
        );
    },
    setValue(value) {
      setValueCalls++;
      rows[startRow][startColumn] = value;
    },
    setValues(values) {
      setValuesCalls++;
      values.forEach((row, rowOffset) => {
        row.forEach((value, columnOffset) => {
          rows[startRow + rowOffset][
            startColumn + columnOffset
          ] = value;
        });
      });
    }
  };
}

function makeSheet(rows) {
  return {
    getLastColumn: () => rows[0].length,
    getDataRange: () =>
      makeRange(rows, 0, 0, rows.length, rows[0].length),
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return makeRange(
        rows,
        row - 1,
        column - 1,
        rowCount,
        columnCount
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
    },
    flush() {
      flushCalls++;
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

displayReads = 0;
setValuesCalls = 0;
flushCalls = 0;

const updateResponse = vm.runInContext(`updateSchool({
  loginNumber: '123456',
  city: 'أبها',
  principalName: 'مدير جديد',
  principalPhone: '0500000000',
  coordinatorName: 'منسق جديد',
  coordinatorPhone: '0511111111',
  staffType: 'تعليمي'
})`, sandbox);
const updateResult = JSON.parse(updateResponse.text);

assert.strictEqual(updateResult.success, true);
assert.strictEqual(updateResult.data.city, 'أبها');
assert.strictEqual(displayReads, 1);
assert.strictEqual(setValuesCalls, 1);
assert.strictEqual(flushCalls, 0);

displayReads = 0;
setValueCalls = 0;
flushCalls = 0;

const loginResponse = vm.runInContext(`supervisorLogin({
  nationalId: '1000000001'
})`, sandbox);
const loginResult = JSON.parse(loginResponse.text);

assert.strictEqual(loginResult.success, true);
assert.strictEqual(displayReads, 1);
assert.strictEqual(setValueCalls, 1);
assert.strictEqual(flushCalls, 0);

console.log(
  'Write performance passed: school update=1 read/1 batch write; login=1 read/1 write/no explicit flush'
);
