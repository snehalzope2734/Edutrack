package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.ClassRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Teacher;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.ExamScheduleRepository;
import com.edutrack.repository.supabase.MarksRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import com.edutrack.repository.supabase.TimetableRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClassService {

    private final ClassRepository classRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final TimetableRepository timetableRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final AttendanceRepository attendanceRepository;
    private final MarksRepository marksRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String academicYear) {
        List<ClassEntity> classes = (academicYear == null || academicYear.isBlank())
                ? classRepository.findAll()
                : classRepository.findByAcademicYear(academicYear);
        return classes.stream().map(this::toSummaryDto).toList();
    }

    @Transactional
    public Map<String, Object> create(ClassRequest req) {
        ClassEntity klass = ClassEntity.builder()
                .className(req.className())
                .section(req.section())
                .academicYear(req.academicYear())
                .build();
                
        if (req.classTeacherId() != null) {
            if (classRepository.findByClassTeacherId(req.classTeacherId()).size() > 0) {
                throw new IllegalStateException("Teacher is already assigned as a class teacher.");
            }
        
            Teacher teacher = teacherRepository.findById(req.classTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
            klass.setClassTeacher(teacher);
        }
        
        klass = classRepository.save(klass);
        return toDetailDto(klass);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(UUID id) {
        ClassEntity klass = classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
        return toDetailDto(klass);
    }

    @Transactional
    public Map<String, Object> update(UUID id, ClassRequest req) {
        ClassEntity klass = classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
                
        if (req.className() != null) klass.setClassName(req.className());
        if (req.section() != null) klass.setSection(req.section());
        if (req.academicYear() != null) klass.setAcademicYear(req.academicYear());
        
        if (req.classTeacherId() != null) {
            if (classRepository.existsByClassTeacherIdAndIdNot(req.classTeacherId(), id)) {
                throw new IllegalStateException("Teacher is already assigned as another class teacher.");
            }
        
            Teacher teacher = teacherRepository.findById(req.classTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        
            klass.setClassTeacher(teacher);
        } else {
            // Teacher remove karna ho
            klass.setClassTeacher(null);
        }
        
        klass = classRepository.save(klass);
        return toDetailDto(klass);
    }

    @Transactional
    public void delete(UUID id) {

        ClassEntity klass = classRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Class not found"));

        if (!studentRepository.findByClassEntityId(id).isEmpty()) {
            throw new IllegalStateException(
                    "Cannot delete class because students are assigned.");
        }

        if (!subjectRepository.findByClassEntityIdAndIsActiveTrue(id).isEmpty()) {
            throw new IllegalStateException(
                    "Cannot delete class because subjects are assigned.");
        }

        if (timetableRepository.existsByClassEntityId(id)) {
            throw new IllegalStateException(
                    "Cannot delete class because timetable exists.");
        }

        if (examScheduleRepository.existsByClassEntityId(id)) {
            throw new IllegalStateException(
                    "Cannot delete class because exam schedule exists.");
        }

        if (attendanceRepository.existsByStudentClassEntityId(id)) {
            throw new IllegalStateException(
                    "Cannot delete class because attendance records exist.");
        }

        if (marksRepository.existsByStudentClassEntityId(id)) {
            throw new IllegalStateException(
                    "Cannot delete class because marks exist.");
        }

        classRepository.delete(klass);
    }

    @Transactional(readOnly = true)
    public ClassEntity getEntity(UUID id) {
        return classRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Class not found"));
    }

    private Map<String, Object> toSummaryDto(ClassEntity c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("className", c.getClassName());
        m.put("section", c.getSection());
        m.put("academicYear", c.getAcademicYear());
        m.put("classTeacherId", c.getClassTeacher() != null ? c.getClassTeacher().getId() : null);
        m.put("classTeacherName", c.getClassTeacher() != null ? c.getClassTeacher().getUser().getName() : null);
        m.put("studentCount", studentRepository.findByClassEntityId(c.getId()).size());
        return m;
    }

    private Map<String, Object> toDetailDto(ClassEntity c) {
        Map<String, Object> m = toSummaryDto(c);
        m.put("subjects", subjectRepository.findByClassEntityIdAndIsActiveTrue(c.getId()).stream().map(s -> {
            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("id", s.getId());
            sm.put("name", s.getName());
            sm.put("code", s.getCode());
            sm.put("teacherId", s.getTeacher() != null ? s.getTeacher().getId() : null);
            sm.put("teacherName", s.getTeacher() != null ? s.getTeacher().getUser().getName() : null);
            return sm;
        }).toList());
        return m;
    }
}