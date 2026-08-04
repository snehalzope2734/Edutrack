package com.edutrack.repository.mongodb;

import com.edutrack.model.document.AttendanceImport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AttendanceImportRepository extends MongoRepository<AttendanceImport, String> {
    Page<AttendanceImport> findByTeacherIdOrderByUploadedAtDesc(String teacherId, Pageable pageable);
    Page<AttendanceImport> findByClassIdOrderByUploadedAtDesc(String classId, Pageable pageable);
    Page<AttendanceImport> findAllByOrderByUploadedAtDesc(Pageable pageable);
}
