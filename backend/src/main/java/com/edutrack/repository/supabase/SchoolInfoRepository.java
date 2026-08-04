package com.edutrack.repository.supabase;

import com.edutrack.model.entity.SchoolInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SchoolInfoRepository extends JpaRepository<SchoolInfo, UUID> {
    Optional<SchoolInfo> findFirstByOrderByUpdatedAtDesc();
}
