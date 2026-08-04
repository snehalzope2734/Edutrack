package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Everything a logged-in TEACHER needs to know about their own assignments —
 * which classes they teach which subjects in, and which class (if any) they
 * are the class-teacher of. Kept separate from AdminXController because it's
 * scoped to "me", not to an arbitrary teacher id an admin might look up.
 */
@Service
@RequiredArgsConstructor
public class TeacherSelfService {

    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getMyProfile(UUID userId) {
        Teacher teacher = teacherRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher profile not found"));

        List<Subject> mySubjects = subjectRepository.findByTeacherId(teacher.getId());
        List<ClassEntity> myClassTeacherOf = classRepository.findByClassTeacherId(teacher.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("teacherId", teacher.getId());
        result.put("name", teacher.getUser().getName());
        result.put("employeeCode", teacher.getEmployeeCode());

        result.put("subjects", mySubjects.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subjectId", s.getId());
            m.put("subjectName", s.getName());
            m.put("classId", s.getClassEntity().getId());
            m.put("className", s.getClassEntity().getClassName() + s.getClassEntity().getSection());
            m.put("studentCount", studentRepository.findByClassEntityId(s.getClassEntity().getId()).size());
            return m;
        }).toList());

        result.put("classTeacherOf", myClassTeacherOf.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("classId", c.getId());
            m.put("className", c.getClassName() + c.getSection());
            return m;
        }).toList());

        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStudentsInClass(UUID classId) {
        return studentRepository.findByClassEntityId(classId).stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getUser().getName());
            m.put("rollNumber", s.getRollNumber());
            m.put("classId", classId);
            return m;
        }).toList();
    }
}
