package com.edutrack.controller;

import com.edutrack.model.dto.request.ForgotPasswordRequest;
import com.edutrack.model.dto.request.LoginRequest;
import com.edutrack.model.dto.request.ResetPasswordRequest;
import com.edutrack.model.dto.response.LoginResponse;
import com.edutrack.model.dto.response.MeResponse;
import com.edutrack.security.CurrentUser;
import com.edutrack.service.AuthService;
import com.edutrack.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        // Stateless JWT: nothing to invalidate server-side without a blacklist store.
        // Client is expected to discard the token; endpoint kept for API parity.
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset code has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        return ResponseEntity.ok(userService.getMe(CurrentUser.id()));
    }
}
