package com.edutrack.model.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ExamScheduleItemRequest(
        UUID classId,
        UUID subjectId,
        UUID examTypeId,
        LocalDate examDate,
        LocalTime startTime,
        String venue
) {}
