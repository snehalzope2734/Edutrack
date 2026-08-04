package com.edutrack.model.dto.request;

import java.util.UUID;

public record ReportCardRequest(
        UUID studentId,
        UUID examTypeId,
        String academicYear,
        String pdfCloudinaryUrl,
        String pdfCloudinaryPublicId
) {}
