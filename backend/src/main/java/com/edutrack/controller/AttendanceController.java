package com.edutrack.controller;

import com.edutrack.model.document.AttendanceImport;
import com.edutrack.model.dto.response.AttendanceSummaryResponse;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.AttendanceImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Attendance is recorded ONLY via teacher-uploaded Excel files. There is no
 * manual per-student marking endpoint by design (see AttendanceImportService
 * for the rationale) — corrections happen by re-uploading a corrected file,
 * which itself becomes a new, auditable import record.
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceImportService attendanceImportService;
    private final OwnershipGuard ownershipGuard;

    // ---- Excel import workflow ----

    @PostMapping(value = "/imports/preview", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<AttendanceImport> preview(
            @RequestParam("file") MultipartFile file,
            @RequestParam UUID classId,
            @RequestParam UUID subjectId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        ownershipGuard.assertOwnsSubject(subjectId);
        ownershipGuard.assertCanViewClass(classId);
        return ResponseEntity.ok(attendanceImportService.preview(file, classId, subjectId, date, CurrentUser.id()));
    }

    @PostMapping("/imports/{importId}/confirm")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable String importId) {
        return ResponseEntity.ok(attendanceImportService.confirm(importId, CurrentUser.id()));
    }

    @PostMapping("/imports/{importId}/discard")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Void> discard(@PathVariable String importId) {
        attendanceImportService.discard(importId, CurrentUser.id());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/imports/{importId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<AttendanceImport> importDetail(@PathVariable String importId) {
        // Ownership (own upload vs admin) is enforced inside the service for mutating
        // actions; detail view is read-only so we simply require TEACHER/ADMIN here.
        return ResponseEntity.ok(attendanceImportService.getDetail(importId));
    }

    @GetMapping("/imports")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Page<AttendanceImport>> history(
            @RequestParam(required = false) UUID classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(attendanceImportService.history(CurrentUser.id(), CurrentUser.isAdmin(), classId, PageRequest.of(page, size)));
    }

    // ---- Read-only views of committed attendance ----

    @GetMapping("/class/{classId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> classGrid(
            @PathVariable UUID classId,
            @RequestParam UUID subjectId,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date) {
        ownershipGuard.assertCanViewClass(classId);
        if (CurrentUser.isTeacher()) ownershipGuard.assertOwnsSubject(subjectId);
        return ResponseEntity.ok(attendanceImportService.classGrid(classId, subjectId, date));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> studentRecords(
            @PathVariable UUID studentId,
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate to) {
        ownershipGuard.assertCanViewStudent(studentId);
        return ResponseEntity.ok(attendanceImportService.studentRecords(studentId, subjectId, from, to));
    }

    @GetMapping("/student/{studentId}/summary")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<AttendanceSummaryResponse> studentSummary(@PathVariable UUID studentId) {
        ownershipGuard.assertCanViewStudent(studentId);
        return ResponseEntity.ok(attendanceImportService.studentSummary(studentId));
    }
}
