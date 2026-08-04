package com.edutrack.model.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record ExamTypeRequest(
        String name,
        Integer maxMarks,
        BigDecimal weightage,
        UUID classId,
        String academicYear
) {}
