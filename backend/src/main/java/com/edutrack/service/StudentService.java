package com.edutrack.service;

import com.edutrack.exception.ConflictException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.StudentCreateRequest;
import com.edutrack.model.dto.request.StudentUpdateRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.StudentRepository;
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
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final ClassRepository classRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> list(UUID classId, String search, Pageable pageable) {
        return studentRepository.search(classId, search == null ? "" : search, pageable).map(this::toSummaryDto);
    }

    @Transactional
    public Map<String, Object> create(StudentCreateRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ConflictException("A user with this email already exists");
        }
        ClassEntity klass = classRepository.findById(req.classId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role("STUDENT")
                .phone(req.parentPhone())
                .isActive(true)
                .build();
        user = userRepository.save(user);

        Student student = Student.builder()
                .user(user)
                .rollNumber(generateRollNumber(klass))
                .classEntity(klass)
                .dateOfBirth(req.dob())
                .gender(req.gender())
                .bloodGroup(req.bloodGroup())
                .parentName(req.parentName())
                .parentEmail(req.parentEmail())
                .parentPhone(req.parentPhone())
                .address(req.address())
                .admissionDate(LocalDate.now())
                .build();
        student = studentRepository.save(student);

        return toDetailDto(student);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        return toDetailDto(student);
    }

    @Transactional
    public Map<String, Object> update(UUID id, StudentUpdateRequest req) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        User user = student.getUser();
        if (req.name() != null) user.setName(req.name());
        if (req.phone() != null) user.setPhone(req.phone());
        if (req.isActive() != null) user.setIsActive(req.isActive());

        if (req.classId() != null) {
            ClassEntity klass = classRepository.findById(req.classId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
            student.setClassEntity(klass);
        }
        if (req.dob() != null) student.setDateOfBirth(req.dob());
        if (req.gender() != null) student.setGender(req.gender());
        if (req.bloodGroup() != null) student.setBloodGroup(req.bloodGroup());
        if (req.parentName() != null) student.setParentName(req.parentName());
        if (req.parentEmail() != null) student.setParentEmail(req.parentEmail());
        if (req.parentPhone() != null) student.setParentPhone(req.parentPhone());
        if (req.address() != null) student.setAddress(req.address());

        userRepository.save(user);
        student = studentRepository.save(student);
        return toDetailDto(student);
    }

    @Transactional
    public void softDelete(UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        student.getUser().setIsActive(false);
        userRepository.save(student.getUser());
    }

    @Transactional(readOnly = true)
    public Student getEntity(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
    }

    @Transactional(readOnly = true)
    public Student getEntityByUserId(UUID userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this user"));
    }

    private Map<String, Object> toSummaryDto(Student s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getUser().getName());
        m.put("email", s.getUser().getEmail());
        m.put("rollNumber", s.getRollNumber());
        m.put("classId", s.getClassEntity() != null ? s.getClassEntity().getId() : null);
        m.put("className", s.getClassEntity() != null ? s.getClassEntity().getClassName() + s.getClassEntity().getSection() : null);
        m.put("isActive", s.getUser().getIsActive());
        return m;
    }

    private Map<String, Object> toDetailDto(Student s) {
        Map<String, Object> m = toSummaryDto(s);
        m.put("dob", s.getDateOfBirth());
        m.put("gender", s.getGender());
        m.put("bloodGroup", s.getBloodGroup());
        m.put("parentName", s.getParentName());
        m.put("parentEmail", s.getParentEmail());
        m.put("parentPhone", s.getParentPhone());
        m.put("address", s.getAddress());
        m.put("admissionDate", s.getAdmissionDate());
        return m;
    }

    private String generateRollNumber(ClassEntity klass) {
        String prefix = klass.getClassName() + klass.getSection();

        Student lastStudent = studentRepository
                .findTopByClassEntityIdOrderByRollNumberDesc(klass.getId())
                .orElse(null);

        int next = 1;

        if (lastStudent != null) {
            String lastRoll = lastStudent.getRollNumber();
            if (lastRoll.startsWith(prefix)) {
                String number = lastRoll.substring(prefix.length());
                next = Integer.parseInt(number) + 1;
            }
        }

        return prefix + String.format("%03d", next);
    }
}