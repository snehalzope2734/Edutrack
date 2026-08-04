package com.edutrack.controller;

import com.edutrack.model.dto.request.ChangeRequestCreateRequest;
import com.edutrack.model.dto.request.ChangeRequestReviewRequest;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.ChangeRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/change-requests")
@RequiredArgsConstructor
public class ChangeRequestController {

    private final ChangeRequestService changeRequestService;
    private final StudentRepository studentRepository;
    private final OwnershipGuard ownershipGuard;

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID classId) {
        if (CurrentUser.isAdmin()) {
            return ResponseEntity.ok(changeRequestService.allForAdmin(status));
        }
        if (classId == null) {
            throw new com.edutrack.exception.BadRequestException("classId is required for teacher requests");
        }
        ownershipGuard.assertCanViewClass(classId);
        return ResponseEntity.ok(changeRequestService.pendingForTeacher(classId, status));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<Map<String, Object>>> myRequests() {
        return ResponseEntity.ok(changeRequestService.myRequests(CurrentUser.id()));
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody ChangeRequestCreateRequest request) {
        return ResponseEntity.ok(changeRequestService.create(request, CurrentUser.id()));
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> review(@PathVariable UUID id, @RequestBody ChangeRequestReviewRequest request) {
        return ResponseEntity.ok(changeRequestService.review(id, request, CurrentUser.id()));
    }
}
