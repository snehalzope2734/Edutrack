package com.edutrack.controller;

import com.edutrack.model.dto.request.CloudinarySignatureRequest;
import com.edutrack.model.dto.response.CloudinarySignatureResponse;
import com.edutrack.service.CloudinaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cloudinary")
public class CloudinaryController {

    private final CloudinaryService cloudinaryService;

    public CloudinaryController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    @PostMapping("/signature")
    public ResponseEntity<CloudinarySignatureResponse> signature(
            @RequestBody CloudinarySignatureRequest request) {

        return ResponseEntity.ok(
                cloudinaryService.generateSignature(
                        request.folder(),
                        request.uploadPreset()
                )
        );
    }
}