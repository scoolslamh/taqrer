const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  Blob,
  TextEncoder,
  Uint8Array,
  Uint32Array,
  DataView,
  ArrayBuffer,
  Date,
  Math,
  String,
  Number,
  Object,
  Array,
  globalThis: null
};

sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(
    __dirname + '/../safety-dashboard/js/excel-export.js',
    'utf8'
  ),
  sandbox
);

function readStoredZipEntries(bytes) {
  const entries = new Map();
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );
  const decoder = new TextDecoder();
  let offset = 0;

  while (
    offset + 4 <= bytes.length &&
    view.getUint32(offset, true) === 0x04034b50
  ) {
    const compressedSize =
      view.getUint32(offset + 18, true);
    const fileNameLength =
      view.getUint16(offset + 26, true);
    const extraLength =
      view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart =
      nameStart + fileNameLength + extraLength;
    const name = decoder.decode(
      bytes.slice(
        nameStart,
        nameStart + fileNameLength
      )
    );
    const data = bytes.slice(
      dataStart,
      dataStart + compressedSize
    );

    entries.set(name, decoder.decode(data));
    offset = dataStart + compressedSize;
  }

  return entries;
}

(async () => {
  const blob = sandbox.SchoolExcelExport
    .buildWorkbookBlob({
      title: 'تقرير المدارس - الخطة الأولى',
      subtitle: 'حسب الفلاتر الحالية | عدد المدارس: 1',
      sheetName: 'المدارس',
      columns: [
        { key: 'school', header: 'اسم المدرسة', width: 30 },
        { key: 'phone', header: 'جوال المدير', width: 18 }
      ],
      rows: [
        {
          school: 'مدرسة الاختبار',
          phone: '0500000001'
        }
      ]
    });

  assert.strictEqual(
    blob.type,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  const bytes = new Uint8Array(
    await blob.arrayBuffer()
  );
  assert.strictEqual(bytes[0], 0x50);
  assert.strictEqual(bytes[1], 0x4b);

  const entries = readStoredZipEntries(bytes);
  assert.ok(entries.has('[Content_Types].xml'));
  assert.ok(entries.has('xl/workbook.xml'));
  assert.ok(entries.has('xl/styles.xml'));
  assert.ok(entries.has('xl/worksheets/sheet1.xml'));

  const worksheet = entries.get(
    'xl/worksheets/sheet1.xml'
  );
  assert.match(worksheet, /rightToLeft="1"/);
  assert.match(worksheet, /اسم المدرسة/);
  assert.match(worksheet, /مدرسة الاختبار/);
  assert.match(worksheet, /0500000001/);
  assert.match(worksheet, /autoFilter/);

  console.log(
    'Excel export passed: valid XLSX ZIP structure, Arabic content, RTL worksheet and formatting'
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
