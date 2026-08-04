package com.edutrack.controller;

import com.edutrack.model.dto.request.NoticeRequest;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;
    private final OwnershipGuard ownershipGuard;

    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> list(
            @RequestParam(required = false) UUID classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        // STUDENT must be viewing their own class's feed; TEACHER viewing a class feed
        // must actually teach in that class. ADMIN is unrestricted (classId may be null = all).
        if (classId != null && !CurrentUser.isAdmin()) {
            ownershipGuard.assertCanViewClass(classId);
        }
        return ResponseEntity.ok(noticeService.listForCaller(CurrentUser.role(), classId, null, PageRequest.of(page, size)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody NoticeRequest request) {
        // A TEACHER posting a CLASS-audience notice must actually teach in that class —
        // previously this trusted whatever classId the client sent with no verification.
        if (CurrentUser.isTeacher() && "CLASS".equals(request.audience()) && request.classId() != null) {
            ownershipGuard.assertCanViewClass(request.classId());
        }
        return ResponseEntity.ok(noticeService.create(request, CurrentUser.id(), CurrentUser.role()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable UUID id, @RequestBody NoticeRequest request) {
        return ResponseEntity.ok(noticeService.update(id, request, CurrentUser.id(), CurrentUser.isAdmin()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        noticeService.delete(id, CurrentUser.id(), CurrentUser.isAdmin());
        return ResponseEntity.noContent().build();
    }
}
