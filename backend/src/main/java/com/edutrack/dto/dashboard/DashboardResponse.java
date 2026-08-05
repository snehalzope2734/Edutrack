package com.edutrack.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private long teachers;
    private long students;
    private long classes;
    private long subjects;

    private List<ClassStatsDto> classPerformance;
}