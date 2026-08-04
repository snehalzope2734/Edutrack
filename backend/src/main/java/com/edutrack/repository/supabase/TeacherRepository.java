package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Teacher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherRepository extends JpaRepository<Teacher, UUID> {

    Optional<Teacher> findByUserId(UUID userId);

    boolean existsByEmployeeCode(String employeeCode);

    List<Teacher> findAllByEmployeeCodeStartingWith(String prefix);

    Optional<Teacher> findTopByOrderByEmployeeCodeDesc();

    @Query("""
        select t from Teacher t
        where (
            :search is null
            or :search = ''
            or lower(t.user.name) like lower(concat('%',:search,'%'))
            or lower(t.user.email) like lower(concat('%',:search,'%'))
            or lower(t.employeeCode) like lower(concat('%',:search,'%'))
        )
    """)
    Page<Teacher> search(String search, Pageable pageable);
}