package com.edutrack.repository.supabase;

import com.edutrack.model.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface NoticeRepository extends JpaRepository<Notice, UUID> {

    @Query("select n from Notice n where n.isArchived = false and (" +
           "n.audience = 'ALL' " +
           "or (n.audience = 'CLASS' and n.classEntity.id = :classId) " +
           "or (n.audience = 'STUDENT' and n.student.id = :studentId)) " +
           "order by n.postedAt desc")
    Page<Notice> findRelevant(UUID classId, UUID studentId, Pageable pageable);

    Page<Notice> findByIsArchivedFalseOrderByPostedAtDesc(Pageable pageable);
}
