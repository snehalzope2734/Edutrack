package com.edutrack.service;

import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.dto.request.ChangeRequestReviewRequest;
import com.edutrack.model.entity.ChangeRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ChangeRequestRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import com.edutrack.repository.supabase.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class ChangeRequestServiceTest {

    @Mock
    private ChangeRequestRepository changeRequestRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private TeacherRepository teacherRepository;

    @InjectMocks
    private ChangeRequestService changeRequestService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void teacherCannotApproveRequests() {
        UUID requestId = UUID.randomUUID();
        UUID teacherUserId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        User teacherUser = new User();
        teacherUser.setId(teacherUserId);
        teacherUser.setRole("TEACHER");

        Teacher teacher = new Teacher();
        teacher.setId(teacherId);

        Student student = new Student();
        student.setId(UUID.randomUUID());
        ClassEntity classEntity = new ClassEntity();
        classEntity.setId(classId);
        student.setClassEntity(classEntity);

        ChangeRequest request = ChangeRequest.builder()
                .id(requestId)
                .student(student)
                .status("PENDING")
                .build();

        Subject subject = new Subject();
        subject.setClassEntity(classEntity);

        when(changeRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepository.findById(teacherUserId)).thenReturn(Optional.of(teacherUser));
        when(teacherRepository.findByUserId(teacherUserId)).thenReturn(Optional.of(teacher));
        when(subjectRepository.findByTeacherId(teacherId)).thenReturn(List.of(subject));

        ChangeRequestReviewRequest reviewRequest = new ChangeRequestReviewRequest("APPROVED", "APPROVE", "", "");

        assertThrows(UnauthorizedException.class, () -> changeRequestService.review(requestId, reviewRequest, teacherUserId));
    }
}
