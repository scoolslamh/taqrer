const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const headers = [
  'Report_ID',
  'الرقم الإحصائي المستخدم',
  'اسم المدرسة'
];

const rows = [headers.slice()];
let lockAcquisitions = 0;

function makeRange(values) {
  return {
    getDisplayValues() {
      return values.map(row => row.slice());
    }
  };
}

const reportsSheet = {
  getLastRow: () => rows.length,
  getLastColumn: () => headers.length,
  getRange(row, column, rowCount, columnCount) {
    return makeRange(
      rows
        .slice(row - 1, row - 1 + rowCount)
        .map(values =>
          values.slice(column - 1, column - 1 + columnCount)
        )
    );
  },
  appendRow(row) {
    rows.push(row.slice());
  }
};

const sandbox = {
  SpreadsheetApp: {
    getActiveSpreadsheet() {
      return {
        getSheetByName(name) {
          return name === 'Reports'
            ? reportsSheet
            : null;
        }
      };
    },
    flush() {}
  },
  LockService: {
    getScriptLock() {
      return {
        waitLock() {
          lockAcquisitions++;
        },
        releaseLock() {}
      };
    }
  },
  Utilities: {
    getUuid() {
      return '00000000-0000-4000-8000-000000000000';
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

const requestId =
  '12345678-1234-4123-8123-123456789abc';

const request = {
  loginNumber: '123456',
  uploadRequestId: requestId
};

const firstAttempt = sandbox.prepareReportUpload(
  'uploadEvacuationReport',
  request
);

assert.strictEqual(firstAttempt.reportId, requestId);
assert.strictEqual(firstAttempt.response, undefined);

const firstWrite = sandbox.appendRowWithScriptLock(
  reportsSheet,
  [requestId, '123456', 'مدرسة الاختبار'],
  {
    reportId: requestId,
    loginNumber: '123456'
  }
);

assert.strictEqual(firstWrite.duplicate, false);
assert.strictEqual(rows.length, 2);

const replayAttempt = sandbox.prepareReportUpload(
  'uploadEvacuationReport',
  request
);
const replayPayload = JSON.parse(
  replayAttempt.response.text
);

assert.strictEqual(replayPayload.success, true);
assert.strictEqual(replayPayload.data.reportId, requestId);
assert.strictEqual(replayPayload.data.duplicate, true);
assert.strictEqual(rows.length, 2);

const concurrentWrite = sandbox.appendRowWithScriptLock(
  reportsSheet,
  [requestId, '123456', 'مدرسة الاختبار'],
  {
    reportId: requestId,
    loginNumber: '123456'
  }
);

assert.strictEqual(concurrentWrite.duplicate, true);
assert.strictEqual(rows.length, 2);
assert.strictEqual(lockAcquisitions, 2);

const conflictingAttempt = sandbox.prepareReportUpload(
  'uploadEvacuationReport',
  {
    loginNumber: '999999',
    uploadRequestId: requestId
  }
);
const conflictPayload = JSON.parse(
  conflictingAttempt.response.text
);

assert.strictEqual(conflictPayload.success, false);
assert.strictEqual(
  conflictPayload.error,
  'UPLOAD_REQUEST_ID_CONFLICT'
);

const frontendSource = fs.readFileSync(
  __dirname + '/../index.html',
  'utf8'
);

assert.strictEqual(
  (frontendSource.match(/uploadRequestId:\s*\n\s*uploadRequestId/g) || [])
    .length,
  4,
  'all four upload payloads must send the stable request ID'
);
assert.strictEqual(
  (frontendSource.match(/clearPendingUploadRequest\(/g) || []).length,
  5,
  'one helper and four successful-upload cleanup calls expected'
);

console.log(
  'Report upload idempotency passed: replay and concurrent duplicate writes are blocked'
);
