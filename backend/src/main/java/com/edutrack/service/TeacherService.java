package com.edutrack.service;

import com.edutrack.exception.ConflictException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.TeacherCreateRequest;
import com.edutrack.model.dto.request.TeacherUpdateRequest;
import com.edutrack.model.entity.Teacher;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import com.edutrack.repository.supabase.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> list(String search, Pageable pageable) {
        return teacherRepository.search(search == null ? "" : search, pageable).map(this::toSummaryDto);
    }

    @Transactional
    public Map<String, Object> create(TeacherCreateRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ConflictException("A user with this email already exists");
        }

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role("TEACHER")
                .phone(req.phone())
                .isActive(true)
                .build();
        user = userRepository.save(user);

        Teacher teacher = Teacher.builder()
                .user(user)
                .employeeCode(generateEmployeeCode())
                .department(req.department())
                .designation(req.designation())
                .qualification(req.qualification())
                .joinedDate(LocalDate.now())
                .build();
        teacher = teacherRepository.save(teacher);

        return toDetailDto(teacher);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(UUID id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        return toDetailDto(teacher);
    }

    @Transactional
    public Map<String, Object> update(UUID id, TeacherUpdateRequest req) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        User user = teacher.getUser();
        if (req.name() != null) user.setName(req.name());
        if (req.phone() != null) user.setPhone(req.phone());
        if (req.isActive() != null) user.setIsActive(req.isActive());

        if (req.department() != null) teacher.setDepartment(req.department());
        if (req.designation() != null) teacher.setDesignation(req.designation());
        if (req.qualification() != null) teacher.setQualification(req.qualification());

        userRepository.save(user);
        teacher = teacherRepository.save(teacher);
        return toDetailDto(teacher);
    }

    @Transactional
    public void softDelete(UUID id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        teacher.getUser().setIsActive(false);
        userRepository.save(teacher.getUser());
    }

    private Map<String, Object> toSummaryDto(Teacher t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("name", t.getUser().getName());
        m.put("email", t.getUser().getEmail());
        m.put("phone", t.getUser().getPhone());
        m.put("employeeCode", t.getEmployeeCode());
        m.put("department", t.getDepartment());
        m.put("designation", t.getDesignation());
        m.put("isActive", t.getUser().getIsActive());
        return m;
    }

    private Map<String, Object> toDetailDto(Teacher t) {
        Map<String, Object> m = toSummaryDto(t);
        m.put("qualification", t.getQualification());
        m.put("joinedDate", t.getJoinedDate());
        m.put("assignedSubjects", subjectRepository.findByTeacherId(t.getId()).stream().map(s -> {
            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("id", s.getId());
            sm.put("name", s.getName());
            sm.put("classId", s.getClassEntity() != null ? s.getClassEntity().getId() : null);
            return sm;
        }).toList());
        return m;
    }

    private String generateEmployeeCode() {
        List<Teacher> existingTeachers = teacherRepository.findAllByEmployeeCodeStartingWith("EMP");

        int next = existingTeachers.stream()
                .map(Teacher::getEmployeeCode)
                .filter(code -> code != null && code.startsWith("EMP"))
                .map(code -> code.substring(3))
                .mapToInt(value -> {
                    try {
                        return Integer.parseInt(value);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .max()
                .orElse(0) + 1;

        return "EMP" + String.format("%03d", next);
    }
}