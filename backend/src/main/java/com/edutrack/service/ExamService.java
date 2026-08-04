package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.ExamScheduleItemRequest;
import com.edutrack.model.dto.request.ExamTypeRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.ExamSchedule;
import com.edutrack.model.entity.ExamType;
import com.edutrack.model.entity.Subject;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.ExamScheduleRepository;
import com.edutrack.repository.supabase.ExamTypeRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamTypeRepository examTypeRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final ClassRepository classRepository;
    private final SubjectRepository subjectRepository;

    // ---- Exam Types ----

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTypes(UUID classId, String academicYear) {
        List<ExamType> types = (classId != null && academicYear != null)
                ? examTypeRepository.findByClassEntityIdAndAcademicYear(classId, academicYear)
                : (classId != null ? examTypeRepository.findByClassEntityId(classId) : examTypeRepository.findAll());
        return types.stream().map(this::toTypeDto).toList();
    }

    @Transactional
    public Map<String, Object> createType(ExamTypeRequest req) {
        ClassEntity klass = classRepository.findById(req.classId())
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        ExamType type = ExamType.builder()
                .name(req.name())
                .maxMarks(req.maxMarks())
                .weightagePct(req.weightage())
                .classEntity(klass)
                .academicYear(req.academicYear())
                .build();
        type = examTypeRepository.save(type);
        return toTypeDto(type);
    }

    @Transactional
    public Map<String, Object> updateType(UUID id, ExamTypeRequest req) {
        ExamType type = examTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam type not found"));
        if (req.name() != null) type.setName(req.name());
        if (req.maxMarks() != null) type.setMaxMarks(req.maxMarks());
        if (req.weightage() != null) type.setWeightagePct(req.weightage());
        if (req.academicYear() != null) type.setAcademicYear(req.academicYear());
        type = examTypeRepository.save(type);
        return toTypeDto(type);
    }

    @Transactional
    public void deleteType(UUID id) {
        if (!examTypeRepository.existsById(id)) throw new ResourceNotFoundException("Exam type not found");
        examTypeRepository.deleteById(id);
    }

    // ---- Exam Schedule ----

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSchedule(UUID classId, UUID examTypeId) {
        List<ExamSchedule> schedule = examTypeId != null
                ? examScheduleRepository.findByClassEntityIdAndExamTypeId(classId, examTypeId)
                : examScheduleRepository.findByClassEntityId(classId);
        return schedule.stream().map(this::toScheduleDto).toList();
    }

    @Transactional
    public List<Map<String, Object>> createSchedule(List<ExamScheduleItemRequest> items) {
        return items.stream().map(item -> {
            ClassEntity klass = classRepository.findById(item.classId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
            Subject subject = subjectRepository.findById(item.subjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            ExamType type = examTypeRepository.findById(item.examTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Exam type not found"));

            ExamSchedule entry = ExamSchedule.builder()
                    .classEntity(klass)
                    .subject(subject)
                    .examType(type)
                    .examDate(item.examDate())
                    .startTime(item.startTime())
                    .venue(item.venue())
                    .build();
            return toScheduleDto(examScheduleRepository.save(entry));
        }).toList();
    }

    @Transactional
    public void deleteSchedule(UUID id) {
        if (!examScheduleRepository.existsById(id)) throw new ResourceNotFoundException("Exam schedule entry not found");
        examScheduleRepository.deleteById(id);
    }

    private Map<String, Object> toTypeDto(ExamType t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("name", t.getName());
        m.put("maxMarks", t.getMaxMarks());
        m.put("weightagePct", t.getWeightagePct());
        m.put("classId", t.getClassEntity() != null ? t.getClassEntity().getId() : null);
        m.put("academicYear", t.getAcademicYear());
        return m;
    }

    private Map<String, Object> toScheduleDto(ExamSchedule s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("classId", s.getClassEntity().getId());
        m.put("subjectId", s.getSubject().getId());
        m.put("subjectName", s.getSubject().getName());
        m.put("examTypeId", s.getExamType().getId());
        m.put("examTypeName", s.getExamType().getName());
        m.put("examDate", s.getExamDate());
        m.put("startTime", s.getStartTime());
        m.put("venue", s.getVenue());
        return m;
    }
}
