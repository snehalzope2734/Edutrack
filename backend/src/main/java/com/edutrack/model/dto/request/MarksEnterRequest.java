package com.edutrack.model.dto.request;

import java.util.List;
import java.util.UUID;

public record MarksEnterRequest(
        UUID classId,
        UUID subjectId,
        UUID examTypeId,
        List<MarksRecordItem> records
) {}
