package com.edutrack.security;

import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.entity.*;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

/**
 * Direct coverage of the IDOR-prevention logic: a STUDENT (or TEACHER) simply
 * changing an id in the URL must not be able to reach another student's or
 * class's data. See OwnershipGuard for why @PreAuthorize's role check alone
 * can't catch this.
 */
@ExtendWith(MockitoExtension.class)
class OwnershipGuardTest {

    @Mock private StudentRepository studentRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private SubjectRepository subjectRepository;

    private void loginAs(UUID userId, String role) {
        User principal = User.builder().id(userId).email("x@x.com").role(role).isActive(true).build();
        var auth = new UsernamePasswordAuthenticationToken(new CustomUserDetails(principal), null, new CustomUserDetails(principal).getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void studentCannotViewAnotherStudentsRecords() {
        UUID myUserId = UUID.randomUUID();
        Student me = Student.builder().id(UUID.randomUUID()).build();
        UUID someoneElsesStudentId = UUID.randomUUID();

        loginAs(myUserId, "STUDENT");
        when(studentRepository.findByUserId(myUserId)).thenReturn(Optional.of(me));

        OwnershipGuard guard = new OwnershipGuard(studentRepository, teacherRepository, subjectRepository);

        assertThrows(UnauthorizedException.class, () -> guard.assertCanViewStudent(someoneElsesStudentId));
    }

    @Test
    void studentCanViewOwnRecords() {
        UUID myUserId = UUID.randomUUID();
        UUID myStudentId = UUID.randomUUID();
        Student me = Student.builder().id(myStudentId).build();

        loginAs(myUserId, "STUDENT");
        when(studentRepository.findByUserId(myUserId)).thenReturn(Optional.of(me));

        OwnershipGuard guard = new OwnershipGuard(studentRepository, teacherRepository, subjectRepository);

        assertDoesNotThrow(() -> guard.assertCanViewStudent(myStudentId));
    }

    @Test
    void teacherCannotViewStudentOutsideTheirTaughtClasses() {
        UUID teacherUserId = UUID.randomUUID();
        Teacher teacher = Teacher.builder().id(UUID.randomUUID()).build();

        ClassEntity myClass = ClassEntity.builder().id(UUID.randomUUID()).build();
        ClassEntity otherClass = ClassEntity.builder().id(UUID.randomUUID()).build();

        Student targetStudent = Student.builder().id(UUID.randomUUID()).classEntity(otherClass).build();

        loginAs(teacherUserId, "TEACHER");
        when(studentRepository.findById(targetStudent.getId())).thenReturn(Optional.of(targetStudent));
        when(teacherRepository.findByUserId(teacherUserId)).thenReturn(Optional.of(teacher));
        when(subjectRepository.findByTeacherId(teacher.getId())).thenReturn(
                List.of(Subject.builder().id(UUID.randomUUID()).classEntity(myClass).build()));

        OwnershipGuard guard = new OwnershipGuard(studentRepository, teacherRepository, subjectRepository);

        assertThrows(UnauthorizedException.class, () -> guard.assertCanViewStudent(targetStudent.getId()));
    }

    @Test
    void teacherCanViewStudentInClassTheyTeach() {
        UUID teacherUserId = UUID.randomUUID();
        Teacher teacher = Teacher.builder().id(UUID.randomUUID()).build();
        ClassEntity myClass = ClassEntity.builder().id(UUID.randomUUID()).build();
        Student targetStudent = Student.builder().id(UUID.randomUUID()).classEntity(myClass).build();

        loginAs(teacherUserId, "TEACHER");
        when(studentRepository.findById(targetStudent.getId())).thenReturn(Optional.of(targetStudent));
        when(teacherRepository.findByUserId(teacherUserId)).thenReturn(Optional.of(teacher));
        when(subjectRepository.findByTeacherId(teacher.getId())).thenReturn(
                List.of(Subject.builder().id(UUID.randomUUID()).classEntity(myClass).build()));

        OwnershipGuard guard = new OwnershipGuard(studentRepository, teacherRepository, subjectRepository);

        assertDoesNotThrow(() -> guard.assertCanViewStudent(targetStudent.getId()));
    }

    @Test
    void adminBypassesAllOwnershipChecks() {
        loginAs(UUID.randomUUID(), "ADMIN");
        OwnershipGuard guard = new OwnershipGuard(studentRepository, teacherRepository, subjectRepository);
        assertDoesNotThrow(() -> guard.assertCanViewStudent(UUID.randomUUID()));
        assertDoesNotThrow(() -> guard.assertCanViewClass(UUID.randomUUID()));
    }
}
