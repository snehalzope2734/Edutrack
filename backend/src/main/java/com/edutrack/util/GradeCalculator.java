package com.edutrack.util;

import java.math.BigDecimal;

public final class GradeCalculator {

    private GradeCalculator() {}

    public static String computeGrade(BigDecimal obtained, Integer maxMarks) {
        if (obtained == null || maxMarks == null || maxMarks == 0) return null;
        double pct = obtained.doubleValue() * 100.0 / maxMarks;
        if (pct >= 90) return "A+";
        if (pct >= 80) return "A";
        if (pct >= 70) return "B+";
        if (pct >= 60) return "B";
        if (pct >= 50) return "C";
        if (pct >= 40) return "D";
        return "F";
    }
}
