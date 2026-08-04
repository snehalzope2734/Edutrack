package com.edutrack.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SubjectCreateRequest(

        @NotBlank(message = "Subject name is required")
        String name,

        String code,

        @NotNull(message = "Class is required")
        UUID classId,

        UUID teacherId

) {}