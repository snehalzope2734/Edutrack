package com.edutrack.controller;

import com.edutrack.model.dto.request.SchoolInfoRequest;
import com.edutrack.model.entity.SchoolInfo;
import com.edutrack.service.SchoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @GetMapping("/api/school")
    public ResponseEntity<SchoolInfo> get() {
        // Authenticated (any role) — there is no PUBLIC access tier in this system.
        // The login screen shows a static app name only; branding loads after login.
        return ResponseEntity.ok(schoolService.get());
    }

    @PutMapping("/api/school")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SchoolInfo> update(@RequestBody SchoolInfoRequest request) {
        return ResponseEntity.ok(schoolService.update(request));
    }

    @PutMapping("/api/admin/school")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SchoolInfo> updateAdmin(@RequestBody SchoolInfoRequest request) {
        return ResponseEntity.ok(schoolService.update(request));
    }
}
