package com.edutrack.model.dto.response;

import java.util.List;

public record AttendanceSummaryResponse(List<SubjectWiseAttendance> subjectWise, double overall) {}
