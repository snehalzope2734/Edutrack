package com.edutrack.config;

import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * There is exactly one ADMIN account per school, and it is never created
 * through the UI (there is no public sign-up — see the no-PUBLIC-role
 * requirement). Instead, on first boot, if no ADMIN exists yet, one is
 * created from environment variables so the school has a way in.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed-email:admin@school.local}")
    private String adminEmail;

    @Value("${app.admin.seed-password:ChangeMe123!}")
    private String adminPassword;

    @Value("${app.admin.seed-name:School Admin}")
    private String adminName;

    @Override
    public void run(ApplicationArguments args) {
        boolean adminExists = userRepository.findAll().stream().anyMatch(u -> "ADMIN".equals(u.getRole()));
        if (adminExists) {
            return;
        }

        User admin = User.builder()
                .name(adminName)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role("ADMIN")
                .isActive(true)
                .build();
        userRepository.save(admin);

        log.warn("No ADMIN account existed — created one for '{}'. " +
                "Log in and change this password immediately if it used the default value.", adminEmail);
    }
}
