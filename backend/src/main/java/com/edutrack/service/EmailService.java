package com.edutrack.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    public void sendCredentialsEmail(String toEmail, String name, String rawPassword, String role) {
        String subject = "Your EduTrack " + role + " account";
        String body = "Hello " + name + ",\n\n" +
                "An EduTrack account has been created for you.\n" +
                "Login email: " + toEmail + "\n" +
                "Temporary password: " + rawPassword + "\n\n" +
                "Please log in and change your password as soon as possible.\n\n" +
                "— EduTrack";
        send(toEmail, subject, body);
    }

    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "EduTrack password reset code";
        String body = "Your one-time password reset code is: " + otp + "\n\n" +
                "This code expires in 10 minutes. If you did not request this, you can ignore this email.";
        send(toEmail, subject, body);
    }

    private void send(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message);
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body);
            mailSender.send(message);
        } catch (MessagingException | RuntimeException e) {
            // Do not let email delivery failures break the calling operation (e.g. student creation).
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
