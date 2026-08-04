package com.edutrack.model.dto.response;

import java.util.UUID;

public record MeResponse(UUID id, String name, String email, String role, String profilePhotoUrl) {}
