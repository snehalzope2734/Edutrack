package com.edutrack.model.dto.request;

import java.util.UUID;

public record NoticeRequest(
        String title,
        String content,
        String audience, // ALL, CLASS, STUDENT
        UUID classId,
        UUID studentId
) {}
