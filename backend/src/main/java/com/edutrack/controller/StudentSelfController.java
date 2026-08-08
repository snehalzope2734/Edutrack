package com.edutrack.controller;

import com.edutrack.model.entity.Student;
import com.edutrack.security.CurrentUser;
import com.edutrack.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/student/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class StudentSelfController {

    private final StudentService studentService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> me() {
        Student student = studentService.getEntityByUserId(CurrentUser.id());
        return ResponseEntity.ok(studentService.getById(student.getId()));
    }
}