package com.edutrack.service;

import com.edutrack.exception.BadRequestException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.dto.request.ChangeRequestCreateRequest;
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
                .status("PENDING")
                .build();

        ChangeRequest savedRequest =
                changeRequestRepository.save(changeRequest);

        return toDto(savedRequest);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myRequests(
            UUID studentUserId) {

        Student student = studentRepository
                .findByUserId(studentUserId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Student profile not found"
                        )
                );

        return changeRequestRepository
                .findByStudentId(student.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingForTeacher(
            UUID classId,
            String status) {

        List<ChangeRequest> requests;

        if (status != null) {
            requests =
                    changeRequestRepository
                            .findByStudentClassEntityIdAndStatus(
                                    classId,
                                    status
                            );
        } else {
            requests =
                    changeRequestRepository
                            .findByStudentClassEntityId(classId);
        }

        return requests
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> allForAdmin(
            String status) {

        List<ChangeRequest> requests;

        if (status != null) {
            requests =
                    changeRequestRepository.findByStatus(status);
        } else {
            requests =
                    changeRequestRepository.findAll();
        }

        return requests
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> review(
            UUID id,
            String decision,
            UUID reviewerUserId) {

        /*
         * IMPORTANT:
         * Do not reassign this variable later.
         *
         * It is used inside the anyMatch() lambda below,
         * so Java requires it to remain effectively final.
         */
        ChangeRequest changeRequest =
                changeRequestRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Change request not found"
                                )
                        );

        if (!"PENDING".equals(changeRequest.getStatus())) {
            throw new BadRequestException(
                    "This request has already been reviewed"
            );
        }

        User reviewer =
                userRepository
                        .findById(reviewerUserId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "User not found"
                                )
                        );

        /*
         * If the reviewer is a teacher,
         * verify that the teacher actually teaches
         * the student's class.
         */
        if ("TEACHER".equals(reviewer.getRole())) {

            UUID teacherId =
                    teacherRepository
                            .findByUserId(reviewerUserId)
                            .orElseThrow(() ->
                                    new UnauthorizedException(
                                            "Teacher profile not found"
                                    )
                            )
                            .getId();

            boolean teachesThisStudentsClass =
                    subjectRepository
                            .findByTeacherId(teacherId)
                            .stream()
                            .anyMatch(subject ->

                                    subject.getClassEntity() != null

                                    && changeRequest
                                            .getStudent()
                                            .getClassEntity() != null

                                    && subject
                                            .getClassEntity()
                                            .getId()
                                            .equals(
                                                    changeRequest
                                                            .getStudent()
                                                            .getClassEntity()
                                                            .getId()
                                            )
                            );

            if (!teachesThisStudentsClass) {
                throw new UnauthorizedException(
                        "You may only review requests "
                                + "from students in classes you teach"
                );
            }
        }

        changeRequest.setStatus(decision);
        changeRequest.setReviewedBy(reviewer);
        changeRequest.setReviewedAt(Instant.now());

        if ("APPROVED".equals(decision)) {
            applyChange(changeRequest);
        }

        /*
         * Save into a NEW variable instead of:
         *
         * changeRequest = changeRequestRepository.save(changeRequest);
         *
         * Reassigning changeRequest would cause the lambda
         * compilation error.
         */
        ChangeRequest savedRequest =
                changeRequestRepository.save(changeRequest);

        return toDto(savedRequest);
    }

    private void applyChange(ChangeRequest changeRequest) {

        Student student = changeRequest.getStudent();

        switch (changeRequest.getFieldName()) {

            case "phone" ->
                    student
                            .getUser()
                            .setPhone(changeRequest.getNewValue());

            case "address" ->
                    student.setAddress(
                            changeRequest.getNewValue()
                    );

            case "parentName" ->
                    student.setParentName(
                            changeRequest.getNewValue()
                    );

            case "parentEmail" ->
                    student.setParentEmail(
                            changeRequest.getNewValue()
                    );

            case "parentPhone" ->
                    student.setParentPhone(
                            changeRequest.getNewValue()
                    );

            case "bloodGroup" ->
                    student.setBloodGroup(
                            changeRequest.getNewValue()
                    );

            default ->
                    throw new BadRequestException(
                            "Unsupported field: "
                                    + changeRequest.getFieldName()
                    );
        }

        studentRepository.save(student);
    }

    private Map<String, Object> toDto(
            ChangeRequest changeRequest) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "id",
                changeRequest.getId()
        );

        response.put(
                "studentId",
                changeRequest.getStudent().getId()
        );

        response.put(
                "studentName",
                changeRequest
                        .getStudent()
                        .getUser()
                        .getName()
        );

        response.put(
                "fieldName",
                changeRequest.getFieldName()
        );

        response.put(
                "oldValue",
                changeRequest.getOldValue()
        );

        response.put(
                "newValue",
                changeRequest.getNewValue()
        );

        response.put(
                "reason",
                changeRequest.getReason()
        );

        response.put(
                "status",
                changeRequest.getStatus()
        );

        response.put(
                "createdAt",
                changeRequest.getCreatedAt()
        );

        response.put(
                "reviewedAt",
                changeRequest.getReviewedAt()
        );

        return response;
    }
}