package com.edutrack.model.dto.request;

import jakarta.validation.constraints.*;

public record TeacherCreateRequest(

        @NotBlank String name,

        @NotBlank
        @Email String email,

        @NotBlank
        @Size(min = 8, max = 50)
        String password,

        @NotBlank
        @Pattern(regexp = "^[6-9]\\d{9}$")
        String phone,

        @NotBlank
        String department,

        @NotBlank
        String designation,

        @NotBlank
        String qualification

) {}