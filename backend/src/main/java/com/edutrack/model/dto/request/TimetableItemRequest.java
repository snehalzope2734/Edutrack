package com.edutrack.model.dto.request;

import java.time.LocalTime;
import java.util.UUID;

public record TimetableItemRequest(
        UUID classId,
        UUID subjectId,
        String dayOfWeek,
        Integer periodNumber,
        LocalTime startTime,
        LocalTime endTime
) {}
