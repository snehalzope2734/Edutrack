package com.edutrack.model.dto.request;

import java.math.BigDecimal;

public record MarksUpdateRequest(BigDecimal marksObtained, String remarks) {}
