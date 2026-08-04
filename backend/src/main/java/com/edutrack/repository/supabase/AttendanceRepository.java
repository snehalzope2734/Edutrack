package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    List<Attendance> findByStudentIdAndSubjectIdAndAttendanceDateBetween(
            UUID studentId,
            UUID subjectId,
            LocalDate from,
            LocalDate to
    );

    List<Attendance> findByStudentIdAndAttendanceDateBetween(
            UUID studentId,
            LocalDate from,
            LocalDate to
    );

    List<Attendance> findByStudentClassEntityIdAndSubjectIdAndAttendanceDate(
            UUID classId,
            UUID subjectId,
            LocalDate date
    );

    List<Attendance> findByStudentClassEntityIdAndSubjectIdAndAttendanceDateBetween(
            UUID classId,
            UUID subjectId,
            LocalDate from,
            LocalDate to
    );

    Optional<Attendance> findByStudentIdAndSubjectIdAndAttendanceDate(
            UUID studentId,
            UUID subjectId,
            LocalDate date
    );
    
    boolean existsByStudentClassEntityId(UUID classId);
    
    
}