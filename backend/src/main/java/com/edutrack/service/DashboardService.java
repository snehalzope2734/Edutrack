package com.edutrack.service;

import com.edutrack.dto.dashboard.ClassStatsDto;
import com.edutrack.dto.dashboard.DashboardResponse;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.repository.supabase.AttendanceRepository;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.MarksRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.SubjectRepository;
import com.edutrack.repository.supabase.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRepository classRepository;
    private final AttendanceRepository attendanceRepository;
    private final MarksRepository marksRepository;

    public DashboardResponse getDashboard() {

        List<ClassStatsDto> classStats = new ArrayList<>();

        for (ClassEntity cls : classRepository.findAll()) {

            long studentCount =
                    studentRepository.countByClassEntityId(cls.getId());

            long totalAttendance =
                    attendanceRepository.countAttendanceByClass(cls.getId());

            long presentAttendance =
                    attendanceRepository.countPresentAttendanceByClass(cls.getId());

            double attendance =
                    totalAttendance == 0
                            ? 0
                            : (presentAttendance * 100.0) / totalAttendance;

            Double averageMarks =
                    marksRepository.findAverageMarksByClass(cls.getId());

            classStats.add(

                    ClassStatsDto.builder()

                            .className(
                                    cls.getClassName() + "-" + cls.getSection()
                            )

                            .studentCount(studentCount)

                            .attendance(
                                    Math.round(attendance * 100.0) / 100.0
                            )

                            .averageMarks(
                                    averageMarks == null
                                            ? 0
                                            : Math.round(averageMarks * 100.0) / 100.0
                            )

                            .build()

            );
        }

        return DashboardResponse.builder()

                .teachers(
                        teacherRepository.count()
                )

                .students(
                        studentRepository.count()
                )

                .classes(
                        classRepository.count()
                )

                .subjects(
                        subjectRepository.count()
                )

                .classPerformance(
                        classStats
                )

                .build();
    }

}