package com.edutrack.repository.supabase;

import com.edutrack.model.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClassRepository extends JpaRepository<ClassEntity, UUID> {

    List<ClassEntity> findByAcademicYear(String academicYear);

    List<ClassEntity> findByClassTeacherId(UUID teacherId);

    boolean existsByClassTeacherIdAndIdNot(UUID teacherId, UUID id);
}