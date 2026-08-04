package com.edutrack.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TeacherUpdateRequest(

        @NotBlank(message = "Name is required")
        @Size(min = 3, max = 100)
        String name,

        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Phone must be 10 digits")
        String phone,

        @NotBlank(message = "Department is required")
        String department,

        @NotBlank(message = "Designation is required")
        String designation,

        @NotBlank(message = "Qualification is required")
        String qualification,

        Boolean isActive

) {}