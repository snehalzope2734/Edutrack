package com.edutrack.controller;

import com.edutrack.model.dto.request.ExamScheduleItemRequest;
import com.edutrack.model.dto.request.ExamTypeRequest;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;
    private final OwnershipGuard ownershipGuard;

    // ---- Exam Types (admin only for writes; read also needed by teachers entering marks
    //      and students viewing their exam schedule, so a separate non-/admin/ read path exists) ----

    @GetMapping("/api/exam-types")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<Map<String, Object>>> listTypesForCaller(
            @RequestParam UUID classId,
            @RequestParam(required = false) String academicYear) {
        ownershipGuard.assertCanViewClass(classId);
        return ResponseEntity.ok(examService.listTypes(classId, academicYear));
    }

    @GetMapping("/api/admin/exam-types")
    public ResponseEntity<List<Map<String, Object>>> listTypes(
            @RequestParam(required = false) UUID classId,
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(examService.listTypes(classId, academicYear));
    }

    @PostMapping("/api/admin/exam-types")
    public ResponseEntity<Map<String, Object>> createType(@RequestBody ExamTypeRequest request) {
        return ResponseEntity.ok(examService.createType(request));
    }

    @PutMapping("/api/admin/exam-types/{id}")
    public ResponseEntity<Map<String, Object>> updateType(@PathVariable UUID id, @RequestBody ExamTypeRequest request) {
        return ResponseEntity.ok(examService.updateType(id, request));
    }

    @DeleteMapping("/api/admin/exam-types/{id}")
    public ResponseEntity<Void> deleteType(@PathVariable UUID id) {
        examService.deleteType(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Exam Schedule ----
    // NOTE: reads must NOT live under /api/admin/** — SecurityConfig blocks that whole
    // prefix to non-ADMIN roles at the filter-chain level, before @PreAuthorize even runs.

    @GetMapping("/api/exam-schedule")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<Map<String, Object>>> listScheduleForCaller(
            @RequestParam UUID classId,
            @RequestParam(required = false) UUID examTypeId) {
        ownershipGuard.assertCanViewClass(classId);
        return ResponseEntity.ok(examService.listSchedule(classId, examTypeId));
    }

    @GetMapping("/api/admin/exam-schedule")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listSchedule(
            @RequestParam UUID classId,
            @RequestParam(required = false) UUID examTypeId) {
        return ResponseEntity.ok(examService.listSchedule(classId, examTypeId));
    }

    @PostMapping("/api/admin/exam-schedule")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> createSchedule(@RequestBody List<ExamScheduleItemRequest> items) {
        return ResponseEntity.ok(examService.createSchedule(items));
    }

    @DeleteMapping("/api/admin/exam-schedule/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSchedule(@PathVariable UUID id) {
        examService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }
}
