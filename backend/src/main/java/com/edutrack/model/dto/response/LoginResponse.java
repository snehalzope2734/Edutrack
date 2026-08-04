package com.edutrack.model.dto.response;

import java.util.UUID;

public record LoginResponse(String token, String role, UUID userId, String name) {}
