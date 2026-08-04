package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.ReportCardRequest;
import com.edutrack.model.entity.ExamType;
import com.edutrack.model.entity.ReportCard;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ExamTypeRepository;
import com.edutrack.repository.supabase.ReportCardRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportCardService {

    private final ReportCardRepository reportCardRepository;
    private final StudentRepository studentRepository;
    private final ExamTypeRepository examTypeRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForStudent(UUID studentId) {
    	return reportCardRepository.findByStudent_Id(studentId)
    	        .stream()
    	        .map(this::toDto)
    	        .toList();
    }

    @Transactional
    public Map<String, Object> create(
            ReportCardRequest req,
            UUID uploadedByUserId
    ) {

        Student student = studentRepository.findById(req.studentId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student not found"));

        ExamType examType = examTypeRepository.findById(req.examTypeId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Exam type not found"));

        User uploader = userRepository.findById(uploadedByUserId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        System.out.println("Searching existing report card...");
        // Find latest report card for same student + exam + academic year
        ReportCard reportCard = reportCardRepository
                .findFirstByStudent_IdAndExamType_IdAndAcademicYearOrderByUploadedAtDesc(
                        req.studentId(),
                        req.examTypeId(),
                        req.academicYear()
                )
                .orElse(null);

        System.out.println("Found report card = " + reportCard);

        if (reportCard != null) {

            String oldPublicId = reportCard.getPdfCloudinaryPublicId();

            reportCard.setPdfUrl(req.pdfCloudinaryUrl());
            reportCard.setPdfCloudinaryPublicId(req.pdfCloudinaryPublicId());
            reportCard.setUploadedBy(uploader);

            reportCard = reportCardRepository.save(reportCard);

            if (oldPublicId != null
                    && !oldPublicId.isBlank()
                    && !oldPublicId.equals(req.pdfCloudinaryPublicId())) {

                cloudinaryService.deleteAsset(oldPublicId);
            }

        } else {

            reportCard = ReportCard.builder()
                    .student(student)
                    .examType(examType)
                    .academicYear(req.academicYear())
                    .pdfUrl(req.pdfCloudinaryUrl())
                    .pdfCloudinaryPublicId(req.pdfCloudinaryPublicId())
                    .uploadedBy(uploader)
                    .build();

            reportCard = reportCardRepository.save(reportCard);
        }

        return toDto(reportCard);
    }

    @Transactional
    public void delete(UUID id, UUID callerUserId, boolean isAdmin) {
        ReportCard reportCard = reportCardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report card not found"));
        if (!isAdmin && !reportCard.getUploadedBy().getId().equals(callerUserId)) {
            throw new com.edutrack.exception.UnauthorizedException("You may only delete report cards you uploaded");
        }
        String publicId = reportCard.getPdfCloudinaryPublicId();

        reportCardRepository.delete(reportCard);

        if (publicId != null && !publicId.isBlank()) {
            cloudinaryService.deleteAsset(publicId);
        }
    }

    private Map<String, Object> toDto(ReportCard r) {

        Map<String, Object> m = new LinkedHashMap<>();

        m.put("id", r.getId());
        m.put("studentId", r.getStudent().getId());
        m.put("examTypeId", r.getExamType().getId());
        m.put("examTypeName", r.getExamType().getName());
        m.put("academicYear", r.getAcademicYear());
        m.put("pdfUrl", r.getPdfUrl());

        // Add this line
        m.put("pdfCloudinaryPublicId", r.getPdfCloudinaryPublicId());

        m.put("uploadedAt", r.getUploadedAt());

        return m;
    }
}
