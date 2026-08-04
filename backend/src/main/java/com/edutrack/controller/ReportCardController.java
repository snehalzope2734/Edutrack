package com.edutrack.controller;

import com.edutrack.model.dto.request.ReportCardRequest;
import com.edutrack.security.CurrentUser;
import com.edutrack.security.OwnershipGuard;
import com.edutrack.service.ReportCardService;
import com.edutrack.service.ReportCardPdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/report-cards")
@RequiredArgsConstructor
public class ReportCardController {

    private final ReportCardService reportCardService;
    private final ReportCardPdfService reportCardPdfService;
    private final OwnershipGuard ownershipGuard;

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable UUID studentId) {
        ownershipGuard.assertCanViewStudent(studentId);
        return ResponseEntity.ok(reportCardService.listForStudent(studentId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody ReportCardRequest request) {
        if (CurrentUser.isTeacher()) {
            ownershipGuard.assertCanViewStudent(request.studentId());
        }
        return ResponseEntity.ok(reportCardService.create(request, CurrentUser.id()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        // Deletion ownership (uploader vs admin) is enforced inside ReportCardService.
        reportCardService.delete(id, CurrentUser.id(), CurrentUser.isAdmin());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/student/{studentId}/exam/{examTypeId}/pdf")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable UUID studentId,
            @PathVariable UUID examTypeId) {

        ownershipGuard.assertCanViewStudent(studentId);

        byte[] pdf = reportCardPdfService.generateReportCard(studentId, examTypeId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=report-card.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}