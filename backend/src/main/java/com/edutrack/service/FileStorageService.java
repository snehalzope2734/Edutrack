package com.edutrack.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private final Path uploadDir;

    public FileStorageService() {
        this.uploadDir = Paths.get(System.getProperty("user.dir"), "uploads").toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
            log.info("Initialized local upload directory at: {}", this.uploadDir);
        } catch (IOException e) {
            log.error("Could not create upload directory", e);
        }
    }

    public Map<String, Object> storeFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            throw new RuntimeException("Failed to store empty file.");
        }

        try {
            String sanitizedFolder = (folder == null || folder.isBlank()) ? "general" : folder.replaceAll("[^a-zA-Z0-9/_.-]", "_");
            Path targetFolder = this.uploadDir.resolve(sanitizedFolder).normalize();
            Files.createDirectories(targetFolder);

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            } else {
                extension = ".pdf";
            }

            String fileId = UUID.randomUUID().toString();
            String storedFileName = fileId + extension;
            Path destinationFile = targetFolder.resolve(storedFileName).normalize();

            Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);

            String relativePath = "uploads/" + sanitizedFolder + "/" + storedFileName;
            String fileUrl = "http://localhost:8080/" + relativePath;

            log.info("File stored locally: destination={}, url={}", destinationFile, fileUrl);

            Map<String, Object> response = new HashMap<>();
            response.put("secure_url", fileUrl);
            response.put("url", fileUrl);
            response.put("public_id", sanitizedFolder + "/" + storedFileName);
            response.put("format", extension.replace(".", ""));
            response.put("bytes", file.getSize());
            response.put("resource_type", "auto");

            return response;
        } catch (IOException e) {
            log.error("Failed to store file locally", e);
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    public boolean deleteFile(String publicId) {
        if (publicId == null || publicId.isBlank()) return false;
        try {
            Path filePath = this.uploadDir.resolve(publicId).normalize();
            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Could not delete local file for publicId={}", publicId, e);
            return false;
        }
    }
}
