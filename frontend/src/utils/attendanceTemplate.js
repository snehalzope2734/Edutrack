const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 1) === 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value);
}

function writeUint16LE(buffer, offset, value) {
  new DataView(buffer).setUint16(offset, value, true);
}

function writeUint32LE(buffer, offset, value) {
  new DataView(buffer).setUint32(offset, value, true);
}

function createZipArchive(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach(([name, content]) => {
    const fileNameBytes = encoder.encode(name);
    const contentBytes = content instanceof Uint8Array ? content : encoder.encode(content);
    const fileHeader = new ArrayBuffer(30);
    const headerView = new DataView(fileHeader);
    writeUint32LE(fileHeader, 0, 0x04034b50);
    writeUint16LE(fileHeader, 4, 20);
    writeUint16LE(fileHeader, 6, 0);
    writeUint16LE(fileHeader, 8, 0);
    writeUint16LE(fileHeader, 10, 0);
    writeUint16LE(fileHeader, 12, 0);
    writeUint32LE(fileHeader, 14, crc32(contentBytes));
    writeUint32LE(fileHeader, 18, contentBytes.length);
    writeUint32LE(fileHeader, 22, contentBytes.length);
    writeUint16LE(fileHeader, 26, fileNameBytes.length);
    writeUint16LE(fileHeader, 28, 0);

    localParts.push(fileHeader, fileNameBytes, contentBytes);

    const centralHeader = new ArrayBuffer(46);
    const centralView = new DataView(centralHeader);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, 20);
    writeUint16LE(centralHeader, 6, 20);
    writeUint16LE(centralHeader, 8, 0);
    writeUint16LE(centralHeader, 10, 0);
    writeUint16LE(centralHeader, 12, 0);
    writeUint16LE(centralHeader, 14, 0);
    writeUint32LE(centralHeader, 16, crc32(contentBytes));
    writeUint32LE(centralHeader, 20, contentBytes.length);
    writeUint32LE(centralHeader, 24, contentBytes.length);
    writeUint16LE(centralHeader, 28, fileNameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 42, offset);
    centralParts.push(centralHeader, fileNameBytes);

    offset += 30 + fileNameBytes.length + contentBytes.length;
  });

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const endOfCentralDirectory = new ArrayBuffer(22);
  const endView = new DataView(endOfCentralDirectory);
  writeUint32LE(endOfCentralDirectory, 0, 0x06054b50);
  writeUint16LE(endOfCentralDirectory, 4, 0);
  writeUint16LE(endOfCentralDirectory, 6, 0);
  writeUint16LE(endOfCentralDirectory, 8, entries.length);
  writeUint16LE(endOfCentralDirectory, 10, entries.length);
  writeUint32LE(endOfCentralDirectory, 12, centralDirectorySize);
  writeUint32LE(endOfCentralDirectory, 16, offset);
  writeUint16LE(endOfCentralDirectory, 20, 0);

  const chunks = [...localParts, ...centralParts, endOfCentralDirectory];
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let index = 0;
  chunks.forEach((chunk) => {
    output.set(new Uint8Array(chunk), index);
    index += chunk.byteLength;
  });

  return output;
}

export function buildAttendanceTemplateFileName(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) {
    return buildAttendanceTemplateFileName();
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `attendance-${day}-${month}-${year}.xlsx`;
}

export function normalizeAttendanceStatus(value) {
  if (typeof value !== 'string') return '';

  const normalized = value.trim().toLowerCase();
  if (['present', 'p', 'yes', 'y'].includes(normalized)) return 'P';
  if (['absent', 'a', 'no', 'n'].includes(normalized)) return 'A';
  if (['late', 'l', 'tardy'].includes(normalized)) return 'L';
  return normalized.toUpperCase();
}

export function validateAttendanceUploadFile(file, dateValue) {
  if (!file) {
    return { valid: false, error: 'Please choose an Excel file first.' };
  }

  const fileName = file.name || '';
  const expectedName = buildAttendanceTemplateFileName(dateValue);
  const lowerName = fileName.toLowerCase();

  if (fileName !== expectedName || !lowerName.endsWith('.xlsx')) {
    return { valid: false, error: `Invalid file name. Please upload today's attendance template (${expectedName}).` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The workbook appears empty. Please choose a non-empty file.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'The file is too large. Please keep it under 2MB.' };
  }

  return { valid: true };
}

export async function inspectAttendanceWorkbook(file) {
  const validation = validateAttendanceUploadFile(file, new Date());
  if (!validation.valid) {
    return validation;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      return { valid: false, error: 'The workbook could not be read. Please upload a valid .xlsx file saved from Excel.' };
    }
  } catch {
    return { valid: false, error: 'The workbook could not be read from disk. Please try another file or save a fresh copy from Excel.' };
  }

  return { valid: true };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function createAttendanceTemplateWorkbook(dateValue, students = []) {
  const sortedStudents = [...students].sort((left, right) => {
    const rollLeft = String(left.rollNumber ?? left.roll_number ?? '').trim();
    const rollRight = String(right.rollNumber ?? right.roll_number ?? '').trim();
    return rollLeft.localeCompare(rollRight, undefined, { numeric: true, sensitivity: 'base' });
  });

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Attendance" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rowsXml = [
    `    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Roll Number</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Student Name</t></is></c>
      <c r="C1" t="inlineStr"><is><t>Status</t></is></c>
    </row>`,
    ...sortedStudents.map((student, index) => {
      const row = index + 2;
      const rollNumber = escapeXml(student.rollNumber ?? student.roll_number ?? String(index + 1));
      const fullName = ((student.firstName ?? '') + ' ' + (student.lastName ?? '')).trim();
      const name = escapeXml((student.name ?? student.studentName ?? fullName) || '');
      return `    <row r="${row}">
      <c r="A${row}" t="inlineStr"><is><t>${rollNumber}</t></is></c>
      <c r="B${row}" t="inlineStr"><is><t>${name}</t></is></c>
      <c r="C${row}" t="inlineStr"><is><t></t></is></c>
    </row>`;
    }),
  ].join('\n');

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
${rowsXml}
  </sheetData>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const archive = createZipArchive([
    ['[Content_Types].xml', contentTypesXml],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n</Relationships>`],
    ['xl/workbook.xml', workbookXml],
    ['xl/_rels/workbook.xml.rels', relsXml],
    ['xl/worksheets/sheet1.xml', worksheetXml],
    ['xl/styles.xml', stylesXml],
  ]);

  const blob = new Blob([archive], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { blob, fileName: buildAttendanceTemplateFileName(dateValue) };
}

export async function downloadAttendanceTemplate(dateValue, students = []) {
  const { blob, fileName } = await createAttendanceTemplateWorkbook(dateValue, students);
  if (typeof window === 'undefined' || !window.URL?.createObjectURL) {
    return { fileName };
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return { fileName };
}
