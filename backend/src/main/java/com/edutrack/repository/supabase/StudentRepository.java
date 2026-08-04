package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    Optional<Student> findByUserId(UUID userId);

    List<Student> findByClassEntityId(UUID classId);

    // For auto roll number generation
    Optional<Student> findTopByClassEntityIdOrderByRollNumberDesc(UUID classId);

    // Safety check
    boolean existsByRollNumber(String rollNumber);

    @Query("""
        SELECT s
        FROM Student s
        WHERE s.user.isActive = true
          AND (:classId IS NULL OR s.classEntity.id = :classId)
          AND (
                :search IS NULL
                OR :search = ''
                OR LOWER(s.user.name) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(s.user.email) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        ORDER BY s.classEntity.className,
                 s.classEntity.section,
                 s.rollNumber
        """)
    Page<Student> search(UUID classId, String search, Pageable pageable);
}