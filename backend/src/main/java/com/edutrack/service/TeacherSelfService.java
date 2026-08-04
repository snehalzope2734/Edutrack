package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.entity.Attendance;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.ExamSchedule;
import com.edutrack.model.entity.ExamType;
import com.edutrack.model.entity.Marks;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.Subject;
import com.edutrack.model.entity.Teacher;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.ExamScheduleRepository;
import com.edutrack.repository.supabase.ExamTypeRepository;
import com.edutrack.repository.supabase.MarksRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import com.edutrack.repository.supabase.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Everything a logged-in TEACHER needs to know about their own assignments —
 * which classes they teach which subjects in, and which class (if any) they
 * are the class-teacher of. Kept separate from AdminXController because it's
 * scoped to "me", not to an arbitrary teacher id an admin might look up.
 */
@Service
@RequiredArgsConstructor
public class TeacherSelfService {

    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final MarksRepository marksRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final ExamTypeRepository examTypeRepository;
    private final TimetableRepository timetableRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getMyProfile(UUID userId) {
        Teacher teacher = teacherRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher profile not found"));

        List<Subject> mySubjects = subjectRepository.findByTeacherId(teacher.getId());
        List<ClassEntity> myClassTeacherOf = classRepository.findByClassTeacherId(teacher.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("teacherId", teacher.getId());
        result.put("name", teacher.getUser().getName());
        result.put("employeeCode", teacher.getEmployeeCode());

        result.put("subjects", mySubjects.stream().map(this::toSubjectDto).toList());
        result.put("classTeacherOf", myClassTeacherOf.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("classId", c.getId());
            m.put("className", c.getClassName() + c.getSection());
            m.put("section", c.getSection());
            return m;
        }).toList());
        result.put("todaySchedule", getTodaySchedule(teacher.getId()));

        return result;
    }

    private Map<String, Object> toSubjectDto(Subject subject) {
        ClassEntity klass = subject.getClassEntity();
        UUID classId = klass.getId();
        List<Student> classStudents = studentRepository.findByClassEntityId(classId);

        int studentCount = classStudents.size();
        int boysCount = (int) classStudents.stream().filter(s -> inferGender(s.getGender()).equals("boys")).count();
        int girlsCount = (int) classStudents.stream().filter(s -> inferGender(s.getGender()).equals("girls")).count();

        double attendancePercent = computeAttendancePercent(classId, subject.getId());
        int pendingAttendance = computePendingAttendance(classId, subject.getId(), studentCount);
        double averageMarks = computeAverageMarks(classId, subject.getId());
        int pendingMarks = computePendingMarks(classId, subject.getId(), studentCount);
        Map<String, Object> upcomingExam = findUpcomingExam(classId, subject.getId());
        Map<String, Object> todaySlot = findTodayTimetableSlot(classId, subject.getId());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("subjectId", subject.getId());
        m.put("subjectName", subject.getName());
        m.put("subjectCode", subject.getCode());
        m.put("subjectType", inferSubjectType(subject.getName()));
        m.put("classId", classId);
        m.put("className", klass.getClassName() + klass.getSection());
        m.put("section", klass.getSection());
        m.put("studentCount", studentCount);
        m.put("boysCount", boysCount);
        m.put("girlsCount", girlsCount);
        m.put("attendancePercent", attendancePercent);
        m.put("pendingAttendance", pendingAttendance);
        m.put("averageMarks", averageMarks);
        m.put("pendingMarks", pendingMarks);
        m.put("pendingAssignments", 0);
        m.put("pendingMaterials", 0);
        m.put("todayPeriod", todaySlot.getOrDefault("startTime", null));
        m.put("room", todaySlot.getOrDefault("room", "TBD"));
        m.put("upcomingExam", upcomingExam);
        return m;
    }

    private List<Map<String, Object>> getTodaySchedule(UUID teacherId) {
        String todayName = LocalDate.now().getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        return timetableRepository.findBySubjectTeacherId(teacherId).stream()
                .filter(slot -> todayName.equals(slot.getDayOfWeek()))
                .sorted((a, b) -> a.getPeriodNumber().compareTo(b.getPeriodNumber()))
                .map(slot -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", slot.getId());
                    m.put("subjectName", slot.getSubject().getName());
                    m.put("className", slot.getClassEntity().getClassName() + slot.getClassEntity().getSection());
                    m.put("room", "TBD");
                    m.put("startTime", slot.getStartTime().toString());
                    m.put("status", "");
                    return m;
                })
                .toList();
    }

    private String inferGender(String raw) {
        if (raw == null) return "other";
        String normalized = raw.trim().toLowerCase();
        if (normalized.startsWith("m") || normalized.contains("male")) return "boys";
        if (normalized.startsWith("f") || normalized.contains("female")) return "girls";
        return "other";
    }

    private String inferSubjectType(String name) {
        if (name == null) return "Core";
        String lower = name.toLowerCase();
        if (lower.contains("lab")) return "Lab";
        if (lower.contains("elective")) return "Elective";
        return "Core";
    }

    private double computeAttendancePercent(UUID classId, UUID subjectId) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusMonths(1);
        List<Attendance> records = attendanceRepository.findByStudentClassEntityIdAndSubjectIdAndAttendanceDateBetween(classId, subjectId, start, end);
        long total = records.size();
        long present = records.stream().filter(a -> a.getStatus() == com.edutrack.model.enums.AttendanceStatus.PRESENT || a.getStatus() == com.edutrack.model.enums.AttendanceStatus.LATE).count();
        return total == 0 ? 0.0 : Math.round(present * 10000.0 / total) / 100.0;
    }

    private int computePendingAttendance(UUID classId, UUID subjectId, int studentCount) {
        List<Attendance> todayRecords = attendanceRepository.findByStudentClassEntityIdAndSubjectIdAndAttendanceDate(classId, subjectId, LocalDate.now());
        return Math.max(0, studentCount - todayRecords.size());
    }

    private double computeAverageMarks(UUID classId, UUID subjectId) {
        List<Marks> records = marksRepository.findByStudentClassEntityIdAndSubjectId(classId, subjectId);
        if (records.isEmpty()) return 0.0;
        BigDecimal totalObtained = records.stream()
                .map(Marks::getMarksObtained)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalMax = records.stream()
                .map(m -> BigDecimal.valueOf(m.getExamType().getMaxMarks()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalMax.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return totalObtained.multiply(BigDecimal.valueOf(100)).divide(totalMax, 2, BigDecimal.ROUND_HALF_UP).doubleValue();
    }

    private int computePendingMarks(UUID classId, UUID subjectId, int studentCount) {
        List<ExamType> examTypes = examTypeRepository.findByClassEntityId(classId);
        if (examTypes.isEmpty()) return 0;
        List<Marks> records = marksRepository.findByStudentClassEntityIdAndSubjectId(classId, subjectId);
        int expected = studentCount * examTypes.size();
        return Math.max(0, expected - records.size());
    }

    private Map<String, Object> findUpcomingExam(UUID classId, UUID subjectId) {
        LocalDate now = LocalDate.now();
        return examScheduleRepository.findByClassEntityIdAndSubjectId(classId, subjectId).stream()
                .filter(exam -> exam.getExamDate() != null && exam.getExamDate().isAfter(now))
                .sorted((a, b) -> a.getExamDate().compareTo(b.getExamDate()))
                .findFirst()
                .map(exam -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("title", exam.getExamType().getName());
                    m.put("date", exam.getExamDate().toString());
                    m.put("time", exam.getStartTime() != null ? exam.getStartTime().toString() : "TBD");
                    return m;
                })
                .orElseGet(() -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("title", "No upcoming exam");
                    m.put("date", null);
                    m.put("time", null);
                    return m;
                });
    }

    private Map<String, Object> findTodayTimetableSlot(UUID classId, UUID subjectId) {
        String todayName = LocalDate.now().getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        return timetableRepository.findByClassEntityIdOrderByDayOfWeekAscPeriodNumberAsc(classId).stream()
                .filter(slot -> todayName.equals(slot.getDayOfWeek()) && slot.getSubject().getId().equals(subjectId))
                .findFirst()
                .map(slot -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("startTime", slot.getStartTime().toString());
                    m.put("room", "TBD");
                    return m;
                })
                .orElseGet(() -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("startTime", null);
                    m.put("room", "TBD");
                    return m;
                });
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStudentsInClass(UUID classId) {
        return studentRepository.findByClassEntityId(classId).stream()
                .map(this::toStudentRosterDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStudentDetail(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Map<String, Object> dto = toDetailDto(student);
        dto.put("className", student.getClassEntity() != null ? student.getClassEntity().getClassName() + student.getClassEntity().getSection() : null);
        dto.put("attendancePercent", computeStudentAttendancePercent(student.getId()));
        dto.put("averageMarks", computeStudentAverageMarks(student.getId()));
        dto.put("status", deriveStudentStatus(dto.get("attendancePercent"), dto.get("averageMarks")));
        dto.put("lastPresent", findStudentLastPresentDate(student.getId()));
        return dto;
    }

    private Map<String, Object> toStudentRosterDto(Student student) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", student.getId());
        dto.put("name", student.getUser().getName());
        dto.put("rollNumber", student.getRollNumber());
        dto.put("classId", student.getClassEntity() != null ? student.getClassEntity().getId() : null);
        dto.put("className", student.getClassEntity() != null ? student.getClassEntity().getClassName() + student.getClassEntity().getSection() : null);
        dto.put("guardianName", student.getParentName());
        dto.put("attendancePercent", computeStudentAttendancePercent(student.getId()));
        dto.put("averageMarks", computeStudentAverageMarks(student.getId()));
        dto.put("status", deriveStudentStatus(dto.get("attendancePercent"), dto.get("averageMarks")));
        dto.put("lastPresent", findStudentLastPresentDate(student.getId()));
        return dto;
    }

    private Map<String, Object> toDetailDto(Student student) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", student.getId());
        dto.put("name", student.getUser() != null ? student.getUser().getName() : null);
        dto.put("rollNumber", student.getRollNumber());
        dto.put("parentName", student.getParentName());
        dto.put("email", student.getUser() != null ? student.getUser().getEmail() : null);
        dto.put("phone", student.getUser() != null ? student.getUser().getPhone() : null);
        dto.put("classId", student.getClassEntity() != null ? student.getClassEntity().getId() : null);
        dto.put("className", student.getClassEntity() != null ? student.getClassEntity().getClassName() + student.getClassEntity().getSection() : null);
        return dto;
    }

    private double computeStudentAttendancePercent(UUID studentId) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(30);
        List<Attendance> records = attendanceRepository.findByStudentIdAndAttendanceDateBetween(studentId, start, end);
        long total = records.size();
        if (total == 0) return 0.0;
        long present = records.stream()
                .filter(a -> a.getStatus() == com.edutrack.model.enums.AttendanceStatus.PRESENT
                        || a.getStatus() == com.edutrack.model.enums.AttendanceStatus.LATE)
                .count();
        return Math.round(present * 10000.0 / total) / 100.0;
    }

    private double computeStudentAverageMarks(UUID studentId) {
        List<Marks> records = marksRepository.findByStudentId(studentId);
        if (records.isEmpty()) return 0.0;
        BigDecimal totalObtained = records.stream()
                .map(Marks::getMarksObtained)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalMax = records.stream()
                .map(m -> BigDecimal.valueOf(m.getExamType().getMaxMarks()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalMax.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return totalObtained.multiply(BigDecimal.valueOf(100)).divide(totalMax, 2, BigDecimal.ROUND_HALF_UP).doubleValue();
    }

    private String deriveStudentStatus(Object attendanceObj, Object averageMarksObj) {
        double attendance = attendanceObj instanceof Number ? ((Number) attendanceObj).doubleValue() : 0.0;
        double averageMarks = averageMarksObj instanceof Number ? ((Number) averageMarksObj).doubleValue() : 0.0;
        if (attendance >= 95 && averageMarks >= 90) return "Excellent";
        if (attendance >= 85 && averageMarks >= 75) return "Good";
        if (attendance >= 70 && averageMarks >= 60) return "Average";
        return "Needs Attention";
    }

    private LocalDate findStudentLastPresentDate(UUID studentId) {
        LocalDate start = LocalDate.now().minusMonths(3);
        LocalDate end = LocalDate.now();
        return attendanceRepository.findByStudentIdAndAttendanceDateBetween(studentId, start, end).stream()
                .filter(a -> a.getStatus() == com.edutrack.model.enums.AttendanceStatus.PRESENT
                        || a.getStatus() == com.edutrack.model.enums.AttendanceStatus.LATE)
                .map(Attendance::getAttendanceDate)
                .max(LocalDate::compareTo)
                .orElse(null);
    }
}
