package com.edutrack.repository.supabase;

import com.edutrack.model.entity.ReportCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportCardRepository extends JpaRepository<ReportCard, UUID> {

    List<ReportCard> findByStudent_Id(UUID studentId);

    Optional<ReportCard>
    findFirstByStudent_IdAndExamType_IdAndAcademicYearOrderByUploadedAtDesc(
            UUID studentId,
            UUID examTypeId,
            String academicYear
    );
}