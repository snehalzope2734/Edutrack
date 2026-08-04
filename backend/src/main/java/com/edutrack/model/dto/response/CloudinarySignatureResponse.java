package com.edutrack.model.dto.response;

public record CloudinarySignatureResponse(String signature, long timestamp, String apiKey, String cloudName) {}
