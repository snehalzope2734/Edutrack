package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.MarksEnterRequest;
import com.edutrack.model.dto.request.MarksRecordItem;
import com.edutrack.model.dto.response.MarksSummaryResponse;
import com.edutrack.model.dto.response.SubjectWiseMarks;
import com.edutrack.model.entity.ExamType;
import com.edutrack.model.entity.Marks;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ExamTypeRepository;
import com.edutrack.repository.supabase.MarksRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MarksService {

    private final MarksRepository marksRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ExamTypeRepository examTypeRepository;
    private final UserRepository userRepository;
    private final com.edutrack.repository.supabase.TeacherRepository teacherRepository;

    @Transactional
    public Map<String, Object> enterMarks(MarksEnterRequest req, UUID enteredByUserId) {
        Subject subject = subjectRepository.findById(req.subjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        ExamType examType = examTypeRepository.findById(req.examTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam type not found"));
        User enteredBy = userRepository.findById(enteredByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        int upserted = 0;
        for (MarksRecordItem item : req.records()) {
            Student student = studentRepository.findById(item.studentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + item.studentId()));

            Marks marks = marksRepository.findByStudentIdAndSubjectIdAndExamTypeId(student.getId(), subject.getId(), examType.getId())
                    .orElseGet(() -> Marks.builder()
                            .student(student)
                            .subject(subject)
                            .examType(examType)
                            .build());

            marks.setMarksObtained(item.marksObtained());
            marks.setRemarks(item.remarks());
            marks.setGrade(computeGrade(item.marksObtained(), examType.getMaxMarks()));
            marks.setEnteredBy(enteredBy);
            marksRepository.save(marks);
            upserted++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("classId", req.classId());
        result.put("subjectId", req.subjectId());
        result.put("examTypeId", req.examTypeId());
        result.put("recordsUpserted", upserted);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> classMarks(UUID classId, UUID subjectId, UUID examTypeId) {
        List<Marks> records = marksRepository.findByStudentClassEntityIdAndSubjectIdAndExamTypeId(classId, subjectId, examTypeId);
        return records.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> studentMarks(UUID studentId, UUID subjectId, UUID examTypeId) {
        List<Marks> records;
        if (subjectId != null) {
            records = marksRepository.findByStudentIdAndSubjectId(studentId, subjectId);
        } else if (examTypeId != null) {
            records = marksRepository.findByStudentIdAndExamTypeId(studentId, examTypeId);
        } else {
            records = marksRepository.findByStudentId(studentId);
        }
        return records.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public MarksSummaryResponse studentSummary(UUID studentId) {
        List<Marks> all = marksRepository.findByStudentId(studentId);

        List<SubjectWiseMarks> subjectWise = all.stream()
                .map(m -> new SubjectWiseMarks(
                        m.getSubject().getName(),
                        m.getExamType().getName(),
                        m.getMarksObtained(),
                        m.getExamType().getMaxMarks(),
                        m.getGrade()))
                .toList();

        BigDecimal totalObtained = all.stream()
                .map(Marks::getMarksObtained)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalMax = all.stream()
                .map(m -> BigDecimal.valueOf(m.getExamType().getMaxMarks()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal overallPct = totalMax.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalObtained.multiply(BigDecimal.valueOf(100)).divide(totalMax, 2, RoundingMode.HALF_UP);

        return new MarksSummaryResponse(subjectWise, overallPct);
    }

    @Transactional
    public Map<String, Object> updateMarks(UUID marksId, BigDecimal marksObtained, String remarks) {
        Marks marks = marksRepository.findById(marksId)
                .orElseThrow(() -> new ResourceNotFoundException("Marks record not found"));
        marks.setMarksObtained(marksObtained);
        marks.setRemarks(remarks);
        marks.setGrade(computeGrade(marksObtained, marks.getExamType().getMaxMarks()));
        marks = marksRepository.save(marks);
        return toDto(marks);
    }

    /**
     * Same as {@link #updateMarks} but additionally verifies — for TEACHER
     * callers — that the record's subject is one they are actually assigned
     * to teach, since the marksId path alone doesn't reveal that to a
     * URL-pattern-based security rule.
     */
    @Transactional
    public Map<String, Object> updateMarksGuarded(UUID marksId, BigDecimal marksObtained, String remarks, UUID callerUserId) {
        Marks marks = marksRepository.findById(marksId)
                .orElseThrow(() -> new ResourceNotFoundException("Marks record not found"));

        if (!com.edutrack.security.CurrentUser.isAdmin()) {
            var teacher = teacherRepositoryLookup(callerUserId);
            if (marks.getSubject().getTeacher() == null || !marks.getSubject().getTeacher().getId().equals(teacher.getId())) {
                throw new com.edutrack.exception.UnauthorizedException("You are not assigned to teach this subject");
            }
        }

        marks.setMarksObtained(marksObtained);
        marks.setRemarks(remarks);
        marks.setGrade(computeGrade(marksObtained, marks.getExamType().getMaxMarks()));
        marks = marksRepository.save(marks);
        return toDto(marks);
    }

    private com.edutrack.model.entity.Teacher teacherRepositoryLookup(UUID userId) {
        return teacherRepository.findByUserId(userId)
                .orElseThrow(() -> new com.edutrack.exception.UnauthorizedException("Teacher profile not found"));
    }

    private String computeGrade(BigDecimal obtained, Integer maxMarks) {
        return com.edutrack.util.GradeCalculator.computeGrade(obtained, maxMarks);
    }

    private Map<String, Object> toDto(Marks m) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", m.getId());
        dto.put("studentId", m.getStudent().getId());
        dto.put("studentName", m.getStudent().getUser().getName());
        dto.put("subjectId", m.getSubject().getId());
        dto.put("subjectName", m.getSubject().getName());
        dto.put("examTypeId", m.getExamType().getId());
        dto.put("examTypeName", m.getExamType().getName());
        dto.put("marksObtained", m.getMarksObtained());
        dto.put("maxMarks", m.getExamType().getMaxMarks());
        dto.put("grade", m.getGrade());
        dto.put("remarks", m.getRemarks());
        return dto;
    }
}
