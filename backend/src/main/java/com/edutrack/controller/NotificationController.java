package com.edutrack.controller;

import com.edutrack.model.document.Notification;
import com.edutrack.model.dto.request.NotificationRequest;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final OwnershipGuard ownershipGuard;

    @GetMapping
    public ResponseEntity<Page<Notification>> list(
            @RequestParam(required = false) String classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notificationService.listForUser(CurrentUser.id().toString(), classId, PageRequest.of(page, size)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Notification> create(@RequestBody NotificationRequest request) {
        if (CurrentUser.isTeacher()) {
            boolean broadcastsToAll = request.recipients() != null && request.recipients().contains("ALL");
            if (broadcastsToAll) {
                throw new UnauthorizedException("Teachers may only notify their own class, not everyone");
            }
            if (request.classId() != null) {
                ownershipGuard.assertCanViewClass(UUID.fromString(request.classId()));
            }
        }
        return ResponseEntity.ok(notificationService.create(request, CurrentUser.id().toString(), CurrentUser.role()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markRead(@PathVariable String id) {
        return ResponseEntity.ok(notificationService.markRead(id, CurrentUser.id().toString()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        notificationService.delete(id, CurrentUser.id().toString(), CurrentUser.isAdmin());
        return ResponseEntity.noContent().build();
    }
}
