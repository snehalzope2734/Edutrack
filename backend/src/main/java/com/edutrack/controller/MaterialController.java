package com.edutrack.controller;

import com.edutrack.model.document.StudyMaterial;
import com.edutrack.model.dto.request.MaterialRequest;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;
    private final OwnershipGuard ownershipGuard;

    @GetMapping
    public ResponseEntity<Page<StudyMaterial>> list(
            @RequestParam String classId,
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        ownershipGuard.assertCanViewClass(UUID.fromString(classId));
        return ResponseEntity.ok(materialService.list(
                classId,
                subjectId,
                type,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "uploadedAt"))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<StudyMaterial> create(@RequestBody MaterialRequest request) {
        if (CurrentUser.isTeacher()) {
            ownershipGuard.assertOwnsSubject(request.subjectId());
            ownershipGuard.assertCanViewClass(request.classId());
        }
        return ResponseEntity.ok(materialService.create(request, CurrentUser.id().toString()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        materialService.delete(id, CurrentUser.id().toString(), CurrentUser.isAdmin());
        return ResponseEntity.noContent().build();
    }
}
