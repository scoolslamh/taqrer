(function initializeSchoolExcelExport(globalObject) {
  'use strict';

  const textEncoder = new TextEncoder();
  let crcTable = null;


  function escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }


  function getColumnName(index) {
    let value = index + 1;
    let result = '';

    while (value > 0) {
      const remainder = (value - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      value = Math.floor((value - 1) / 26);
    }

    return result;
  }


  function createCell(value, rowNumber, columnIndex, styleId) {
    const reference =
      `${getColumnName(columnIndex)}${rowNumber}`;

    return `<c r="${reference}" s="${styleId}" t="inlineStr">` +
      `<is><t xml:space="preserve">${escapeXml(value)}</t></is>` +
      '</c>';
  }


  function createWorksheetXml(options) {
    const columns = options.columns;
    const rows = options.rows;
    const lastColumn = getColumnName(columns.length - 1);
    const lastRow = Math.max(4, rows.length + 4);
    const columnDefinitions = columns
      .map((column, index) =>
        `<col min="${index + 1}" max="${index + 1}" ` +
        `width="${Number(column.width) || 18}" customWidth="1"/>`
      )
      .join('');

    const titleCells = createCell(
      options.title,
      1,
      0,
      1
    );
    const subtitleCells = createCell(
      options.subtitle,
      2,
      0,
      2
    );
    const headerCells = columns
      .map((column, index) =>
        createCell(column.header, 4, index, 3)
      )
      .join('');
    const dataRows = rows
      .map((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        const cells = columns
          .map((column, columnIndex) =>
            createCell(
              row[column.key],
              rowNumber,
              columnIndex,
              4
            )
          )
          .join('');

        return `<row r="${rowNumber}">${cells}</row>`;
      })
      .join('');

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      `<dimension ref="A1:${lastColumn}${lastRow}"/>` +
      '<sheetViews><sheetView rightToLeft="1" workbookViewId="0">' +
      '<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="20"/>' +
      `<cols>${columnDefinitions}</cols>` +
      '<sheetData>' +
      `<row r="1" ht="30" customHeight="1">${titleCells}</row>` +
      `<row r="2" ht="24" customHeight="1">${subtitleCells}</row>` +
      '<row r="3" ht="8" customHeight="1"></row>' +
      `<row r="4" ht="28" customHeight="1">${headerCells}</row>` +
      dataRows +
      '</sheetData>' +
      `<autoFilter ref="A4:${lastColumn}${lastRow}"/>` +
      '<mergeCells count="2">' +
      `<mergeCell ref="A1:${lastColumn}1"/>` +
      `<mergeCell ref="A2:${lastColumn}2"/>` +
      '</mergeCells>' +
      '<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>' +
      '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      '</worksheet>';
  }


  function createStylesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="4">' +
      '<font><sz val="11"/><name val="Arial"/></font>' +
      '<font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Arial"/></font>' +
      '<font><b/><color rgb="FF176448"/><sz val="11"/><name val="Arial"/></font>' +
      '<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font>' +
      '</fonts>' +
      '<fills count="4">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF00865F"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEDF7F3"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FFD7E2DE"/></left><right style="thin"><color rgb="FFD7E2DE"/></right><top style="thin"><color rgb="FFD7E2DE"/></top><bottom style="thin"><color rgb="FFD7E2DE"/></bottom><diagonal/></border>' +
      '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="5">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';
  }


  function getCrcTable() {
    if (crcTable) {
      return crcTable;
    }

    crcTable = new Uint32Array(256);

    for (let index = 0; index < 256; index++) {
      let value = index;

      for (let bit = 0; bit < 8; bit++) {
        value = value & 1
          ? 0xedb88320 ^ (value >>> 1)
          : value >>> 1;
      }

      crcTable[index] = value >>> 0;
    }

    return crcTable;
  }


  function calculateCrc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;

    for (let index = 0; index < bytes.length; index++) {
      crc = table[(crc ^ bytes[index]) & 0xff] ^
        (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }


  function createNumberBytes(value, byteLength) {
    const bytes = new Uint8Array(byteLength);
    const view = new DataView(bytes.buffer);

    if (byteLength === 2) {
      view.setUint16(0, value, true);
    } else {
      view.setUint32(0, value >>> 0, true);
    }

    return bytes;
  }


  function combineBytes(parts) {
    const totalLength = parts.reduce(
      (total, part) => total + part.length,
      0
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;

    parts.forEach(part => {
      result.set(part, offset);
      offset += part.length;
    });

    return result;
  }


  function createZipBlob(files) {
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;

    files.forEach(file => {
      const nameBytes = textEncoder.encode(file.name);
      const dataBytes = textEncoder.encode(file.content);
      const crc = calculateCrc32(dataBytes);
      const localHeader = combineBytes([
        createNumberBytes(0x04034b50, 4),
        createNumberBytes(20, 2),
        createNumberBytes(0x0800, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(crc, 4),
        createNumberBytes(dataBytes.length, 4),
        createNumberBytes(dataBytes.length, 4),
        createNumberBytes(nameBytes.length, 2),
        createNumberBytes(0, 2),
        nameBytes
      ]);
      const localFile = combineBytes([
        localHeader,
        dataBytes
      ]);

      localParts.push(localFile);

      centralParts.push(combineBytes([
        createNumberBytes(0x02014b50, 4),
        createNumberBytes(20, 2),
        createNumberBytes(20, 2),
        createNumberBytes(0x0800, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(crc, 4),
        createNumberBytes(dataBytes.length, 4),
        createNumberBytes(dataBytes.length, 4),
        createNumberBytes(nameBytes.length, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 2),
        createNumberBytes(0, 4),
        createNumberBytes(localOffset, 4),
        nameBytes
      ]));

      localOffset += localFile.length;
    });

    const centralDirectory =
      combineBytes(centralParts);
    const endRecord = combineBytes([
      createNumberBytes(0x06054b50, 4),
      createNumberBytes(0, 2),
      createNumberBytes(0, 2),
      createNumberBytes(files.length, 2),
      createNumberBytes(files.length, 2),
      createNumberBytes(centralDirectory.length, 4),
      createNumberBytes(localOffset, 4),
      createNumberBytes(0, 2)
    ]);

    return new Blob(
      [...localParts, centralDirectory, endRecord],
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );
  }


  function buildWorkbookBlob(options) {
    const createdAt = new Date().toISOString();
    const sheetName = String(
      options.sheetName || 'المدارس'
    ).slice(0, 31);
    const worksheetXml = createWorksheetXml(options);

    return createZipBlob([
      {
        name: '[Content_Types].xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
          '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
          '</Types>'
      },
      {
        name: '_rels/.rels',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
          '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'xl/workbook.xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<bookViews><workbookView/></bookViews>' +
          `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
          '</workbook>'
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        content: worksheetXml
      },
      {
        name: 'xl/styles.xml',
        content: createStylesXml()
      },
      {
        name: 'docProps/core.xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
          '<dc:creator>نظام تقارير الأمن والسلامة المدرسية</dc:creator>' +
          '<dc:language>ar-SA</dc:language>' +
          `<dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>` +
          '</cp:coreProperties>'
      },
      {
        name: 'docProps/app.xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
          '<Application>نظام تقارير الأمن والسلامة المدرسية</Application>' +
          '</Properties>'
      }
    ]);
  }


  function sanitizeFileName(value) {
    return String(value || 'تقرير_المدارس')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }


  function downloadWorkbook(options) {
    const blob = buildWorkbookBlob(options);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download =
      `${sanitizeFileName(options.fileName)}.xlsx`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(objectUrl),
      1000
    );
  }


  globalObject.SchoolExcelExport = {
    buildWorkbookBlob,
    downloadWorkbook
  };
})(typeof window !== 'undefined' ? window : globalThis);
