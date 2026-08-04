package com.edutrack.model.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record MarksRecordItem(UUID studentId, BigDecimal marksObtained, String remarks) {}
