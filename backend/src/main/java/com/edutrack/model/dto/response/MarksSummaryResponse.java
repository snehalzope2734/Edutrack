package com.edutrack.model.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record MarksSummaryResponse(List<SubjectWiseMarks> subjectWise, BigDecimal overall) {}
