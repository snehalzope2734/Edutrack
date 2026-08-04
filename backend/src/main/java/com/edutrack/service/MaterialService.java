package com.edutrack.service;

import com.edutrack.exception.BadRequestException;
import com.edutrack.exception.ConflictException;
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
        String title = req.title() == null ? "" : req.title().trim();
        if (title.isBlank()) {
            throw new BadRequestException("Title is required");
        }
        if (!"pdf".equalsIgnoreCase(req.fileType()) && !"application/pdf".equalsIgnoreCase(req.fileType())) {
            throw new BadRequestException("Only PDF files are allowed.");
        }
        if (req.fileSizeKb() != null && req.fileSizeKb() > 10240) {
            throw new BadRequestException("PDF exceeds maximum size.");
        }
        if (materialRepository.existsByClassIdAndSubjectIdAndTitleIgnoreCaseAndIsActiveTrue(
                req.classId().toString(), req.subjectId().toString(), title)) {
            throw new ConflictException("A PDF note with the same title already exists for this class and subject.");
        }

        StudyMaterial material = StudyMaterial.builder()
                .title(title)
                .description(req.description() == null ? null : req.description().trim())
                .type("notes")
                .classId(req.classId().toString())
                .subjectId(req.subjectId().toString())
                .uploadedBy(uploadedByUserId)
                .cloudinaryUrl(req.cloudinaryUrl())
                .cloudinaryPublicId(req.cloudinaryPublicId())
                .fileType("pdf")
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
