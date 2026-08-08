package com.edutrack.config;

import com.edutrack.security.JwtFilter;
import com.edutrack.security.SecurityHeadersFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)

            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            .authorizeHttpRequests(auth -> auth

                // ================================
                // PUBLIC BACKEND ENDPOINTS
                // ================================

                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll()

                // Swagger
                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()

                // ================================
                // REACT SPA FILES
                // ================================

                .requestMatchers(
                    "/",
                    "/index.html",
                    "/assets/**",
                    "/static/**",
                    "/uploads/**",
                    "/favicon.ico"
                ).permitAll()

                // ================================
                // REACT ROUTER BROWSER ROUTES
                // ================================
                //
                // These are NOT backend API endpoints.
                // They only forward to index.html.
                //
                // Authentication is handled by React's
                // ProtectedRoute after the application loads.
                //
                // This also allows browser refreshes on routes
                // such as /admin/school.
                // ================================

                .requestMatchers(
                    "/login",
                    "/forgot-password",
                    "/admin",
                    "/admin/**",
                    "/teacher",
                    "/teacher/**",
                    "/student",
                    "/student/**"
                ).permitAll()

                // ================================
                // ADMIN BACKEND APIs
                // ================================

                .requestMatchers("/api/admin/**")
                .hasRole("ADMIN")

                // ================================
                // ALL OTHER BACKEND APIs
                // ================================

                .anyRequest()
                .authenticated()
            )

            .addFilterBefore(
                securityHeadersFilter,
                UsernamePasswordAuthenticationFilter.class
            )
            .addFilterBefore(
                jwtFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}