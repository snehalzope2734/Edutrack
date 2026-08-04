package com.edutrack.model.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record ClassRequest(
        @NotBlank String className,
        @NotBlank String section,
        @NotBlank String academicYear,
        UUID classTeacherId
) {}
