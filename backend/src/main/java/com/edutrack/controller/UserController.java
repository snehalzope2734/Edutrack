package com.edutrack.controller;

import com.edutrack.model.dto.request.ProfilePhotoRequest;
import com.edutrack.model.dto.response.MeResponse;
import com.edutrack.security.CurrentUser;
import com.edutrack.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        return ResponseEntity.ok(userService.getMe(CurrentUser.id()));
    }

    @PutMapping("/me/profile-photo")
    public ResponseEntity<MeResponse> updatePhoto(@RequestBody ProfilePhotoRequest request) {
        return ResponseEntity.ok(userService.updateProfilePhoto(CurrentUser.id(), request.cloudinaryUrl()));
    }
}
