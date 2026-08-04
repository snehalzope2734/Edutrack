package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.model.dto.response.MeResponse;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public MeResponse getMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return new MeResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getProfilePhotoUrl());
    }

    @Transactional
    public MeResponse updateProfilePhoto(UUID userId, String cloudinaryUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setProfilePhotoUrl(cloudinaryUrl);
        user = userRepository.save(user);
        return new MeResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getProfilePhotoUrl());
    }
}
