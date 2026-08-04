package com.edutrack.service;

import com.edutrack.model.dto.request.SubjectCreateRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private ClassRepository classRepository;

    @Mock
    private TeacherRepository teacherRepository;

    @InjectMocks
    private SubjectService subjectService;

    @Test
    void create_shouldGenerateCodeFromSubjectClassAndSectionWhenCodeIsMissing() {
        UUID classId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        ClassEntity classEntity = new ClassEntity();
        classEntity.setId(classId);
        classEntity.setClassName("10");
        classEntity.setSection("A");

        User user = new User();
        user.setName("John Doe");

        Teacher teacher = new Teacher();
        teacher.setId(teacherId);
        teacher.setUser(user);

        Subject savedSubject = Subject.builder()
                .name("Science")
                .code("SCIENCE10A")
                .classEntity(classEntity)
                .teacher(teacher)
                .isActive(true)
                .build();

        when(subjectRepository.existsByCodeAndIsActiveTrue(any())).thenReturn(false);
        when(subjectRepository.existsByNameAndClassEntityIdAndIsActiveTrue("Science", classId)).thenReturn(false);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(teacherRepository.findById(teacherId)).thenReturn(Optional.of(teacher));
        when(subjectRepository.save(any(Subject.class))).thenReturn(savedSubject);

        Map<String, Object> result = subjectService.create(new SubjectCreateRequest("Science", "", classId, teacherId));

        ArgumentCaptor<Subject> subjectCaptor = ArgumentCaptor.forClass(Subject.class);
        verify(subjectRepository).save(subjectCaptor.capture());

        assertEquals("SCIENCE10A", subjectCaptor.getValue().getCode());
        assertEquals("SCIENCE10A", result.get("code"));
    }

    @Test
    void create_shouldAllowMissingTeacherId() {
        UUID classId = UUID.randomUUID();

        ClassEntity classEntity = new ClassEntity();
        classEntity.setId(classId);
        classEntity.setClassName("10");
        classEntity.setSection("A");

        Subject savedSubject = Subject.builder()
                .name("Science")
                .code("SCIENCE10A")
                .classEntity(classEntity)
                .teacher(null)
                .isActive(true)
                .build();

        when(subjectRepository.existsByCodeAndIsActiveTrue(any())).thenReturn(false);
        when(subjectRepository.existsByNameAndClassEntityIdAndIsActiveTrue("Science", classId)).thenReturn(false);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classEntity));
        when(subjectRepository.save(any(Subject.class))).thenReturn(savedSubject);

        Map<String, Object> result = subjectService.create(new SubjectCreateRequest("Science", "", classId, null));

        assertEquals("SCIENCE10A", result.get("code"));
    }
}
