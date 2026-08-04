package com.edutrack.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SubjectUpdateRequest(

        @NotBlank(message = "Subject name is required")
        String name,

        @NotBlank(message = "Subject code is required")
        String code,

        @NotNull(message = "Class is required")
        UUID classId,

        @NotNull(message = "Teacher is required")
        UUID teacherId

) {}
