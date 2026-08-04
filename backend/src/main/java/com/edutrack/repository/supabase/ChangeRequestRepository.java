package com.edutrack.repository.supabase;

import com.edutrack.model.entity.ChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, UUID> {
    List<ChangeRequest> findByStudentId(UUID studentId);
    List<ChangeRequest> findByStatus(String status);
    List<ChangeRequest> findByStudentClassEntityIdAndStatus(UUID classId, String status);
    List<ChangeRequest> findByStudentClassEntityId(UUID classId);
}
