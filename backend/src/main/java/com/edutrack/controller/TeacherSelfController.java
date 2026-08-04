package com.edutrack.controller;

import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.TeacherSelfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teacher/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherSelfController {

    private final TeacherSelfService teacherSelfService;
    private final OwnershipGuard ownershipGuard;

    @GetMapping
    public ResponseEntity<Map<String, Object>> me() {
        return ResponseEntity.ok(teacherSelfService.getMyProfile(CurrentUser.id()));
    }

    /** Roster for a class the teacher actually teaches a subject in — not an arbitrary class. */
    @GetMapping("/students")
    public ResponseEntity<List<Map<String, Object>>> students(@RequestParam UUID classId) {
        ownershipGuard.assertCanViewClass(classId);
        return ResponseEntity.ok(teacherSelfService.getStudentsInClass(classId));
    }
}
