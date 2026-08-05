package com.edutrack.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {

    private String highestAttendanceClass;

    private String highestMarksClass;

    private long totalStudents;

    private long totalTeachers;
}