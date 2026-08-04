package com.edutrack.controller;

import com.edutrack.model.dto.request.TimetableItemRequest;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;
    private final OwnershipGuard ownershipGuard;

    @GetMapping("/api/timetable/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<Map<String, Object>>> get(@PathVariable UUID classId) {
        ownershipGuard.assertCanViewClass(classId);
        return ResponseEntity.ok(timetableService.getForClass(classId));
    }

    @PostMapping("/api/admin/timetable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> create(@RequestParam UUID classId, @RequestBody List<TimetableItemRequest> items) {
        return ResponseEntity.ok(timetableService.replaceForClass(classId, items));
    }

    @PutMapping("/api/admin/timetable/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable UUID id, @RequestBody TimetableItemRequest item) {
        return ResponseEntity.ok(timetableService.updateSlot(id, item));
    }

    @DeleteMapping("/api/admin/timetable/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        timetableService.deleteSlot(id);
        return ResponseEntity.noContent().build();
    }
}
