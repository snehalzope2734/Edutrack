package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.document.Notification;
import com.edutrack.model.dto.request.NotificationRequest;
import com.edutrack.repository.mongodb.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Page<Notification> listForUser(String userId, String classId, boolean isTeacher, Pageable pageable) {
        String classTag = classId != null ? "CLASS:" + classId : "__none__";
        return isTeacher
                ? notificationRepository.findForTeacher(userId, classTag, pageable)
                : notificationRepository.findForUser(userId, classTag, pageable);
    }

    public Notification create(NotificationRequest req, String senderId, String senderRole) {
        Notification notification = Notification.builder()
                .title(req.title())
                .message(req.message())
                .type(req.type())
                .senderId(senderId)
                .senderRole(senderRole)
                .recipients(req.recipients())
                .isReadBy(List.of())
                .classId(req.classId())
                .createdAt(Instant.now())
                .build();
        return notificationRepository.save(notification);
    }

    public Notification markRead(String id, String userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (notification.getIsReadBy() == null) {
            notification.setIsReadBy(new java.util.ArrayList<>());
        }
        if (!notification.getIsReadBy().contains(userId)) {
            notification.getIsReadBy().add(userId);
        }
        return notificationRepository.save(notification);
    }

    public void delete(String id, String callerId, boolean isAdmin) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!isAdmin && !notification.getSenderId().equals(callerId)) {
            throw new UnauthorizedException("You may only delete notifications you sent");
        }
        notificationRepository.deleteById(id);
    }
}
