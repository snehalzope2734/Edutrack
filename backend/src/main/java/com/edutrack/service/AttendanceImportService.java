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

import com.edutrack.repository.mongodb.AttendanceImportRepository;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.edutrack.model.entity.Teacher;
import com.edutrack.repository.supabase.TeacherRepository;
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
 * a teacher uploads a .xlsx for one class/subject/date, gets a row-level preview
 * (including validation errors and duplicate/overwrite flags) and then explicitly
 * confirms before anything is written to the Attendance table. There is
 * deliberately no endpoint to mark or edit a single student's attendance directly —
 * corrections are made by re-uploading a corrected file, which is itself recorded
 * as a new import, giving a full audit trail of every change.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceImportService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5MB is generous for a class roster

    private final AttendanceImportRepository attendanceImportRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
  
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public AttendanceImport preview(MultipartFile file, UUID classId, UUID subjectId, LocalDate date, UUID teacherUserId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please attach an Excel (.xlsx) file");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File is too large (max 5MB)");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            throw new BadRequestException("Only .xlsx files are supported. Rename the file to '" + buildExpectedFileName(date) + "'.");
        }

        if (!filename.equals(buildExpectedFileName(date))) {
            throw new BadRequestException("The file name must be exactly '" + buildExpectedFileName(date) + "'.");
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
                throw new BadRequestException("Invalid workbook header. The first row must contain exactly: Roll Number, Student Name, Status.");
            }

            Map<String, Integer> headerIndex = new HashMap<>();
            for (int c = 0; c < header.getLastCellNum(); c++) {
                String raw = normalizeHeader(readCellAsString(header.getCell(c)));
                if (!raw.isBlank()) {
                    headerIndex.put(raw, c);
                }
            }

            if (!headerIndex.keySet().equals(Set.of("roll number", "student name", "status"))
                    || headerIndex.get("roll number") != 0
                    || headerIndex.get("student name") != 1
                    || headerIndex.get("status") != 2) {
                throw new BadRequestException("Invalid workbook header. The first row must contain exactly: Roll Number, Student Name, Status in that order.");
            }

            log.debug("Detected Headers: Roll Number -> Column {}, Student Name -> Column {}, Status -> Column {}",
                    headerIndex.get("roll number"), headerIndex.get("student name"), headerIndex.get("status"));

            int rollColumn = headerIndex.get("roll number");
            int studentColumn = headerIndex.get("student name");
            int statusColumn = headerIndex.get("status");

            // Row 1 and below are attendance entries.
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String rollRaw = readCellAsString(row.getCell(rollColumn));
                String studentRaw = readCellAsString(row.getCell(studentColumn));
                String statusRaw = readCellAsString(row.getCell(statusColumn));

                log.debug("Row {}: Roll = {}, Student = {}, Status = {}", r + 1, rollRaw, studentRaw, statusRaw);

                if ((rollRaw == null || rollRaw.isBlank())
                        && (studentRaw == null || studentRaw.isBlank())
                        && (statusRaw == null || statusRaw.isBlank())) {
                    continue; // skip fully blank trailing rows
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
                    } else if (matchedStudent != null
                            && !normalizeStudentName(studentRaw).equals(normalizeStudentName(matchedStudent.getUser().getName()))) {
                        error = "Student name does not match the class roster for roll number " + rollRaw;
                    }
                }

                if (error == null) {
                    if (statusRaw == null || statusRaw.isBlank()) {
                        error = "Attendance status is required for every student (use P/Present, A/Absent, or L/Late)";
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
            throw new BadRequestException("No data rows found. Expecting a header row followed by Roll Number, Student Name, and Status columns.");
        }

        Set<String> missingRolls = new HashSet<>(byRollNumber.keySet());
        missingRolls.removeAll(seenInFile);
        if (!missingRolls.isEmpty()) {
            throw new BadRequestException("The uploaded file must include attendance for every student in the class. Missing roll numbers: "
                    + String.join(", ", missingRolls) + ".");
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

        if (!importDoc.getTeacherId().equals(teacherUserId.toString())) {
            throw new UnauthorizedException("You may only confirm your own uploads");
        }
        ensureCurrentTeacherIsClassTeacherForImport(importDoc, teacherUserId);
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

            Student student = studentRepository.findById(UUID.fromString(row.getStudentId()))
                    .orElse(null);
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

            // Ensure teacher is always stored (both new and existing records)
            attendance.setTeacher(teacherEntity);

            switch (row.getNormalizedStatus()) {
            case "P" -> attendance.setStatus(AttendanceStatus.PRESENT);
            case "A" -> attendance.setStatus(AttendanceStatus.ABSENT);
            case "L" -> attendance.setStatus(AttendanceStatus.LATE);
            default -> throw new BadRequestException(
                    "Invalid attendance status: " + row.getNormalizedStatus());
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
        if (!importDoc.getTeacherId().equals(teacherUserId.toString())) {
            throw new UnauthorizedException("You may only discard your own uploads");
        }
        ensureCurrentTeacherIsClassTeacherForImport(importDoc, teacherUserId);
        if (!"PENDING_CONFIRMATION".equals(importDoc.getStatus())) {
            throw new BadRequestException("This import has already been " + importDoc.getStatus().toLowerCase());
        }
        importDoc.setStatus("DISCARDED");
        attendanceImportRepository.save(importDoc);
    }

    private void ensureCurrentTeacherIsClassTeacherForImport(AttendanceImport importDoc, UUID teacherUserId) {
        UUID classId = UUID.fromString(importDoc.getClassId());
        ClassEntity klass = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        Teacher teacher = teacherRepository.findByUserId(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        if (klass.getClassTeacher() == null || !klass.getClassTeacher().getId().equals(teacher.getId())) {
            throw new UnauthorizedException("You are not the assigned class teacher for this class");
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

    // ---- Read-only attendance views (backed by the committed Postgres records) ----

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

    private String buildExpectedFileName(LocalDate date) {
        return String.format("attendance-%02d-%02d-%04d.xlsx", date.getDayOfMonth(), date.getMonthValue(), date.getYear());
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

    private boolean headerCellEquals(Cell cell, String expectedValue) {
        String raw = readCellAsString(cell);
        return expectedValue.equals(raw != null ? raw.trim() : raw);
    }

    private String normalizeHeader(String raw) {
        if (raw == null) return "";
        return raw.trim().toLowerCase();
    }

    private String normalizeStudentName(String value) {
        if (value == null) return "";
        return value.trim().replaceAll("\\s+", " ").toLowerCase();
    }
}

