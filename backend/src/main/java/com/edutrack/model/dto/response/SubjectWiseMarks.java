package com.edutrack.model.dto.response;

import java.math.BigDecimal;

public record SubjectWiseMarks(String subjectName, String examType, BigDecimal marks, Integer maxMarks, String grade) {}
