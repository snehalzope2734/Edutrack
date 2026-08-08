package com.edutrack.service;

import com.edutrack.model.enums.AttendanceStatus;
import com.edutrack.exception.BadRequestException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.document.AttendanceImport;
import com.edutrack.model.entity.Attendance;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;

import com.edutrack.repository.mongodb.AttendanceImportRepository;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Attendance enters the system exclusively through this Excel import pipeline:
 * only the assigned Class Teacher can download the class roster template and
 * upload the filled .xlsx attendance for their class/date.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceImportService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5MB limit

    private final AttendanceImportRepository attendanceImportRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public byte[] generateTemplate(UUID classId, UUID teacherUserId) {
        ensureCurrentTeacherIsClassTeacher(classId, teacherUserId);
        List<Student> students = studentRepository.findByClassEntityId(classId);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Attendance Roster");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Roll Number");
            header.createCell(1).setCellValue("Student Name");
            header.createCell(2).setCellValue("Status");

            int rowIdx = 1;
            for (Student student : students) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(student.getRollNumber() != null ? student.getRollNumber() : "");
                row.createCell(1).setCellValue(student.getUser() != null ? student.getUser().getName() : "");
                row.createCell(2).setCellValue(""); // Left blank for teacher to enter P / A / L
            }

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            sheet.autoSizeColumn(2);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BadRequestException("Failed to generate Excel template: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public AttendanceImport preview(MultipartFile file, UUID classId, UUID subjectId, LocalDate date, UUID teacherUserId) {
        ensureCurrentTeacherIsClassTeacher(classId, teacherUserId);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please attach an Excel (.xlsx) file");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File is too large (max 5MB)");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            throw new BadRequestException("Only .xlsx files are supported.");
        }

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (subject.getClassEntity() == null || !classId.equals(subject.getClassEntity().getId())) {
            throw new BadRequestException("Selected subject does not belong to the selected class");
        }

        List<Student> classStudents = studentRepository.findByClassEntityId(classId);
        Map<String, Student> byRollNumber = new HashMap<>();
        for (Student s : classStudents) {
            byRollNumber.put(normalizeRoll(s.getRollNumber()), s);
        }

        List<AttendanceImport.RowResult> results = new ArrayList<>();
        Set<String> seenInFile = new HashSet<>();
        int validCount = 0, errorCount = 0, duplicateCount = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();
            Row header = sheet.getRow(0);

            if (header == null || header.getLastCellNum() < 3) {
                throw new BadRequestException("Invalid workbook header. The first row must contain: Roll Number, Student Name, Status.");
            }

            Map<String, Integer> headerIndex = new HashMap<>();
            for (int c = 0; c < header.getLastCellNum(); c++) {
                String raw = normalizeHeader(readCellAsString(header.getCell(c)));
                if (!raw.isBlank()) {
                    headerIndex.put(raw, c);
                }
            }

            if (!headerIndex.containsKey("roll number") || !headerIndex.containsKey("student name") || !headerIndex.containsKey("status")) {
                throw new BadRequestException("Invalid workbook header. Expecting columns: Roll Number, Student Name, Status.");
            }

            int rollColumn = headerIndex.get("roll number");
            int studentColumn = headerIndex.get("student name");
            int statusColumn = headerIndex.get("status");

            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String rollRaw = readCellAsString(row.getCell(rollColumn));
                String studentRaw = readCellAsString(row.getCell(studentColumn));
                String statusRaw = readCellAsString(row.getCell(statusColumn));

                if ((rollRaw == null || rollRaw.isBlank())
                        && (studentRaw == null || studentRaw.isBlank())
                        && (statusRaw == null || statusRaw.isBlank())) {
                    continue;
                }

                AttendanceImport.RowResult.RowResultBuilder rb = AttendanceImport.RowResult.builder()
                        .rowNumber(r + 1)
                        .rollNumberRaw(rollRaw)
                        .statusRaw(statusRaw)
                        .studentName(studentRaw);

                String error = null;
                String normalizedStatus = null;
                Student matchedStudent = null;

                if (rollRaw == null || rollRaw.isBlank()) {
                    error = "Missing roll number";
                } else {
                    String key = normalizeRoll(rollRaw);
                    if (!seenInFile.add(key)) {
                        error = "Duplicate roll number within this file";
                    } else {
                        matchedStudent = byRollNumber.get(key);
                        if (matchedStudent == null) {
                            error = "Roll number not found in this class";
                        }
                    }
                }

                if (error == null) {
                    if (studentRaw == null || studentRaw.isBlank()) {
                        error = "Student name is required for roll number " + rollRaw;
                    }
                }

                if (error == null) {
                    if (statusRaw == null || statusRaw.isBlank()) {
                        error = "Attendance status is required (use P/Present, A/Absent, or L/Late)";
                    } else {
                        normalizedStatus = normalizeStatus(statusRaw);
                        if (normalizedStatus == null) {
                            error = "Invalid status '" + statusRaw + "' (use P/Present, A/Absent, or L/Late)";
                        }
                    }
                }

                boolean duplicate = false;
                if (error == null) {
                    duplicate = attendanceRepository
                            .findByStudentIdAndSubjectIdAndAttendanceDate(matchedStudent.getId(), subjectId, date)
                            .isPresent();
                    if (duplicate) duplicateCount++;
                    validCount++;
                } else {
                    errorCount++;
                }

                rb.normalizedStatus(normalizedStatus)
                  .studentId(matchedStudent != null ? matchedStudent.getId().toString() : null)
                  .duplicate(duplicate)
                  .error(error);

                results.add(rb.build());
            }
        } catch (IOException e) {
            throw new BadRequestException("Could not read the Excel file: " + e.getMessage());
        } catch (Exception e) {
            throw new BadRequestException("Unexpected error while parsing the Excel file: " + e.getMessage());
        }

        if (results.isEmpty()) {
            throw new BadRequestException("No data rows found. Expecting Roll Number, Student Name, and Status columns.");
        }

        AttendanceImport importDoc = AttendanceImport.builder()
                .teacherId(teacherUserId.toString())
                .classId(classId.toString())
                .subjectId(subjectId.toString())
                .date(date)
                .fileName(filename)
                .status("PENDING_CONFIRMATION")
                .totalRows(results.size())
                .validRows(validCount)
                .errorRows(errorCount)
                .duplicateRows(duplicateCount)
                .rows(results)
                .uploadedAt(Instant.now())
                .build();

        return attendanceImportRepository.save(importDoc);
    }

    @Transactional
    public Map<String, Object> confirm(String importId, UUID teacherUserId) {
        AttendanceImport importDoc = attendanceImportRepository.findById(importId)
                .orElseThrow(() -> new ResourceNotFoundException("Import not found"));

        ensureCurrentTeacherIsClassTeacher(UUID.fromString(importDoc.getClassId()), teacherUserId);

        if (!"PENDING_CONFIRMATION".equals(importDoc.getStatus())) {
            throw new BadRequestException("This import has already been " + importDoc.getStatus().toLowerCase());
        }
        if (importDoc.getErrorRows() > 0 || importDoc.getRows().stream().anyMatch(row -> row.getError() != null)) {
            throw new BadRequestException("This import contains validation errors and cannot be confirmed.");
        }

        Subject subject = subjectRepository.findById(UUID.fromString(importDoc.getSubjectId()))
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        Teacher teacherEntity = teacherRepository
                .findByUserId(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        int imported = 0;
        for (AttendanceImport.RowResult row : importDoc.getRows()) {
            if (row.getError() != null || row.getStudentId() == null) continue;

            Student student = studentRepository.findById(UUID.fromString(row.getStudentId())).orElse(null);
            if (student == null) continue;

            Attendance attendance = attendanceRepository
                    .findByStudentIdAndSubjectIdAndAttendanceDate(
                            student.getId(),
                            subject.getId(),
                            importDoc.getDate()
                    )
                    .orElseGet(() -> Attendance.builder()
                            .student(student)
                            .subject(subject)
                            .teacher(teacherEntity)
                            .attendanceDate(importDoc.getDate())
                            .build());

            attendance.setTeacher(teacherEntity);

            switch (row.getNormalizedStatus()) {
                case "P" -> attendance.setStatus(AttendanceStatus.PRESENT);
                case "A" -> attendance.setStatus(AttendanceStatus.ABSENT);
                case "L" -> attendance.setStatus(AttendanceStatus.LATE);
                default -> throw new BadRequestException("Invalid attendance status: " + row.getNormalizedStatus());
            }

            attendanceRepository.save(attendance);
            imported++;
        }

        importDoc.setStatus("CONFIRMED");
        importDoc.setConfirmedAt(Instant.now());
        importDoc.setImportedCount(imported);
        attendanceImportRepository.save(importDoc);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("importId", importDoc.getId());
        result.put("status", importDoc.getStatus());
        result.put("importedCount", imported);
        result.put("skippedCount", importDoc.getTotalRows() - imported);
        return result;
    }

    @Transactional
    public void discard(String importId, UUID teacherUserId) {
        AttendanceImport importDoc = attendanceImportRepository.findById(importId)
                .orElseThrow(() -> new ResourceNotFoundException("Import not found"));
        ensureCurrentTeacherIsClassTeacher(UUID.fromString(importDoc.getClassId()), teacherUserId);
        if (!"PENDING_CONFIRMATION".equals(importDoc.getStatus())) {
            throw new BadRequestException("This import has already been " + importDoc.getStatus().toLowerCase());
        }
        importDoc.setStatus("DISCARDED");
        attendanceImportRepository.save(importDoc);
    }

    private void ensureCurrentTeacherIsClassTeacher(UUID classId, UUID teacherUserId) {
        ClassEntity klass = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        Teacher teacher = teacherRepository.findByUserId(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        if (klass.getClassTeacher() == null || !klass.getClassTeacher().getId().equals(teacher.getId())) {
            throw new UnauthorizedException("Only the assigned Class Teacher can upload attendance for " + klass.getClassName());
        }
    }

    public AttendanceImport getDetail(String importId) {
        return attendanceImportRepository.findById(importId)
                .orElseThrow(() -> new ResourceNotFoundException("Import not found"));
    }

    public Page<AttendanceImport> history(UUID teacherUserId, boolean isAdmin, UUID classIdFilter, Pageable pageable) {
        if (isAdmin) {
            return classIdFilter != null
                    ? attendanceImportRepository.findByClassIdOrderByUploadedAtDesc(classIdFilter.toString(), pageable)
                    : attendanceImportRepository.findAllByOrderByUploadedAtDesc(pageable);
        }
        return attendanceImportRepository.findByTeacherIdOrderByUploadedAtDesc(teacherUserId.toString(), pageable);
    }

    // ---- Read-only attendance views ----

    @Transactional(readOnly = true)
    public List<Map<String, Object>> classGrid(UUID classId, UUID subjectId, LocalDate date) {
        List<Attendance> records = attendanceRepository
                .findByStudentClassEntityIdAndSubjectIdAndAttendanceDate(classId, subjectId, date != null ? date : LocalDate.now());
        return records.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("studentId", a.getStudent().getId());
            m.put("studentName", a.getStudent().getUser().getName());
            m.put("rollNumber", a.getStudent().getRollNumber());
            m.put("date", a.getAttendanceDate());
            m.put("status", a.getStatus());
            return m;
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> studentRecords(UUID studentId, UUID subjectId, LocalDate from, LocalDate to) {
        LocalDate f = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate t = to != null ? to : LocalDate.now();
        List<Attendance> records = subjectId != null
                ? attendanceRepository.findByStudentIdAndSubjectIdAndAttendanceDateBetween(studentId, subjectId, f, t)
                : attendanceRepository.findByStudentIdAndAttendanceDateBetween(studentId, f, t);
        return records.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("subjectId", a.getSubject().getId());
            m.put("subjectName", a.getSubject().getName());
            m.put("date", a.getAttendanceDate());
            m.put("status", a.getStatus());
            return m;
        }).toList();
    }

    @Transactional(readOnly = true)
    public com.edutrack.model.dto.response.AttendanceSummaryResponse studentSummary(UUID studentId) {
        LocalDate from = LocalDate.now().minusMonths(12);
        LocalDate to = LocalDate.now();
        List<Attendance> records = attendanceRepository.findByStudentIdAndAttendanceDateBetween(studentId, from, to);

        Map<String, List<Attendance>> bySubject = new LinkedHashMap<>();
        for (Attendance a : records) {
            bySubject.computeIfAbsent(a.getSubject().getName(), k -> new ArrayList<>()).add(a);
        }

        List<com.edutrack.model.dto.response.SubjectWiseAttendance> subjectWise = bySubject.entrySet().stream()
                .map(e -> {
                    long present = e.getValue().stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
                    long absent = e.getValue().stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT).count();
                    long late = e.getValue().stream().filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
                    long total = e.getValue().size();
                    double pct = total == 0 ? 0.0 : Math.round(((present + late) * 10000.0 / total)) / 100.0;
                    return new com.edutrack.model.dto.response.SubjectWiseAttendance(e.getKey(), present, absent, late, pct);
                }).toList();

        long totalPresentish = records.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT || a.getStatus() == AttendanceStatus.LATE).count();
        double overall = records.isEmpty() ? 0.0 : Math.round((totalPresentish * 10000.0 / records.size())) / 100.0;

        return new com.edutrack.model.dto.response.AttendanceSummaryResponse(subjectWise, overall);
    }

    private String normalizeRoll(String raw) {
        return com.edutrack.util.AttendanceStatusNormalizer.normalizeRoll(raw);
    }

    private String normalizeStatus(String raw) {
        return com.edutrack.util.AttendanceStatusNormalizer.normalizeStatus(raw);
    }

    private String readCellAsString(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue().trim();
        if (cell.getCellType() == CellType.NUMERIC) {
            double d = cell.getNumericCellValue();
            if (d == Math.floor(d)) return String.valueOf((long) d);
            return String.valueOf(d);
        }
        if (cell.getCellType() == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        if (cell.getCellType() == CellType.FORMULA) {
            try {
                return cell.getStringCellValue().trim();
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private String normalizeHeader(String raw) {
        if (raw == null) return "";
        return raw.trim().toLowerCase();
    }
}
