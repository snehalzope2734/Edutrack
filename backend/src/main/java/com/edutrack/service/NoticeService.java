package com.edutrack.service;

import com.edutrack.exception.ResourceNotFoundException;
import com.edutrack.exception.UnauthorizedException;
import com.edutrack.model.dto.request.NoticeRequest;
import com.edutrack.model.entity.ClassEntity;
import com.edutrack.model.entity.Notice;
import com.edutrack.model.entity.Student;
import com.edutrack.model.entity.User;
import com.edutrack.repository.supabase.ClassRepository;
import com.edutrack.repository.supabase.NoticeRepository;
import com.edutrack.repository.supabase.StudentRepository;
import com.edutrack.repository.supabase.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listForCaller(String role, UUID classId, UUID studentId, Pageable pageable) {
        if ("ADMIN".equals(role)) {
            return noticeRepository.findByIsArchivedFalseOrderByPostedAtDesc(pageable).map(this::toDto);
        }
        return noticeRepository.findRelevant(classId, studentId, pageable).map(this::toDto);
    }

    @Transactional
    public Map<String, Object> create(NoticeRequest req, UUID posterUserId, String posterRole) {
        if ("TEACHER".equals(posterRole) && "ALL".equals(req.audience())) {
            throw new UnauthorizedException("Teachers may only post notices to their own class");
        }
        if ("TEACHER".equals(posterRole) && !"CLASS".equals(req.audience())) {
            throw new UnauthorizedException("Teachers may only post CLASS-audience notices");
        }
        // NOTE: class ownership (does this teacher actually teach this class?) is
        // verified by OwnershipGuard in NoticeController before this method runs.

        User poster = userRepository.findById(posterUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Notice notice = Notice.builder()
                .title(req.title())
                .content(req.content())
                .audience(req.audience())
                .postedBy(poster)
                .build();

        if (req.classId() != null) {
            ClassEntity klass = classRepository.findById(req.classId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
            notice.setClassEntity(klass);
        }
        if (req.studentId() != null) {
            Student student = studentRepository.findById(req.studentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
            notice.setStudent(student);
        }

        notice = noticeRepository.save(notice);
        return toDto(notice);
    }

    @Transactional
    public Map<String, Object> update(UUID id, NoticeRequest req, UUID callerUserId, boolean isAdmin) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notice not found"));

        if (!isAdmin && !notice.getPostedBy().getId().equals(callerUserId)) {
            throw new UnauthorizedException("You may only edit your own notices");
        }

        if (req.title() != null) notice.setTitle(req.title());
        if (req.content() != null) notice.setContent(req.content());
        notice = noticeRepository.save(notice);
        return toDto(notice);
    }

    @Transactional
    public void delete(UUID id, UUID callerUserId, boolean isAdmin) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notice not found"));
        if (!isAdmin && !notice.getPostedBy().getId().equals(callerUserId)) {
            throw new UnauthorizedException("You may only delete your own notices");
        }
        notice.setIsArchived(true);
        noticeRepository.save(notice);
    }

    private Map<String, Object> toDto(Notice n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("title", n.getTitle());
        m.put("content", n.getContent());
        m.put("audience", n.getAudience());
        m.put("classId", n.getClassEntity() != null ? n.getClassEntity().getId() : null);
        m.put("studentId", n.getStudent() != null ? n.getStudent().getId() : null);
        m.put("postedByName", n.getPostedBy().getName());
        m.put("postedAt", n.getPostedAt());
        return m;
    }
}
