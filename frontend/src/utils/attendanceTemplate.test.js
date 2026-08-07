import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceTemplateFileName, validateAttendanceUploadFile, normalizeAttendanceStatus, createAttendanceTemplateWorkbook } from './attendanceTemplate.js';

test('buildAttendanceTemplateFileName formats the expected template name', () => {
  assert.equal(buildAttendanceTemplateFileName('2025-08-06'), 'attendance-06-08-2025.xlsx');
});

test('validateAttendanceUploadFile rejects non-xlsx files', () => {
  const result = validateAttendanceUploadFile({ name: 'attendance-06-08-2025.csv', size: 2048 });
  assert.equal(result.valid, false);
  assert.match(result.error, /Excel workbook/i);
});

test('validateAttendanceUploadFile accepts a correctly named xlsx file', () => {
  const result = validateAttendanceUploadFile({ name: 'attendance-06-08-2025.xlsx', size: 2048 });
  assert.equal(result.valid, true);
});

test('normalizeAttendanceStatus converts common values to the expected codes', () => {
  assert.equal(normalizeAttendanceStatus('present'), 'P');
  assert.equal(normalizeAttendanceStatus('Absent'), 'A');
  assert.equal(normalizeAttendanceStatus('late'), 'L');
  assert.equal(normalizeAttendanceStatus('P'), 'P');
});

test('createAttendanceTemplateWorkbook includes roll number and student name columns', async () => {
  const students = [
    { rollNumber: '101', name: 'Alice Example' },
    { rollNumber: '102', name: 'Bob Sample' },
  ];

  const { blob, fileName } = await createAttendanceTemplateWorkbook('2025-08-06', students);
  assert.equal(fileName, 'attendance-06-08-2025.xlsx');

  const text = await blob.text();
  assert.match(text, /Roll Number/);
  assert.match(text, /Student Name/);
  assert.match(text, /Alice Example/);
  assert.match(text, /Bob Sample/);
});
