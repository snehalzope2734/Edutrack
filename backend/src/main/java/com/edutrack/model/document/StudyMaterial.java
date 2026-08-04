package com.edutrack.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "study_materials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyMaterial {

    @Id
    private String id;

    private String title;
    private String description;
    private String type; // textbook | notes | reference | assignment

    @Indexed
    private String classId;
    @Indexed
    private String subjectId;

    private String uploadedBy;
    private String cloudinaryUrl;
    private String cloudinaryPublicId;
    private String fileType; // pdf | image | doc
    private Long fileSizeKb;
    private List<String> tags;
    private Instant uploadedAt;
    @Builder.Default
    private Boolean isActive = true;
}
