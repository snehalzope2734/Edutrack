package com.edutrack.config;

import com.edutrack.model.entity.ClassEntity;
import com.edutrack.repository.supabase.ClassRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultClassSeeder implements ApplicationRunner {

    private final ClassRepository classRepository;

    @Override
    public void run(ApplicationArguments args) {
        run();
    }

    void run() {
        if (!classRepository.findAll().isEmpty()) {
            return;
        }

        List<ClassEntity> defaults = new ArrayList<>();
        String[] classNames = {
            "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
        };

        for (String className : classNames) {
            defaults.add(ClassEntity.builder()
                    .className(className)
                    .section("A")
                    .academicYear("2025-2026")
                    .build());
        }

        classRepository.saveAll(defaults);
        log.info("Seeded default school classes for Nursery to 10 with section A.");
    }
}
