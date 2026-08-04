package com.edutrack.model.dto.request;

import java.util.List;
import java.util.UUID;

public record MaterialRequest(
        String title,
        String description,
        String type,
        UUID classId,
        UUID subjectId,
        String cloudinaryUrl,
        String cloudinaryPublicId,
        String fileType,
        Long fileSizeKb,
        List<String> tags
) {}
