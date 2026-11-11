const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const sandbox = { console, Map, Set, Date, JSON, Math, Number, String, Object, Array };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8'), sandbox);
const evaluate = code => vm.runInContext(code, sandbox);

const defaults = evaluate('buildReportWindows({})');
assert.strictEqual(defaults.find(item => item.key === 'SHELTER_1').isOpen, false);
assert.strictEqual(defaults.find(item => item.key === 'SHELTER_2').isOpen, false);
assert.strictEqual(evaluate("buildReportWindows({ REPORT_WINDOW_SHELTER_1: 'OPEN' }).find(item => item.key === 'SHELTER_1').isOpen"), true);

const values = [
  ['الرقم الإحصائي المستخدم', 'الفصل الدراسي', 'حالة التقرير'],
  ['123456', '1', 'مرفوع'],
  ['123456', '1', 'مرفوع'],
  ['654321', '2', 'مرفوع'],
  ['123456', '2', 'ملغي'],
  ['999999', '2', 'مرفوع']
];
sandbox.values = values;
const achievement = evaluate("calculateShelterAchievement(values, ['123456', '654321'])");
assert.strictEqual(achievement.completed, 2);
assert.strictEqual(achievement.uploaded, 3);
assert.strictEqual(achievement.target, 2);

evaluate(`
  jsonResponse = value => value;
  readSystemStatus = () => ({ isOpen: true });
  getUploadReportWindow = () => ({ isOpen: false, label: 'خطة الاحتماء الفصل الأول' });
`);
const closed = evaluate('uploadShelterReport({ shelterSemester: 1 })');
assert.strictEqual(closed.error, 'REPORT_WINDOW_CLOSED');
assert.match(closed.message, /خارج الإطار الزمني المعتمد/);

const headers = ['Report_ID', 'الرقم الإحصائي المستخدم', 'الأرقام الإحصائية', 'اسم المدرسة', 'المحافظة', 'المدينة', 'نوع التقرير', 'الفصل الدراسي', 'تاريخ التنفيذ', ...Array.from({ length: 8 }, (_, i) => 'إجراء' + i), 'عدد المشاركين', 'زمن الاستجابة بالدقائق', 'زمن الاستجابة بالثواني', 'الملاحظات والإجراءات التحسينية', 'حالة التقرير'];
sandbox.headers = headers;
sandbox.created = 0;
sandbox.rows = [];
evaluate(`
  getUploadReportWindow = () => ({ isOpen: true });
  findSchoolByNumber = () => ({ school: { 'حالة المدرسة': 'نشطة', 'اسم المدرسة': 'مدرسة اختبار', 'الأرقام الإحصائية': '123456', 'اسم منسق الأمن والسلامة': 'منسق', 'جوال منسق الأمن والسلامة': '0500000000', 'الكادر': 'تعليمي', Folder_ID: 'existing-school-folder' } });
  prepareReportUpload = () => ({ reportId: 'request-1' });
  Utilities = {
    base64Decode: () => [37, 80, 68, 70, 45, 49],
    newBlob: () => ({})
  };
  DriveApp = { getFolderById: id => { if (id !== 'existing-school-folder') throw Error('wrong folder'); return {}; } };
  getOrCreateChildFolder = () => ({ createFolder: () => { created++; return { getId: () => 'report-folder', setTrashed: () => {}, createFile: () => ({ getId: () => 'pdf-id', getUrl: () => 'pdf-url', setTrashed: () => {} }) }; } });
  getShelterReportsSheet = () => ({ getLastColumn: () => headers.length, getRange: () => ({ getDisplayValues: () => [headers] }) });
  appendRowWithScriptLock = (sheet, row, identity) => { rows.push(row); return { duplicate: false }; };
`);
sandbox.payload = {
  shelterSemester: 1, loginNumber: '123456', executionDate: '2026-11-11',
  procedures: ['تم', 'جزئيًا', 'لم يتم', 'تم', 'تم', 'تم', 'تم', 'تم'],
  participants: 120, responseMinutes: 1, responseSeconds: 30,
  declaration: true, notes: 'إجراء تحسيني', mimeType: 'application/pdf', fileName: 'report.pdf', base64Data: 'mock'
};
assert.strictEqual(evaluate('uploadShelterReport(payload)').success, true);
assert.strictEqual(sandbox.created, 1);
assert.strictEqual(sandbox.rows[0][7], 1);
assert.strictEqual(sandbox.rows[0][10], 'جزئيًا');
assert.strictEqual(sandbox.rows[0][11], 'لم يتم');
assert.strictEqual(sandbox.rows[0][headers.indexOf('حالة التقرير')], 'مرفوع');
assert.strictEqual(evaluate('uploadShelterReport({ ...payload, procedures: [] })').success, false);
assert.strictEqual(evaluate('uploadShelterReport({ ...payload, responseSeconds: 60 })').success, false);
assert.strictEqual(evaluate('uploadShelterReport({ ...payload, declaration: false })').success, false);
evaluate("prepareReportUpload = () => ({ response: { success: true, data: { duplicate: true } } })");
assert.strictEqual(evaluate('uploadShelterReport(payload)').data.duplicate, true);
assert.strictEqual(sandbox.created, 1, 'Retry must not create another Drive folder');
console.log('Shelter reports passed: manual windows, semester deduplication, validation, existing school folder, ratings, and retry identity');
