package com.edutrack.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    private String id;

    private String title;
    private String message;
    private String type; // notice | alert | reminder | update
    private String senderId;
    private String senderRole; // ADMIN | TEACHER

    private List<String> recipients; // user UUIDs, ["ALL"], or ["CLASS:{class_id}"]
    @Builder.Default
    private List<String> isReadBy = new java.util.ArrayList<>();

    private String classId;
    private Instant createdAt;
    private Instant expiresAt;
}
