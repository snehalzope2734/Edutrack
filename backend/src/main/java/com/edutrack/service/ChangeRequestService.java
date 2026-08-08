package com.edutrack.service;

import com.edutrack.exception.BadRequestException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.dto.request.ChangeRequestCreateRequest;
import com.edutrack.model.dto.request.ChangeRequestReviewRequest;
import com.edutrack.model.dto.request.NotificationRequest;
import com.edutrack.model.entity.ChangeRequest;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ChangeRequestRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChangeRequestService {

    private static final Set<String> EDITABLE_FIELDS = Set.of(
            "phone",
            "address",
            "parentName",
            "parentEmail",
            "parentPhone",
            "bloodGroup"
    );

    private final ChangeRequestRepository changeRequestRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public Map<String, Object> create(
            ChangeRequestCreateRequest req,
            UUID studentUserId) {

        if (!EDITABLE_FIELDS.contains(req.fieldName())) {
            throw new BadRequestException(
                    "Field '" + req.fieldName()
                            + "' cannot be changed via a change request"
            );
        }

        Student student = studentRepository
                .findByUserId(studentUserId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student profile not found"
                        )
                );

        User requester = userRepository
                .findById(studentUserId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"
                        )
                );

        ChangeRequest changeRequest = ChangeRequest.builder()
                .student(student)
                .requestedBy(requester)
                .fieldName(req.fieldName())
                .oldValue(req.oldValue())
                .newValue(req.newValue())
                .reason(req.reason())
                .attachmentNames(req.attachmentNames())
                .status("PENDING")
                .verificationStatus("PENDING")
                .auditLog("Student submitted request directly to Admin")
                .build();

        ChangeRequest savedRequest = changeRequestRepository.save(changeRequest);

        // Notify Admin directly when student creates a request
        notifyAdminNewRequest(savedRequest, requester);

        return toDto(savedRequest);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myRequests(UUID studentUserId) {
        Student student = studentRepository
                .findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return changeRequestRepository
                .findByStudentId(student.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingForTeacher(UUID classId, String status) {
        throw new UnauthorizedException("Teachers no longer process change requests; requests go directly to Admin.");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> allForAdmin(String status) {
        List<ChangeRequest> requests;

        if (status != null && !status.isBlank()) {
            requests = changeRequestRepository.findByStatus(status);
        } else {
            requests = changeRequestRepository.findAll();
        }

        return requests.stream().map(this::toDto).toList();
    }

    @Transactional
    public Map<String, Object> review(UUID id, ChangeRequestReviewRequest request, UUID reviewerUserId) {
        ChangeRequest changeRequest = changeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));

        User reviewer = userRepository.findById(reviewerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!"ADMIN".equals(reviewer.getRole())) {
            throw new UnauthorizedException("Only admins can review profile change requests");
        }

        String action = request.action() != null ? request.action() : request.status();
        String normalizedAction = action == null ? "" : action.trim().toUpperCase();
        String comment = request.comment() == null ? "" : request.comment().trim();

        if ("APPROVE".equals(normalizedAction) || "APPROVED".equals(normalizedAction)) {
            changeRequest.setStatus("APPROVED");
            changeRequest.setVerificationStatus("APPROVED");
            changeRequest.setAdminComment(comment.isBlank() ? "Approved by admin" : comment);
            changeRequest.setReviewedBy(reviewer);
            changeRequest.setReviewedAt(Instant.now());
            appendAuditEntry(changeRequest, reviewer.getName() + " approved the request");
            applyChange(changeRequest);
            notifyStudent(changeRequest, reviewer);
        } else if ("REJECT".equals(normalizedAction) || "REJECTED".equals(normalizedAction)) {
            changeRequest.setStatus("REJECTED");
            changeRequest.setVerificationStatus("REJECTED");
            changeRequest.setAdminComment(comment.isBlank() ? "Rejected by admin" : comment);
            changeRequest.setReviewedBy(reviewer);
            changeRequest.setReviewedAt(Instant.now());
            appendAuditEntry(changeRequest, reviewer.getName() + " rejected the request");
            notifyStudent(changeRequest, reviewer);
        } else {
            throw new BadRequestException("Unsupported admin decision. Use APPROVE or REJECT.");
        }

        ChangeRequest savedRequest = changeRequestRepository.save(changeRequest);
        return toDto(savedRequest);
    }

    private void appendAuditEntry(ChangeRequest changeRequest, String entry) {
        String current = changeRequest.getAuditLog();
        String next = current == null || current.isBlank()
                ? entry
                : current + "\n" + entry;
        changeRequest.setAuditLog(next);
    }

    private void notifyAdminNewRequest(ChangeRequest changeRequest, User studentUser) {
        String studentName = studentUser.getName();
        NotificationRequest req = new NotificationRequest(
                "New Profile Change Request",
                studentName + " submitted a profile update request for " + prettyFieldName(changeRequest.getFieldName()) + ".",
                "alert",
                List.of("ADMIN"),
                changeRequest.getStudent().getClassEntity() != null ? changeRequest.getStudent().getClassEntity().getId().toString() : null
        );
        notificationService.create(req, studentUser.getId().toString(), studentUser.getRole());
    }

    private void notifyStudent(ChangeRequest changeRequest, User reviewer) {
        User studentUser = changeRequest.getStudent().getUser();
        String status = changeRequest.getStatus();
        String title = status.equals("APPROVED") ? "Profile Change Approved" : "Profile Change Rejected";
        String message = status.equals("APPROVED")
                ? "Your profile change request for " + prettyFieldName(changeRequest.getFieldName()) + " was approved by the admin."
                : "Your profile change request for " + prettyFieldName(changeRequest.getFieldName()) + " was rejected by the admin. Comment: " + (changeRequest.getAdminComment() != null ? changeRequest.getAdminComment() : "None");
        NotificationRequest req = new NotificationRequest(
                title,
                message,
                status.equals("APPROVED") ? "update" : "alert",
                List.of(studentUser.getId().toString()),
                changeRequest.getStudent().getClassEntity() != null ? changeRequest.getStudent().getClassEntity().getId().toString() : null
        );
        notificationService.create(req, reviewer.getId().toString(), reviewer.getRole());
    }

    private void applyChange(ChangeRequest changeRequest) {
        Student student = changeRequest.getStudent();

        switch (changeRequest.getFieldName()) {
            case "phone" -> student.getUser().setPhone(changeRequest.getNewValue());
            case "address" -> student.setAddress(changeRequest.getNewValue());
            case "parentName" -> student.setParentName(changeRequest.getNewValue());
            case "parentEmail" -> student.setParentEmail(changeRequest.getNewValue());
            case "parentPhone" -> student.setParentPhone(changeRequest.getNewValue());
            case "bloodGroup" -> student.setBloodGroup(changeRequest.getNewValue());
            default -> throw new BadRequestException("Unsupported field: " + changeRequest.getFieldName());
        }

        studentRepository.save(student);
    }

    private Map<String, Object> toDto(ChangeRequest changeRequest) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", changeRequest.getId());
        response.put("studentId", changeRequest.getStudent().getId());
        response.put("studentName", changeRequest.getStudent().getUser().getName());
        response.put("studentRollNumber", changeRequest.getStudent().getRollNumber());
        response.put("studentEmail", changeRequest.getStudent().getUser().getEmail());
        response.put("studentPhone", changeRequest.getStudent().getUser().getPhone());
        response.put("studentClassName", changeRequest.getStudent().getClassEntity() != null ? changeRequest.getStudent().getClassEntity().getClassName() : null);
        response.put("studentClassSection", changeRequest.getStudent().getClassEntity() != null ? changeRequest.getStudent().getClassEntity().getSection() : null);
        response.put("fieldName", changeRequest.getFieldName());
        response.put("fieldLabel", prettyFieldName(changeRequest.getFieldName()));
        response.put("oldValue", changeRequest.getOldValue());
        response.put("newValue", changeRequest.getNewValue());
        response.put("currentValue", readCurrentValue(changeRequest));
        response.put("reason", changeRequest.getReason());
        response.put("attachmentNames", changeRequest.getAttachmentNames());
        response.put("status", changeRequest.getStatus());
        response.put("verificationStatus", changeRequest.getVerificationStatus());
        response.put("teacherComment", changeRequest.getTeacherComment());
        response.put("teacherRecommendation", changeRequest.getTeacherRecommendation());
        response.put("adminComment", changeRequest.getAdminComment());
        response.put("forwardedToAdminAt", changeRequest.getForwardedToAdminAt());
        response.put("auditLog", changeRequest.getAuditLog());
        response.put("createdAt", changeRequest.getCreatedAt());
        response.put("reviewedAt", changeRequest.getReviewedAt());
        return response;
    }

    private String prettyFieldName(String fieldName) {
        return switch (fieldName) {
            case "phone" -> "Contact Number";
            case "address" -> "Address";
            case "parentName" -> "Parent Details";
            case "parentEmail" -> "Parent Email";
            case "parentPhone" -> "Parent Contact";
            case "bloodGroup" -> "Blood Group";
            default -> fieldName;
        };
    }

    private String readCurrentValue(ChangeRequest changeRequest) {
        Student student = changeRequest.getStudent();
        return switch (changeRequest.getFieldName()) {
            case "phone" -> student.getUser().getPhone();
            case "address" -> student.getAddress();
            case "parentName" -> student.getParentName();
            case "parentEmail" -> student.getParentEmail();
            case "parentPhone" -> student.getParentPhone();
            case "bloodGroup" -> student.getBloodGroup();
            default -> null;
        };
    }
}