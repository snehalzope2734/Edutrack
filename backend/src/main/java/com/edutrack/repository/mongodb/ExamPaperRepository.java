package com.edutrack.repository.mongodb;

import com.edutrack.model.document.ExamPaper;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ExamPaperRepository extends MongoRepository<ExamPaper, String> {
    List<ExamPaper> findByClassIdAndSubjectId(String classId, String subjectId);
    List<ExamPaper> findByTeacherId(String teacherId);
}
