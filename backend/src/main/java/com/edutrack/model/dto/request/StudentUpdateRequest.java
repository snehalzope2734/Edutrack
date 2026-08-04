package com.edutrack.model.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record StudentUpdateRequest(

        @NotBlank(message = "Name is required")
        @Size(min = 3, max = 100)
        String name,

        @Pattern(
                regexp = "^[6-9]\\d{9}$",
                message = "Phone must be a valid 10 digit number"
        )
        String phone,

        @NotNull(message = "Class is required")
        UUID classId,

        @NotNull(message = "DOB is required")
        @Past(message = "DOB must be in the past")
        LocalDate dob,

        @NotBlank(message = "Gender is required")
        String gender,

        String bloodGroup,

        @NotBlank(message = "Parent name is required")
        String parentName,

        @NotBlank(message = "Parent email is required")
        @Email(message = "Invalid parent email")
        String parentEmail,

        @NotBlank(message = "Parent phone is required")
        @Pattern(
                regexp = "^[6-9]\\d{9}$",
                message = "Parent phone must be a valid 10 digit number"
        )
        String parentPhone,

        @NotBlank(message = "Address is required")
        String address,

        Boolean isActive

) {}