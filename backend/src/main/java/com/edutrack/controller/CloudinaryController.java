package com.edutrack.controller;

import com.edutrack.model.dto.request.CloudinarySignatureRequest;
import com.edutrack.model.dto.response.CloudinarySignatureResponse;
import com.edutrack.service.CloudinaryService;
import com.edutrack.service.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/cloudinary")
public class CloudinaryController {

    private final CloudinaryService cloudinaryService;
    private final FileStorageService fileStorageService;

    public CloudinaryController(CloudinaryService cloudinaryService, FileStorageService fileStorageService) {
        this.cloudinaryService = cloudinaryService;
        this.fileStorageService = fileStorageService;
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

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false, defaultValue = "edutrack/materials") String folder) {

        try {
            return ResponseEntity.ok(cloudinaryService.uploadMultipartFile(file, folder));
        } catch (Exception e) {
            // Fallback to local file storage if Cloudinary fails
            return ResponseEntity.ok(fileStorageService.storeFile(file, folder));
        }
    }
}