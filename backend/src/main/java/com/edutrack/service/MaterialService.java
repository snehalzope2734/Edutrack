package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.document.StudyMaterial;
import com.edutrack.model.dto.request.MaterialRequest;
import com.edutrack.repository.mongodb.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final CloudinaryService cloudinaryService;

    public Page<StudyMaterial> list(String classId, String subjectId, String type, Pageable pageable) {
        if (subjectId != null && type != null) {
            return materialRepository.findByClassIdAndSubjectIdAndTypeAndIsActiveTrue(classId, subjectId, type, pageable);
        } else if (subjectId != null) {
            return materialRepository.findByClassIdAndSubjectIdAndIsActiveTrue(classId, subjectId, pageable);
        } else if (type != null) {
            return materialRepository.findByClassIdAndTypeAndIsActiveTrue(classId, type, pageable);
        }
        return materialRepository.findByClassIdAndIsActiveTrue(classId, pageable);
    }

    public StudyMaterial create(MaterialRequest req, String uploadedByUserId) {
        StudyMaterial material = StudyMaterial.builder()
                .title(req.title())
                .description(req.description())
                .type(req.type())
                .classId(req.classId().toString())
                .subjectId(req.subjectId().toString())
                .uploadedBy(uploadedByUserId)
                .cloudinaryUrl(req.cloudinaryUrl())
                .cloudinaryPublicId(req.cloudinaryPublicId())
                .fileType(req.fileType())
                .fileSizeKb(req.fileSizeKb())
                .tags(req.tags())
                .uploadedAt(Instant.now())
                .isActive(true)
                .build();
        return materialRepository.save(material);
    }

    public void delete(String id, String callerUserId, boolean isAdmin) {
        StudyMaterial material = materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found"));
        if (!isAdmin && !material.getUploadedBy().equals(callerUserId)) {
            throw new UnauthorizedException("You may only delete materials you uploaded");
        }
        if (material.getCloudinaryPublicId() != null) {
            cloudinaryService.deleteAsset(material.getCloudinaryPublicId());
        }
        materialRepository.deleteById(id);
    }
}
