package com.edutrack.model.dto.request;

public record ChangeRequestReviewRequest(
        String status,
        String action,
        String comment,
        String recommendation
) {}
