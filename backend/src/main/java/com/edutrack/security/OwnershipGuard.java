package com.edutrack.security;

import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Central place for the "is this caller actually allowed to touch this specific
 * resource" checks that a URL-pattern-based security rule can't express (e.g.
 * "STUDENT can view their own attendance" or "TEACHER can only upload marks for
 * a subject they are assigned to"). @PreAuthorize on its own only checks role,
 * never resource ownership — every controller that takes a
 * studentId/classId/subjectId path or query parameter MUST additionally call
 * one of these before touching data, or a student/teacher can view or modify
 * another student's/class's records simply by changing the id in the URL.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OwnershipGuard {

	private final StudentRepository studentRepository;
	private final TeacherRepository teacherRepository;
	private final SubjectRepository subjectRepository;

	/**
	 * STUDENT may only access their own studentId; TEACHER/ADMIN are unrestricted
	 * here.
	 */
	public void assertCanViewStudent(UUID studentId) {
		log.debug("Evaluating student ownership check for user={} role={} requestedStudent={}",
				CurrentUser.id(), CurrentUser.role(), studentId);

		if (CurrentUser.isAdmin())
			return;

		if (CurrentUser.isStudent()) {
			Student self = studentRepository.findByUserId(CurrentUser.id())
					.orElseThrow(() -> new UnauthorizedException("Student profile not found"));

			if (!self.getId().equals(studentId)) {
				throw new UnauthorizedException("You may only view your own records");
			}
			return;
		}

		if (CurrentUser.isTeacher()) {
			Student target = studentRepository.findById(studentId)
					.orElseThrow(() -> new UnauthorizedException("Student not found"));
			Teacher teacher = teacherRepository.findByUserId(CurrentUser.id())
					.orElseThrow(() -> new UnauthorizedException("Teacher profile not found"));
			List<Subject> taught = subjectRepository.findByTeacherId(teacher.getId());
			boolean teachesThisStudentsClass = taught.stream()
					.anyMatch(s -> s.getClassEntity() != null && target.getClassEntity() != null
							&& s.getClassEntity().getId().equals(target.getClassEntity().getId()));
			if (!teachesThisStudentsClass) {
				throw new UnauthorizedException("You may only view students in classes you teach");
			}
		}
	}

	/**
	 * STUDENT may only access their own classId; TEACHER must teach at least one
	 * subject in that class.
	 */
	public void assertCanViewClass(UUID classId) {
		if (CurrentUser.isAdmin())
			return;

		if (CurrentUser.isStudent()) {
			Student self = studentRepository.findByUserId(CurrentUser.id())
					.orElseThrow(() -> new UnauthorizedException("Student profile not found"));
			if (self.getClassEntity() == null || !self.getClassEntity().getId().equals(classId)) {
				throw new UnauthorizedException("You may only view your own class");
			}
			return;
		}

		if (CurrentUser.isTeacher()) {
			Teacher teacher = teacherRepository.findByUserId(CurrentUser.id())
					.orElseThrow(() -> new UnauthorizedException("Teacher profile not found"));
			List<Subject> taught = subjectRepository.findByTeacherId(teacher.getId());
			boolean teachesThisClass = taught.stream()
					.anyMatch(s -> s.getClassEntity() != null && s.getClassEntity().getId().equals(classId));
			if (!teachesThisClass) {
				throw new UnauthorizedException("You are not assigned to teach this class");
			}
		}
	}

	/**
	 * TEACHER must be the assigned teacher of this exact subject; ADMIN
	 * unrestricted.
	 */
	public void assertOwnsSubject(UUID subjectId) {
		if (CurrentUser.isAdmin())
			return;
		Subject subject = subjectRepository.findById(subjectId)
				.orElseThrow(() -> new UnauthorizedException("Subject not found"));
		Teacher teacher = teacherRepository.findByUserId(CurrentUser.id())
				.orElseThrow(() -> new UnauthorizedException("Teacher profile not found"));
		if (subject.getTeacher() == null || !subject.getTeacher().getId().equals(teacher.getId())) {
			throw new UnauthorizedException("You are not assigned to teach this subject");
		}
	}
}