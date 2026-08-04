package com.edutrack.repository.supabase;

import com.edutrack.model.entity.ExamType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExamTypeRepository extends JpaRepository<ExamType, UUID> {
    List<ExamType> findByClassEntityIdAndAcademicYear(UUID classId, String academicYear);
    List<ExamType> findByClassEntityId(UUID classId);
}
