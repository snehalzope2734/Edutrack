package com.edutrack.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.edutrack.model.dto.response.CloudinarySignatureResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.api-key}")
    private String apiKey;

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    public CloudinarySignatureResponse generateSignature(
            String folder,
            String uploadPreset) {

        try {
            long timestamp = System.currentTimeMillis() / 1000;

            Map<String, Object> paramsToSign = new TreeMap<>();
            paramsToSign.put("timestamp", timestamp);

            if (folder != null && !folder.isBlank()) {
                paramsToSign.put("folder", folder);
            }

            if (uploadPreset != null && !uploadPreset.isBlank()) {
                paramsToSign.put("upload_preset", uploadPreset);
            }

            log.debug("Generating Cloudinary signature for folder={}, uploadPreset={}, cloudNameConfigured={}, apiKeyConfigured={}",
                    folder, uploadPreset, cloudName != null && !cloudName.isBlank(),
                    apiKey != null && !apiKey.isBlank());

            String signature = cloudinary.apiSignRequest(
                    paramsToSign,
                    cloudinary.config.apiSecret
            );

            return new CloudinarySignatureResponse(
                    signature,
                    timestamp,
                    apiKey,
                    cloudName
            );

        } catch (Exception e) {
            log.error("Cloudinary signature generation failed", e);

            throw new RuntimeException(
                    "Cloudinary signature generation failed: "
                            + e.getMessage(),
                    e
            );
        }
    }

    public Map<String, Object> uploadMultipartFile(MultipartFile file, String folder) {
        try {
            Map<String, Object> options = new HashMap<>();
            if (folder != null && !folder.isBlank()) {
                options.put("folder", folder);
            }
            options.put("resource_type", "auto");

            Map result = cloudinary.uploader().upload(file.getBytes(), options);

            Map<String, Object> response = new HashMap<>();
            response.put("secure_url", result.get("secure_url"));
            response.put("public_id", result.get("public_id"));
            response.put("format", result.get("format") != null ? result.get("format") : "pdf");
            response.put("bytes", result.get("bytes") != null ? result.get("bytes") : file.getSize());
            response.put("resource_type", result.get("resource_type"));

            log.info("Successfully uploaded file to Cloudinary: url={}", result.get("secure_url"));
            return response;
        } catch (Exception e) {
            log.error("Direct Cloudinary upload failed", e);
            throw new RuntimeException("Cloudinary upload failed: " + e.getMessage(), e);
        }
    }

    public String uploadRawBytes(byte[] bytes, String folder, String publicId) {
        try {
            Map<String, Object> options = ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", publicId,
                    "resource_type", "raw",
                    "type", "upload"
            );

            Map result = cloudinary.uploader().upload(bytes, options);
            Object secureUrl = result.get("secure_url");
            return secureUrl != null ? secureUrl.toString() : null;
        } catch (Exception e) {
            throw new RuntimeException("Cloudinary raw upload failed", e);
        }
    }

    public void deleteAsset(String publicId) {
        try {
            Map result = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", "raw",
                            "type", "upload"
                    )
            );

            log.info("Cloudinary delete result for publicId={}: {}", publicId, result);
        } catch (Exception e) {
            log.warn("Cloudinary delete failed for publicId={}", publicId, e);
        }
    }
}