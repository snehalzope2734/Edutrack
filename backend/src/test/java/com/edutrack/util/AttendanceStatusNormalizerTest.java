package com.edutrack.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AttendanceStatusNormalizerTest {

    @Test
    void acceptsShortAndLongForms() {
        assertEquals("P", AttendanceStatusNormalizer.normalizeStatus("P"));
        assertEquals("P", AttendanceStatusNormalizer.normalizeStatus("present"));
        assertEquals("A", AttendanceStatusNormalizer.normalizeStatus("Absent"));
        assertEquals("L", AttendanceStatusNormalizer.normalizeStatus("l"));
    }

    @Test
    void isCaseAndWhitespaceInsensitive() {
        assertEquals("P", AttendanceStatusNormalizer.normalizeStatus("  Present  "));
        assertEquals("A", AttendanceStatusNormalizer.normalizeStatus("ABSENT"));
    }

    @Test
    void rejectsUnknownValues() {
        assertNull(AttendanceStatusNormalizer.normalizeStatus("Excused"));
        assertNull(AttendanceStatusNormalizer.normalizeStatus(""));
        assertNull(AttendanceStatusNormalizer.normalizeStatus(null));
    }

    @Test
    void normalizesRollNumbersForComparison() {
        assertEquals("R001", AttendanceStatusNormalizer.normalizeRoll(" r001 "));
        assertEquals("", AttendanceStatusNormalizer.normalizeRoll(null));
    }
}
