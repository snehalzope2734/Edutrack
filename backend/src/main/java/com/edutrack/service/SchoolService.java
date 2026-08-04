package com.edutrack.service;

import com.edutrack.model.dto.request.SchoolInfoRequest;
import com.edutrack.model.entity.SchoolInfo;
import com.edutrack.repository.supabase.SchoolInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolInfoRepository schoolInfoRepository;

    @Transactional(readOnly = true)
    public SchoolInfo get() {
        return schoolInfoRepository.findFirstByOrderByUpdatedAtDesc()
                .orElseGet(() -> SchoolInfo.builder().schoolName("My School").build());
    }

    @Transactional
    public SchoolInfo update(SchoolInfoRequest req) {
        SchoolInfo info = schoolInfoRepository.findFirstByOrderByUpdatedAtDesc()
                .orElseGet(SchoolInfo::new);

        info.setSchoolName(req.schoolName());
        info.setTagline(req.tagline());
        info.setDescription(req.description());
        info.setAddress(req.address());
        info.setCity(req.city());
        info.setState(req.state());
        info.setPincode(req.pincode());
        info.setPhone(req.phone());
        info.setEmail(req.email());
        info.setWebsite(req.website());
        if (req.logoUrl() != null) info.setLogoUrl(req.logoUrl());
        if (req.bannerUrl() != null) info.setBannerUrl(req.bannerUrl());
        info.setPrincipalName(req.principalName());
        info.setEstablishedYear(req.establishedYear());

        return schoolInfoRepository.save(info);
    }
}
