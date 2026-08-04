package com.edutrack.service;

import com.edutrack.exception.BadRequestException;
import com.edutrack.model.document.AttendanceImport;
import com.edutrack.model.entity.*;
import com.edutrack.repository.mongodb.AttendanceImportRepository;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceImportServiceTest {

    @Mock
    private AttendanceImportRepository attendanceImportRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private SubjectRepository subjectRepository;

  

    @Mock
    private TeacherRepository teacherRepository;
    
    private AttendanceImportService service;

    private UUID classId;
    private UUID subjectId;
    private UUID teacherUserId;

    private Student alice;
    private Student bob;
    private Subject subject;

    @BeforeEach
    void setUp() {

    	service = new AttendanceImportService(
    	        attendanceImportRepository,
    	        attendanceRepository,
    	        studentRepository,
    	        subjectRepository,
    	        teacherRepository
    	);
        classId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        teacherUserId = UUID.randomUUID();

        ClassEntity classEntity = ClassEntity.builder()
                .id(classId)
                .className("9")
                .section("A")
                .build();

        User aliceUser = User.builder()
                .id(UUID.randomUUID())
                .name("Alice")
                .build();

        alice = Student.builder()
                .id(UUID.randomUUID())
                .user(aliceUser)
                .rollNumber("R001")
                .classEntity(classEntity)
                .build();

        User bobUser = User.builder()
                .id(UUID.randomUUID())
                .name("Bob")
                .build();

        bob = Student.builder()
                .id(UUID.randomUUID())
                .user(bobUser)
                .rollNumber("R002")
                .classEntity(classEntity)
                .build();

        subject = Subject.builder()
                .id(subjectId)
                .name("Maths")
                .classEntity(classEntity)
                .build();

        /*
         * This stub is required by tests that successfully complete
         * the attendance preview process.
         *
         * Some validation tests, such as an empty file or invalid
         * extension, throw an exception before save() is reached.
         *
         * Therefore this common setup is marked lenient so Mockito
         * does not report it as unnecessary in those tests.
         */
        lenient()
                .when(attendanceImportRepository.save(any(AttendanceImport.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private MockMultipartFile buildWorkbook(String[][] rows)
            throws IOException {

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {

            Sheet sheet = workbook.createSheet("Attendance");

            Row header = sheet.createRow(0);

            header.createCell(0)
                    .setCellValue("Roll Number");

            header.createCell(1)
                    .setCellValue("Status");

            for (int i = 0; i < rows.length; i++) {

                Row row = sheet.createRow(i + 1);

                row.createCell(0)
                        .setCellValue(rows[i][0]);

                row.createCell(1)
                        .setCellValue(rows[i][1]);
            }

            ByteArrayOutputStream output =
                    new ByteArrayOutputStream();

            workbook.write(output);

            return new MockMultipartFile(
                    "file",
                    "attendance.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    output.toByteArray()
            );
        }
    }

    @Test
    void validRowsAreNormalizedAndMatchedToStudents()
            throws IOException {

        when(subjectRepository.findById(subjectId))
                .thenReturn(Optional.of(subject));

        when(studentRepository.findByClassEntityId(classId))
                .thenReturn(List.of(alice, bob));

        when(attendanceRepository.findByStudentIdAndSubjectIdAndAttendanceDate(
                        any(),
                        any(),
                        any()
                ))
                .thenReturn(Optional.empty());

        MockMultipartFile file =
                buildWorkbook(
                        new String[][]{
                                {"R001", "Present"},
                                {"R002", "A"}
                        }
                );

        AttendanceImport result =
                service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                );

        assertThat(result.getTotalRows())
                .isEqualTo(2);

        assertThat(result.getValidRows())
                .isEqualTo(2);

        assertThat(result.getErrorRows())
                .isEqualTo(0);

        assertThat(
                result.getRows()
                        .get(0)
                        .getNormalizedStatus()
        ).isEqualTo("P");

        assertThat(
                result.getRows()
                        .get(1)
                        .getNormalizedStatus()
        ).isEqualTo("A");

        assertThat(result.getStatus())
                .isEqualTo("PENDING_CONFIRMATION");
    }

    @Test
    void unknownRollNumberProducesRowError()
            throws IOException {

        when(subjectRepository.findById(subjectId))
                .thenReturn(Optional.of(subject));

        when(studentRepository.findByClassEntityId(classId))
                .thenReturn(List.of(alice, bob));

        MockMultipartFile file =
                buildWorkbook(
                        new String[][]{
                                {"R999", "Present"}
                        }
                );

        AttendanceImport result =
                service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                );

        assertThat(result.getErrorRows())
                .isEqualTo(1);

        assertThat(
                result.getRows()
                        .get(0)
                        .getError()
        ).contains("not found in this class");
    }

    @Test
    void invalidStatusProducesRowError()
            throws IOException {

        when(subjectRepository.findById(subjectId))
                .thenReturn(Optional.of(subject));

        when(studentRepository.findByClassEntityId(classId))
                .thenReturn(List.of(alice, bob));

        MockMultipartFile file =
                buildWorkbook(
                        new String[][]{
                                {"R001", "Excused"}
                        }
                );

        AttendanceImport result =
                service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                );

        assertThat(result.getErrorRows())
                .isEqualTo(1);

        assertThat(
                result.getRows()
                        .get(0)
                        .getError()
        ).contains("Invalid status");
    }

    @Test
    void duplicateRollNumberWithinFileIsRejected()
            throws IOException {

        when(subjectRepository.findById(subjectId))
                .thenReturn(Optional.of(subject));

        when(studentRepository.findByClassEntityId(classId))
                .thenReturn(List.of(alice, bob));

        when(attendanceRepository.findByStudentIdAndSubjectIdAndAttendanceDate(
                        any(),
                        any(),
                        any()
                ))
                .thenReturn(Optional.empty());

        MockMultipartFile file =
                buildWorkbook(
                        new String[][]{
                                {"R001", "P"},
                                {"R001", "A"}
                        }
                );

        AttendanceImport result =
                service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                );

        assertThat(result.getValidRows())
                .isEqualTo(1);

        assertThat(result.getErrorRows())
                .isEqualTo(1);

        assertThat(
                result.getRows()
                        .get(1)
                        .getError()
        ).contains("Duplicate roll number");
    }

    @Test
    void existingAttendanceRecordIsFlaggedAsDuplicateForOverwrite()
            throws IOException {

        when(subjectRepository.findById(subjectId))
                .thenReturn(Optional.of(subject));

        when(studentRepository.findByClassEntityId(classId))
                .thenReturn(List.of(alice, bob));

        when(attendanceRepository.findByStudentIdAndSubjectIdAndAttendanceDate(
                        any(),
                        any(),
                        any()
                ))
                .thenReturn(
                        Optional.of(
                                Attendance.builder()
                                        .id(UUID.randomUUID())
                                        .build()
                        )
                );

        MockMultipartFile file =
                buildWorkbook(
                        new String[][]{
                                {"R001", "P"}
                        }
                );

        AttendanceImport result =
                service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                );

        assertThat(result.getDuplicateRows())
                .isEqualTo(1);

        assertThat(
                result.getRows()
                        .get(0)
                        .isDuplicate()
        ).isTrue();

        assertThat(
                result.getRows()
                        .get(0)
                        .getError()
        ).isNull();
    }

    @Test
    void rejectsNonExcelFileExtension() {

        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "attendance.csv",
                        "text/csv",
                        "not excel".getBytes()
                );

        assertThrows(
                BadRequestException.class,
                () -> service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                )
        );
    }

    @Test
    void rejectsEmptyFile() {

        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "attendance.xlsx",
                        "application/octet-stream",
                        new byte[0]
                );

        assertThrows(
                BadRequestException.class,
                () -> service.preview(
                        file,
                        classId,
                        subjectId,
                        LocalDate.now(),
                        teacherUserId
                )
        );
    }
}