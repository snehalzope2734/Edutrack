package com.edutrack.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "exam_papers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamPaper {

    @Id
    private String id;

    private String title;
    private String classId;
    private String subjectId;
    private String teacherId;
    private String examType;
    private List<Section> sections;
    private String pdfCloudinaryUrl;
    private String pdfCloudinaryPublicId;
    private Instant createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Section {
        private String sectionName;
        private String type; // MCQ | SHORT | LONG
        private List<Question> questions;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Question {
        private String questionText;
        private Double marks;
        private String difficulty; // EASY | MEDIUM | HARD
        private String chapter;
        private List<String> options;
        private String answer;
    }
}
