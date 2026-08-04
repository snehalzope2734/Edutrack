package com.edutrack.service;

import com.edutrack.exception.BadRequestException;
import com.edutrack.model.dto.request.LoginRequest;
import com.edutrack.model.dto.response.LoginResponse;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.UserRepository;
import com.edutrack.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Login uses two layers of "is this account allowed in" checks: Spring
 * Security's own UserDetails.isEnabled() (checked inside authenticationManager
 * .authenticate(), mocked away here) and this service's explicit is_active
 * re-check afterwards. This test covers the second layer directly.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserRepository userRepository;
    @Mock private JwtUtil jwtUtil;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(authenticationManager, userRepository, jwtUtil, passwordEncoder, emailService);
    }

    @Test
    void deactivatedAccountIsRejectedEvenWithCorrectPassword() {
        User deactivated = User.builder()
                .id(UUID.randomUUID()).email("gone@school.local").role("TEACHER").isActive(false).build();
        when(userRepository.findByEmail("gone@school.local")).thenReturn(Optional.of(deactivated));

        LoginRequest request = new LoginRequest("gone@school.local", "correct-password");

        assertThrows(BadRequestException.class, () -> authService.login(request));
    }

    @Test
    void activeAccountReceivesAToken() {
        UUID userId = UUID.randomUUID();
        User active = User.builder().id(userId).email("t@school.local").name("Teacher T").role("TEACHER").isActive(true).build();
        when(userRepository.findByEmail("t@school.local")).thenReturn(Optional.of(active));
        when(jwtUtil.generateToken(userId, "t@school.local", "TEACHER")).thenReturn("fake-jwt");

        LoginResponse response = authService.login(new LoginRequest("t@school.local", "whatever"));

        assertThat(response.token()).isEqualTo("fake-jwt");
        assertThat(response.role()).isEqualTo("TEACHER");
        assertThat(response.userId()).isEqualTo(userId);
    }
}
