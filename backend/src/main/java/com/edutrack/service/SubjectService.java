package com.edutrack.service;

import com.edutrack.exception.ConflictException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.SubjectCreateRequest;
import com.edutrack.model.dto.request.SubjectUpdateRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UUID classId) {

        List<Subject> subjects;

        if (classId == null) {
            subjects = subjectRepository.findByIsActiveTrue();
        } else {
            subjects = subjectRepository.findByClassEntityIdAndIsActiveTrue(classId);
        }

        return subjects.stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> create(SubjectCreateRequest req) {

        ClassEntity classEntity = classRepository.findById(req.classId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));

        Teacher teacher = null;
        if (req.teacherId() != null) {
            teacher = teacherRepository.findById(req.teacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        }

        String generatedCode = generateCode(req.name(), classEntity);

        if (subjectRepository.existsByCodeAndIsActiveTrue(generatedCode)) {
            throw new ConflictException("Subject code already exists");
        }

        if (subjectRepository.existsByNameAndClassEntityIdAndIsActiveTrue(req.name(), req.classId())) {
            throw new ConflictException("This subject already exists for the selected class");
        }

        Subject subject = Subject.builder()
                .name(req.name())
                .code(generatedCode)
                .classEntity(classEntity)
                .teacher(teacher)
                .isActive(true)
                .build();

        subject = subjectRepository.save(subject);

        return toDto(subject);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(UUID id) {

        Subject subject = subjectRepository.findById(id)
                .filter(Subject::getIsActive)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Subject not found"));

        return toDto(subject);
    }

    @Transactional
    public Map<String, Object> update(UUID id, SubjectUpdateRequest req) {

        Subject subject = subjectRepository.findById(id)
                .filter(Subject::getIsActive)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Subject not found"));

        ClassEntity classEntity = classRepository.findById(req.classId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Class not found"));

        Teacher teacher = null;
        if (req.teacherId() != null) {
            teacher = teacherRepository.findById(req.teacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        }

        String generatedCode = generateCode(req.name(), classEntity);

        if (!subject.getCode().equals(generatedCode)
                && subjectRepository.existsByCodeAndIsActiveTrue(generatedCode)) {

            throw new ConflictException("Subject code already exists");
        }

        subject.setName(req.name());
        subject.setCode(generatedCode);
        subject.setClassEntity(classEntity);
        subject.setTeacher(teacher);

        subject = subjectRepository.save(subject);

        return toDto(subject);
    }

    @Transactional
    public void delete(UUID id) {

        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Subject not found"));

        subject.setIsActive(false);

        subjectRepository.save(subject);
    }

    private String generateCode(String subjectName, ClassEntity classEntity) {
        String baseName = subjectName == null ? "" : subjectName.trim().toUpperCase(Locale.ROOT);
        String className = classEntity.getClassName() == null ? "" : classEntity.getClassName().trim().toUpperCase(Locale.ROOT);
        String section = classEntity.getSection() == null ? "" : classEntity.getSection().trim().toUpperCase(Locale.ROOT);

        String cleanedName = baseName.replaceAll("[^A-Z0-9]+", "");
        String cleanedClass = className.replaceAll("[^A-Z0-9]+", "");
        String cleanedSection = section.replaceAll("[^A-Z0-9]+", "");

        return (cleanedName + cleanedClass + cleanedSection).replaceAll("^([A-Z0-9]{1,})$", "$1");
    }

    private Map<String, Object> toDto(Subject subject) {

        Map<String, Object> map = new LinkedHashMap<>();

        map.put("id", subject.getId());

        map.put("name", subject.getName());

        map.put("code", subject.getCode());

        map.put("classId",
                subject.getClassEntity().getId());

        map.put("className",
                subject.getClassEntity().getClassName()
                        + subject.getClassEntity().getSection());

        if (subject.getTeacher() != null) {
            map.put("teacherId", subject.getTeacher().getId());
            map.put("teacherName", subject.getTeacher().getUser().getName());
        } else {
            map.put("teacherId", null);
            map.put("teacherName", null);
        }

        return map;
    }
}