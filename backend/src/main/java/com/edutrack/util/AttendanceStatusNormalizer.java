package com.edutrack.util;

import java.util.Set;

public final class AttendanceStatusNormalizer {

    private static final Set<String> PRESENT_ALIASES = Set.of("P", "PRESENT");
    private static final Set<String> ABSENT_ALIASES = Set.of("A", "ABSENT");
    private static final Set<String> LATE_ALIASES = Set.of("L", "LATE");

    private AttendanceStatusNormalizer() {}

    /** Returns "P", "A", or "L", or null if the raw text doesn't match a known status. */
    public static String normalizeStatus(String raw) {
        if (raw == null) return null;
        String v = raw.trim().toUpperCase();
        if (PRESENT_ALIASES.contains(v)) return "P";
        if (ABSENT_ALIASES.contains(v)) return "A";
        if (LATE_ALIASES.contains(v)) return "L";
        return null;
    }

    public static String normalizeRoll(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase();
    }
}
