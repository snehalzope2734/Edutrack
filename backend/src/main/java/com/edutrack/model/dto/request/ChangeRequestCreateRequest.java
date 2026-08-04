package com.edutrack.model.dto.request;

public record ChangeRequestCreateRequest(
        String fieldName,
        String oldValue,
        String newValue,
        String reason
) {}
