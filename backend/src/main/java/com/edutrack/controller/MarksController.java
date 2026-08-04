package com.edutrack.controller;

import com.edutrack.model.dto.request.MarksEnterRequest;
import com.edutrack.model.dto.request.MarksUpdateRequest;
import com.edutrack.model.dto.response.MarksSummaryResponse;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.MarksService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/marks")
@RequiredArgsConstructor
public class MarksController {

    private final MarksService marksService;
    private final OwnershipGuard ownershipGuard;

    @PostMapping("/enter")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Map<String, Object>> enter(@RequestBody MarksEnterRequest request) {
        ownershipGuard.assertOwnsSubject(request.subjectId());
        return ResponseEntity.ok(marksService.enterMarks(request, CurrentUser.id()));
    }

    @GetMapping("/class/{classId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> classMarks(
            @PathVariable UUID classId,
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) UUID examTypeId) {
        ownershipGuard.assertCanViewClass(classId);
        if (CurrentUser.isTeacher() && subjectId != null) ownershipGuard.assertOwnsSubject(subjectId);
        return ResponseEntity.ok(marksService.classMarks(classId, subjectId, examTypeId));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> studentMarks(
            @PathVariable UUID studentId,
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) UUID examTypeId) {
        ownershipGuard.assertCanViewStudent(studentId);
        return ResponseEntity.ok(marksService.studentMarks(studentId, subjectId, examTypeId));
    }

    @GetMapping("/student/{studentId}/summary")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<MarksSummaryResponse> studentSummary(@PathVariable UUID studentId) {
        ownershipGuard.assertCanViewStudent(studentId);
        return ResponseEntity.ok(marksService.studentSummary(studentId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable UUID id, @RequestBody MarksUpdateRequest request) {
        // Marks entity doesn't carry subjectId directly in the path, so ownership
        // is enforced by MarksService looking up the record's subject/teacher —
        // see the guard call added there.
        return ResponseEntity.ok(marksService.updateMarksGuarded(id, request.marksObtained(), request.remarks(), CurrentUser.id()));
    }
}
