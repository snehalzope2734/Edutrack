package com.edutrack.repository.mongodb;

import com.edutrack.model.document.StudyMaterial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MaterialRepository extends MongoRepository<StudyMaterial, String> {

    Page<StudyMaterial> findByClassIdAndIsActiveTrue(String classId, Pageable pageable);

    Page<StudyMaterial> findByClassIdAndSubjectIdAndIsActiveTrue(String classId, String subjectId, Pageable pageable);

    Page<StudyMaterial> findByClassIdAndTypeAndIsActiveTrue(String classId, String type, Pageable pageable);

    Page<StudyMaterial> findByClassIdAndSubjectIdAndTypeAndIsActiveTrue(String classId, String subjectId, String type, Pageable pageable);

    List<StudyMaterial> findByUploadedBy(String uploadedBy);
}
