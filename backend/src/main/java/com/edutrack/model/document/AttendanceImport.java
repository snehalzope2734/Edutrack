package com.edutrack.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Represents one teacher-initiated Excel attendance upload, from parse/preview
 * through confirmation. This is the ONLY way attendance enters the system —
 * there is no manual per-student marking UI or endpoint. Corrections happen by
 * re-uploading a corrected file for the same class/subject/date (the resulting
 * import upserts the underlying Attendance rows and is itself recorded here,
 * giving a full audit trail of every correction).
 *
 * Stored in MongoDB rather than Postgres because a single import is really one
 * semi-structured document (header + a variable-length list of per-row parse
 * results) that is written once and read as a whole — a natural document-store
 * fit, consistent with how study_materials/notifications/exam_papers are modeled.
 * The committed, queryable attendance FACTS still live in Postgres (see the
 * Attendance JPA entity), so reporting/joins stay relational.
 */
@Document(collection = "attendance_imports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceImport {

    @Id
    private String id;

    @Indexed
    private String teacherId;   // Postgres users.id (teacher's user account)
    @Indexed
    private String classId;    // Postgres classes.id
    @Indexed
    private String subjectId;  // Postgres subjects.id

    private LocalDate date;
    private String fileName;

    private String status; // PENDING_CONFIRMATION | CONFIRMED | DISCARDED

    private int totalRows;
    private int validRows;
    private int errorRows;
    private int duplicateRows;  // rows that will overwrite an existing record
    private Integer importedCount; // set once confirmed

    private List<RowResult> rows;

    private Instant uploadedAt;
    private Instant confirmedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RowResult {
        private int rowNumber;
        private String rollNumberRaw;
        private String statusRaw;
        private String normalizedStatus; // P | A | L, null if invalid
        private String studentId;        // resolved Postgres students.id, null if not found
        private String studentName;
        private boolean duplicate;       // an Attendance record already exists for this student/subject/date
        private String error;            // null if the row is valid
    }
}
