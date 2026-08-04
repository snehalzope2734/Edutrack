package com.edutrack.model.dto.request;

public record SchoolInfoRequest(
        String schoolName,
        String tagline,
        String description,
        String address,
        String city,
        String state,
        String pincode,
        String phone,
        String email,
        String website,
        String logoUrl,
        String bannerUrl,
        String principalName,
        Integer establishedYear
) {}
