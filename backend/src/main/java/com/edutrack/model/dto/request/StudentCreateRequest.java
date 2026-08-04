package com.edutrack.model.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record StudentCreateRequest(

        @NotBlank(message = "Name is required")
        @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
        String password,

        @NotNull(message = "Class is required")
        UUID classId,

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be in the past")
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
        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Parent phone must be a valid 10 digit number")
        String parentPhone,

        @NotBlank(message = "Address is required")
        String address

) {}