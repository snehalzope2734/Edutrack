package com.edutrack.controller;

import com.edutrack.model.dto.request.ClassRequest;
//import com.edutrack.service.AttendanceService;
import com.edutrack.service.ClassService;
import com.edutrack.service.StudentService;
import com.edutrack.service.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/classes")
@RequiredArgsConstructor
public class AdminClassController {

    private final ClassService classService;
    private final StudentService studentService;
    private final TimetableService timetableService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(classService.list(academicYear));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody ClassRequest request) {
        return ResponseEntity.ok(classService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(classService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable UUID id, @RequestBody ClassRequest request) {
        return ResponseEntity.ok(classService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        classService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<Page<Map<String, Object>>> students(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(studentService.list(id, null, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}/timetable")
    public ResponseEntity<List<Map<String, Object>>> timetable(@PathVariable UUID id) {
        return ResponseEntity.ok(timetableService.getForClass(id));
    }
}
