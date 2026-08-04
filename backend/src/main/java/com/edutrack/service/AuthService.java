package com.edutrack.service;

import com.edutrack.exception.BadRequestException;
import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.request.LoginRequest;
import com.edutrack.model.dto.request.ResetPasswordRequest;
import com.edutrack.model.dto.response.LoginResponse;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.UserRepository;
import com.edutrack.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // In-memory OTP store: email -> [otp, expiry]. Fine for a single-instance
    // school deployment; swap for Redis if the app is ever horizontally scaled.
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    private record OtpEntry(String otp, Instant expiresAt) {}

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("This account has been deactivated. Contact your school admin.");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
        return new LoginResponse(token, user.getRole(), user.getId(), user.getName());
    }

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with that email"));

        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        otpStore.put(email, new OtpEntry(otp, Instant.now().plus(Duration.ofMinutes(10))));

        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    public void resetPassword(ResetPasswordRequest request) {
        OtpEntry entry = otpStore.get(request.email());
        if (entry == null || entry.expiresAt().isBefore(Instant.now()) || !entry.otp().equals(request.otp())) {
            throw new BadRequestException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        otpStore.remove(request.email());
    }
}
