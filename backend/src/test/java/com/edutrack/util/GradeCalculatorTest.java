package com.edutrack.util;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class GradeCalculatorTest {

    @Test
    void topOfRangeIsAPlus() {
        assertEquals("A+", GradeCalculator.computeGrade(new BigDecimal("90"), 100));
        assertEquals("A+", GradeCalculator.computeGrade(new BigDecimal("95"), 100));
    }

    @Test
    void boundariesRoundCorrectly() {
        assertEquals("A", GradeCalculator.computeGrade(new BigDecimal("89"), 100));
        assertEquals("B+", GradeCalculator.computeGrade(new BigDecimal("70"), 100));
        assertEquals("B", GradeCalculator.computeGrade(new BigDecimal("60"), 100));
        assertEquals("C", GradeCalculator.computeGrade(new BigDecimal("50"), 100));
        assertEquals("D", GradeCalculator.computeGrade(new BigDecimal("40"), 100));
        assertEquals("F", GradeCalculator.computeGrade(new BigDecimal("39"), 100));
    }

    @Test
    void scalesWithDifferentMaxMarks() {
        // 45/50 = 90% -> A+
        assertEquals("A+", GradeCalculator.computeGrade(new BigDecimal("45"), 50));
    }

    @Test
    void nullInputsReturnNull() {
        assertNull(GradeCalculator.computeGrade(null, 100));
        assertNull(GradeCalculator.computeGrade(new BigDecimal("10"), null));
        assertNull(GradeCalculator.computeGrade(new BigDecimal("10"), 0));
    }
}
