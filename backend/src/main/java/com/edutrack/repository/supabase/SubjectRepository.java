package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Subject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {

    List<Subject> findByIsActiveTrue();

    List<Subject> findByClassEntityIdAndIsActiveTrue(UUID classId);

    List<Subject> findByTeacherId(UUID teacherId);

    Optional<Subject> findByCode(String code);

    boolean existsByCodeAndIsActiveTrue(String code);

    boolean existsByNameAndClassEntityIdAndIsActiveTrue(String name, UUID classId);
    
    List<Subject> findByNameContainingIgnoreCase(String name);

    @Query("""
            SELECT s
            FROM Subject s
            WHERE s.isActive = true
            AND (
                    :search IS NULL
                    OR :search = ''
                    OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(s.code) LIKE LOWER(CONCAT('%', :search, '%'))
            )
            """)
    Page<Subject> search(String search, Pageable pageable);

}