package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Marks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MarksRepository extends JpaRepository<Marks, UUID> {

    List<Marks> findByStudentClassEntityIdAndSubjectIdAndExamTypeId(UUID classId, UUID subjectId, UUID examTypeId);

    List<Marks> findByStudentId(UUID studentId);

    List<Marks> findByStudentIdAndSubjectId(UUID studentId, UUID subjectId);

    List<Marks> findByStudentIdAndExamTypeId(UUID studentId, UUID examTypeId);

    List<Marks> findByStudentClassEntityIdAndSubjectId(UUID classId, UUID subjectId);

    Optional<Marks> findByStudentIdAndSubjectIdAndExamTypeId(UUID studentId, UUID subjectId, UUID examTypeId);
    
    boolean existsByStudentClassEntityId(UUID classId);

    // --- Newly Added Method ---

    @Query("""
    SELECT COALESCE(AVG(m.marksObtained),0)
    FROM Marks m
    WHERE m.student.classEntity.id = :classId
    """)
    Double findAverageMarksByClass(UUID classId);
}