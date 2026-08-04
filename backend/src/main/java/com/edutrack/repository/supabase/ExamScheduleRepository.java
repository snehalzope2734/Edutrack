package com.edutrack.repository.supabase;

import com.edutrack.model.entity.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {
    List<ExamSchedule> findByClassEntityId(UUID classId);
    List<ExamSchedule> findByClassEntityIdAndSubjectId(UUID classId, UUID subjectId);
    List<ExamSchedule> findByClassEntityIdAndExamTypeId(UUID classId, UUID examTypeId);
    boolean existsBySubjectId(UUID subjectId);
    boolean existsByClassEntityId(UUID classId);
}