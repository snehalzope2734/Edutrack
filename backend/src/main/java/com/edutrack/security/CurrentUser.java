package com.edutrack.security;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/** Small helper to pull the authenticated principal out of the security context. */
public final class CurrentUser {

    private CurrentUser() {}

    public static CustomUserDetails get() {
        return (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public static UUID id() {
        return get().getId();
    }

    public static String role() {
        return get().getRole();
    }

    public static boolean isAdmin() {
        return "ADMIN".equals(role());
    }

    public static boolean isTeacher() {
        return "TEACHER".equals(role());
    }

    public static boolean isStudent() {
        return "STUDENT".equals(role());
    }
}
