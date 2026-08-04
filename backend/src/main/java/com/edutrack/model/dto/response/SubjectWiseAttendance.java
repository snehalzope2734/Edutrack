package com.edutrack.model.dto.response;

public record SubjectWiseAttendance(String subjectName, long present, long absent, long late, double percentage) {}
