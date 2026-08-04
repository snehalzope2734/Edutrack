package com.edutrack.model.dto.request;

import java.util.List;

public record NotificationRequest(
        String title,
        String message,
        String type,
        List<String> recipients,
        String classId
) {}
