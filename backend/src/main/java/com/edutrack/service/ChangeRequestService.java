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
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
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
    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;
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
                .auditLog("Student submitted request")
                .build();

        ChangeRequest savedRequest = changeRequestRepository.save(changeRequest);
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
        List<ChangeRequest> requests;

        if (status != null && !status.isBlank()) {
            requests = changeRequestRepository.findByStudentClassEntityIdAndStatus(classId, status);
        } else {
            requests = changeRequestRepository.findByStudentClassEntityId(classId);
        }

        return requests.stream().map(this::toDto).toList();
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
                System.out.println("hii");
        String action = request.action() != null ? request.action() : request.status();
        String normalizedAction = action == null ? "" : action.trim().toUpperCase();
        String comment = request.comment() == null ? "" : request.comment().trim();
        String recommendation = request.recommendation() == null ? "" : request.recommendation().trim();

        User reviewer = userRepository.findById(reviewerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if ("TEACHER".equals(reviewer.getRole())) {
            UUID teacherId = teacherRepository.findByUserId(reviewerUserId)
                    .orElseThrow(() -> new UnauthorizedException("Teacher profile not found"))
                    .getId();

            boolean teachesThisStudentsClass = subjectRepository.findByTeacherId(teacherId).stream().anyMatch(subject ->
                    subject.getClassEntity() != null
                            && changeRequest.getStudent().getClassEntity() != null
                            && subject.getClassEntity().getId().equals(changeRequest.getStudent().getClassEntity().getId()));

            if (!teachesThisStudentsClass) {
                throw new UnauthorizedException("You may only review requests from students in classes you teach");
            }

            if ("APPROVE".equals(normalizedAction) || "REJECT".equals(normalizedAction)) {
                throw new UnauthorizedException("Teachers may only verify, clarify, or forward requests to admin");
            }

            if ("VERIFY".equals(normalizedAction) || "VERIFIED".equals(normalizedAction)) {
                changeRequest.setStatus("VERIFIED");
                changeRequest.setVerificationStatus("VERIFIED");
                changeRequest.setTeacherComment(comment.isBlank() ? "Verified by teacher" : comment);
                changeRequest.setTeacherRecommendation(recommendation.isBlank() ? "Request verified by teacher" : recommendation);
                appendAuditEntry(changeRequest, reviewer.getName() + " verified the request");
            } else if ("CLARIFICATION".equals(normalizedAction) || "CLARIFICATION_NEEDED".equals(normalizedAction)) {
                changeRequest.setStatus("CLARIFICATION_NEEDED");
                changeRequest.setVerificationStatus("CLARIFICATION_NEEDED");
                changeRequest.setTeacherComment(comment.isBlank() ? "Clarification requested by teacher" : comment);
                changeRequest.setTeacherRecommendation(recommendation.isBlank() ? "Needs clarification before forwarding" : recommendation);
                appendAuditEntry(changeRequest, reviewer.getName() + " requested clarification");
            } else if ("FORWARD".equals(normalizedAction) || "FORWARDED".equals(normalizedAction) || "FORWARD_TO_ADMIN".equals(normalizedAction)) {
                changeRequest.setStatus("FORWARDED");
                changeRequest.setVerificationStatus("FORWARDED");
                changeRequest.setTeacherComment(comment.isBlank() ? "Forwarded to admin for final review" : comment);
                changeRequest.setTeacherRecommendation(recommendation.isBlank() ? "Recommendation prepared for admin" : recommendation);
                changeRequest.setForwardedToAdminAt(Instant.now());
                appendAuditEntry(changeRequest, reviewer.getName() + " forwarded the request to admin");
                notifyAdmin(changeRequest, reviewer);
            } else {
                throw new BadRequestException("Unsupported teacher action");
            }
        } else if ("ADMIN".equals(reviewer.getRole())) {
            if (!"FORWARDED".equals(changeRequest.getStatus()) && !"VERIFIED".equals(changeRequest.getStatus()) && !"PENDING".equals(changeRequest.getStatus())) {
                if (!"APPROVED".equals(changeRequest.getStatus()) && !"REJECTED".equals(changeRequest.getStatus())) {
                    throw new BadRequestException("Only forwarded requests can be finalized by admin");
                }
            }

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
                throw new BadRequestException("Unsupported admin decision");
            }
        } else {
            throw new UnauthorizedException("Only teachers and admins can review change requests");
        }

        changeRequest.setReviewedBy(reviewer);
        changeRequest.setReviewedAt(Instant.now());
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

    private void notifyAdmin(ChangeRequest changeRequest, User reviewer) {
        String studentName = changeRequest.getStudent().getUser().getName();
        NotificationRequest req = new NotificationRequest(
                "New profile change request",
                studentName + " submitted a profile update request that needs admin review.",
                "alert",
                List.of("ADMIN"),
                changeRequest.getStudent().getClassEntity() != null ? changeRequest.getStudent().getClassEntity().getId().toString() : null
        );
        notificationService.create(req, reviewer.getId().toString(), reviewer.getRole());
    }

    private void notifyStudent(ChangeRequest changeRequest, User reviewer) {
        User studentUser = changeRequest.getStudent().getUser();
        String status = changeRequest.getStatus();
        String title = status.equals("APPROVED") ? "Profile change approved" : "Profile change update";
        String message = status.equals("APPROVED")
                ? "Your profile change request was approved by the admin."
                : "Your profile change request was reviewed and returned for further action.";
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